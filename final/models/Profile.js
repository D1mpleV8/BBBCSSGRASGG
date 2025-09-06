const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    balance: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    dailyLastUsed: { type: Date, default: null },
    lastXpGain: { type: Date, default: null },
    lastRobberyAttempt: { type: Date, default: null },
    cars: { type: [String], default: [] },
    favoriteCar: { type: String, default: null },
    clan: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan', default: null },

    pendingInvites: [{
        clanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan' },
        clanName: String,
    }],

    reputation: { type: Number, default: 100 },

    loan: {
        principal: { type: Number, default: 0 },
        interestRate: { type: Number, default: 0 },
        dueDate: { type: Date, default: null }
    },

    jail: {
        isInJail: { type: Boolean, default: false },
        releaseDate: { type: Date, default: null }
    },

    portfolio: {
        type: [{
            stockId: String,
            shares: Number,
            purchasePrice: Number
        }],
        default: []
    },
    job: { type: String, default: 'İşsiz' }, // Kullanıcının mesleği
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;