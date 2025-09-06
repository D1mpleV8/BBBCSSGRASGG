require('dotenv').config();
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("Hata: .env dosyasında GEMINI_API_KEY bulunamadı.");
    process.exit(1);
}

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models',
    method: 'GET',
    headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
    }
};

console.log('Kullanılabilir modeller listeleniyor...');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        if (res.statusCode >= 400) {
            console.error('API Hatası:', res.statusCode);
            console.error('Gelen Veri:', data);
            return;
        }
        try {
            const parsedData = JSON.parse(data);
            if (parsedData.models) {
                console.log('--- Kullanılabilir Modeller ---');
                const runnableModels = parsedData.models.filter(model => 
                    model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')
                );

                if (runnableModels.length > 0) {
                     runnableModels.forEach(model => {
                        console.log(`Model Adı: ${model.name}`);
                        console.log(`  Açıklama: ${model.description}`);
                        console.log('---------------------------------');
                    });
                } else {
                    console.log('generateContent metodunu destekleyen hiçbir model bulunamadı.');
                }
            } else {
                console.log('API yanıtında model listesi bulunamadı. Gelen yanıt:');
                console.log(data);
            }
        } catch (e) {
            console.error('Yanıt ayrıştırılırken hata oluştu:', e);
            console.log('Ham Veri:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('İstek Hatası:', e.message);
});

req.end();