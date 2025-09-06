const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    tag: { type: String, required: true, unique: true, maxlength: 5 },
    ownerId: { type: String, required: true, unique: true },
    members: { type: [String], required: true },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Clan = mongoose.model('Clan', clanSchema);

module.exports = Clan;