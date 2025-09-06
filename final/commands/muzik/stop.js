const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    category: 'muzik',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Müziği durdurur, sırayı temizler ve kanaldan ayrılır.'),
    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ embeds: [createErrorEmbed('Bu komutu kullanmak için bir ses kanalında olmalısın!')], ephemeral: true });
        }

        const musicManager = interaction.client.musicManager;
        const queue = musicManager.getQueue(interaction.guild.id);

        if (!queue.isPlaying && !queue.connection) {
             return interaction.reply({ embeds: [createErrorEmbed('Zaten çalan bir müzik veya aktif bir bağlantı yok.')], ephemeral: true });
        }

        musicManager.stop(interaction.guild.id);

        await interaction.reply({ embeds: [createSuccessEmbed('Müzik durduruldu, çalma listesi temizlendi ve kanaldan ayrıldım.', '⏹️ Oturum Kapatıldı')] });
    },
};
