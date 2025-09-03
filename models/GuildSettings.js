const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
    },
    modLogChannelId: {
        type: String,
        required: false,
        default: null,
    },
    // Gelecekteki ayarlar buraya eklenebilir
    // welcomeChannelId: String,
    // autoRoleId: String,
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
