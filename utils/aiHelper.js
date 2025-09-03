const { GoogleGenerativeAI } = require('@google/generative-ai');
const ChatHistory = require('../models/ChatHistory');
require('dotenv').config();

const { GEMINI_API_KEY } = process.env;

let genAI;
let generativeModel; // Tek bir model hem chat hem resim için kullanılacak
let isAiAvailable = false;

if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // gemini-1.5-flash-latest hem metin hem de resim üretebilir.
        generativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        isAiAvailable = true;
        console.log('[BİLGİ] ✅ Google Gemini AI modeli (gemini-1.5-flash-latest) başarıyla yüklendi.');
    } catch (error) {
        console.error('[HATA] Google Gemini AI modeli yüklenemedi:', error.message);
    }
} else {
    console.log('[UYARI] ❌ GEMINI_API_KEY bulunamadığı için yapay zekâ özellikleri devre dışı.');
}

const getAiChatResponse = async (channelId, userId, prompt) => {
    if (!isAiAvailable) {
        return { success: false, message: "Yapay zekâ özelliği şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." };
    }

    try {
        // Geçmişi veritabanından bul veya oluştur
        let chatSession = await ChatHistory.findOne({ channelId, userId });

        if (!chatSession) {
            const initialHistory = [
                { role: "user", parts: [{ text: "Senin adın Genesis. Yardımsever, zeki ve biraz esprili bir Discord botusun. Cevaplarını kısa ve öz tut." }] },
                { role: "model", parts: [{ text: "Anladım! Ben Genesis. Nasıl yardımcı olabilirim?" }] },
            ];
            chatSession = await ChatHistory.create({
                channelId,
                userId,
                history: initialHistory
            });
        }

        const chat = generativeModel.startChat({
            history: chatSession.history
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const responseText = response.text();

        // Geçmişi güncelle
        chatSession.history.push({ role: "user", parts: [{ text: prompt }] });
        chatSession.history.push({ role: "model", parts: [{ text: responseText }] });

        // Performans için geçmişi belirli bir uzunlukta tut (örneğin son 20 mesaj)
        const maxHistoryLength = 20;
        if (chatSession.history.length > maxHistoryLength) {
            chatSession.history = chatSession.history.slice(chatSession.history.length - maxHistoryLength);
        }

        await chatSession.save();

        return { success: true, message: responseText };

    } catch (error) {
        console.error('Gemini Chat Hatası:', error);
        // Hata durumunda kullanıcıya daha açıklayıcı bir mesaj gönder
        if (error.message.includes('API key not valid')) {
             return { success: false, message: 'Yapay zeka servisine bağlanırken bir kimlik doğrulama hatası oluştu. Lütfen bot sahibine bildirin.' };
        } else if (error.message.includes('timed out')) {
            return { success: false, message: 'Yapay zeka servisinden yanıt alınamadı (zaman aşımı). Lütfen bir dakika sonra tekrar deneyin.' };
        }
        return { success: false, message: 'Üzgünüm, bir şeyler ters gitti. Sorunu tekrar sorabilir misin?' };
    }
};

const resetChatHistory = async (channelId, userId) => {
    try {
        await ChatHistory.deleteOne({ channelId, userId });
        return { success: true, message: 'Sohbet geçmişiniz bu kanal için sıfırlandı.' };
    } catch (error) {
        console.error('Geçmiş Sıfırlama Hatası:', error);
        return { success: false, message: 'Sohbet geçmişi sıfırlanırken bir hata oluştu.' };
    }
};


const generateImageFromPrompt = async (prompt) => {
    if (!isAiAvailable || !generativeModel) {
        return { success: false, message: "Yapay zekâ veya resim oluşturma modeli şu anda mevcut değil." };
    }

    try {
        const fullPrompt = `Lütfen şu açıklamaya uygun, yüksek kaliteli ve detaylı bir görsel oluştur: ${prompt}`;

        const result = await generativeModel.generateContent(fullPrompt);
        const response = await result.response;

        const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
            return { success: true, image: imageBuffer };
        } else {
            const textResponse = response.text();
            return { success: false, message: `Resim oluşturulamadı. Modelin beklenmedik yanıtı: ${textResponse}` };
        }
    } catch (error) {
        console.error('Gemini Image Generation Hatası:', error);
        // Güvenlik filtreleri gibi yaygın hataları kontrol et
        if (error.message.includes('SAFETY')) {
            return { success: false, message: 'İsteğiniz güvenlik filtrelerimizi ihlal ettiği için resim oluşturulamadı. Lütfen daha farklı bir açıklama deneyin.' };
        }
        return { success: false, message: 'Resim oluşturulurken bilinmeyen bir hata meydana geldi.' };
    }
};

module.exports = {
    isAiAvailable,
    getAiChatResponse,
    resetChatHistory,
    generateImageFromPrompt,
};
