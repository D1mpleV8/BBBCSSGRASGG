const mongoose = require('mongoose');

const jackpotSchema = new mongoose.Schema({
    // Sadece tek bir döküman olacağı için özel bir ID kullanıyoruz.
    jackpotId: { type: String, default: 'global_jackpot', unique: true },
    currentAmount: { type: Number, default: 1000000 } // 1 Milyon ile başlasın
});

const Jackpot = mongoose.model('Jackpot', jackpotSchema);

module.exports = Jackpot;