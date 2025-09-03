const mongoose = require('mongoose');

// Bu fonksiyon, veritabanına asenkron olarak bağlanmayı deneyecek.
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB veritabanına başarıyla bağlanıldı.');
    } catch (error) {
        console.error('❌ MongoDB bağlantı hatası:', error.message);
        // Bağlantı başarısız olursa, programdan çıkış yap ki hatalı çalışmasın.
        process.exit(1);
    }
};

// Bu fonksiyonu projemizin başka yerlerinde kullanabilmek için dışa aktarıyoruz.
module.exports = connectDB;