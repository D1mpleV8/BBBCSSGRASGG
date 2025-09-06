const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

/**
 * Sends a formatted log message to the server's designated mod-log channel.
 * @param {import('discord.js').Client} client The Discord client instance.
 * @param {import('discord.js').Guild} guild The guild where the action occurred.
 * @param {string} title The title of the log entry (e.g., 'User Banned').
 * @param {Array<{name: string, value: string, inline?: boolean}>} fields An array of fields to add to the embed.
 * @param {import('discord.js').ColorResolvable} color The color of the embed.
 */
async function logAction(client, guild, title, fields, color = '#E74C3C') {
    if (!guild) return;

    try {
        const settings = await GuildSettings.findOne({ guildId: guild.id });
        if (!settings || !settings.modLogChannelId) {
            // console.log(`[LOG] Guild ${guild.name} için mod-log kanalı ayarlanmamış.`);
            return;
        }

        const logChannel = await client.channels.fetch(settings.modLogChannelId).catch(() => null);
        if (!logChannel) {
            // console.log(`[LOG] Guild ${guild.name} için mod-log kanalı bulunamadı veya erişilemedi.`);
            return;
        }

        const logEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .addFields(fields)
            .setTimestamp()
            .setFooter({ text: `Guild ID: ${guild.id}` });

        await logChannel.send({ embeds: [logEmbed] });

    } catch (error) {
        console.error(`'${guild.name}' sunucusuna log gönderilirken hata oluştu:`, error);
    }
}

module.exports = { logAction };
