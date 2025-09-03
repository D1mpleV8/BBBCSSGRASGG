const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    category: 'muzik',
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Sıradaki şarkıya geçer.'),
    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ embeds: [createErrorEmbed('Bu komutu kullanmak için bir ses kanalında olmalısın!')], ephemeral: true });
        }

        const musicManager = interaction.client.musicManager;
        const queue = musicManager.getQueueInfo(interaction.guild.id);
        const currentQueue = musicManager.getQueue(interaction.guild.id);

        if (!currentQueue.isPlaying) {
            return interaction.reply({ embeds: [createErrorEmbed('Zaten çalan bir şarkı yok.')], ephemeral: true });
        }

        musicManager.skip(interaction.guild.id);

        const nextSong = queue.length > 0 ? queue[0].title : 'yok, sıra boşaldı';
        await interaction.reply({ embeds: [createSuccessEmbed(`Şarkı atlandı! Sırada: **${nextSong}**`, '⏭️ Şarkı Atlandı')] });
    },
};
