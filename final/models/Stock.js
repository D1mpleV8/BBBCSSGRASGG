const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Örn: 'FORTUNE'
    name: { type: String, required: true }, // Örn: 'Fortune Corp'
    currentPrice: { type: Number, required: true },
    priceHistory: { type: [Number], default: [] } // Fiyat geçmişi (grafik için)
});

const Stock = mongoose.model('Stock', stockSchema);

// Başlangıç hisselerini oluşturan fonksiyon
async function initializeStocks() {
    const initialStocks = [
        { id: 'FORT', name: 'Fortune A.Ş.', currentPrice: 150 },
        { id: 'ELON', name: 'Elon Gıda', currentPrice: 320 },
        { id: 'PIXEL', name: 'Pixel Medya', currentPrice: 85 },
        { id: 'NOVA', name: 'Nova Enerji', currentPrice: 210 }
    ];

    try {
        for (const stockData of initialStocks) {
            // Sadece veritabanında yoksa ekle
            await Stock.findOneAndUpdate(
                { id: stockData.id },
                { $setOnInsert: stockData },
                { upsert: true, new: true }
            );
        }
        console.log('[BİLGİ] Başlangıç hisse senetleri kontrol edildi/oluşturuldu.');
    } catch (error) {
        console.error("Başlangıç hisseleri oluşturulurken hata:", error);
    }
}

module.exports = { Stock, initializeStocks };