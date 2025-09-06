const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Botun ve API\'nin gecikme süresini gösterir.',
    aliases: [],
    async execute(context) {
        const { message, client } = context;

        const sent = await message.reply({ content: 'Pinging...' });
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const pingEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Pong! 🏓')
            .addFields(
                { name: 'Bot Gecikmesi', value: `> **${latency}** ms`, inline: true },
                { name: 'API Gecikmesi', value: `> **${apiLatency}** ms`, inline: true }
            )
            .setTimestamp();

        await sent.edit({ content: '', embeds: [pingEmbed] });
    },
};
