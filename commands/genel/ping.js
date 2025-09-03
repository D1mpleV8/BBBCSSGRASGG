const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun ve API\'nin gecikme süresini gösterir.'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const pingEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Pong! 🏓')
            .addFields(
                { name: 'Bot Gecikmesi', value: `> **${latency}** ms`, inline: true },
                { name: 'API Gecikmesi', value: `> **${apiLatency}** ms`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: '', embeds: [pingEmbed] });
    },
};
