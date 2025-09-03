const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const play = require('play-dl');
const { createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    category: 'muzik',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Bir şarkıyı çalar veya sıraya ekler.')
        .addStringOption(option =>
            option.setName('sarki')
                .setDescription('YouTube linki veya şarkı adı.')
                .setRequired(true)),
    async execute(interaction) {
        const songQuery = interaction.options.getString('sarki');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ embeds: [createErrorEmbed('Bu komutu kullanmak için bir ses kanalında olmalısın!')], ephemeral: true });
        }

        await interaction.deferReply();

        try {
            // Arama sonuçlarını doğrula
            const searchResults = await play.search(songQuery, { limit: 1 });
            if (searchResults.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed('Bu isimde bir şarkı bulamadım.')] });
            }

            const video = searchResults[0];
            const song = {
                title: video.title || 'İsimsiz',
                url: video.url,
                duration: video.durationRaw || 'Bilinmiyor',
                thumbnail: video.thumbnails[0]?.url || interaction.client.user.displayAvatarURL(),
                requester: interaction.user,
            };

            const musicManager = interaction.client.musicManager;
            await musicManager.joinVoiceChannel(voiceChannel);
            await musicManager.enqueue(interaction.guild.id, song, interaction.channel);

            const queue = musicManager.getQueueInfo(interaction.guild.id);
            const isPlaying = musicManager.getQueue(interaction.guild.id).isPlaying;

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setAuthor({ name: 'Sıraya Eklendi', iconURL: song.requester.displayAvatarURL() })
                .setTitle(song.title)
                .setURL(song.url)
                .setThumbnail(song.thumbnail)
                .addFields(
                    { name: 'Süre', value: `\`${song.duration}\``, inline: true },
                    { name: 'Sıradaki Yeri', value: isPlaying ? `\`#${queue.length + 1}\`` : 'Şimdi Çalacak', inline: true }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Play komutu hatası:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Şarkı aranırken veya sıraya eklenirken bir hata oluştu.')] });
        }
    },
};
