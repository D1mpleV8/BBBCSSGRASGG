const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');

module.exports = {
    name: 'play',
    description: 'Bir şarkıyı çalar veya sıraya ekler.',
    aliases: ['p', 'çal'],

    async execute(context) {
        const { message, args, client } = context;

        if (args.length === 0) {
            return message.reply('Lütfen bir şarkı adı veya YouTube linki belirtin.');
        }

        const songQuery = args.join(' ');
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('Bu komutu kullanmak için bir ses kanalında olmalısın!');
        }

        const initialMessage = await message.reply(`🔍 **${songQuery}** aranıyor...`);

        try {
            // Arama sonuçlarını doğrula
            const searchResults = await play.search(songQuery, { limit: 1 });
            if (searchResults.length === 0) {
                return initialMessage.edit('Bu isimde bir şarkı bulamadım.');
            }

            const video = searchResults[0];
            const song = {
                title: video.title || 'İsimsiz',
                url: video.url,
                duration: video.durationRaw || 'Bilinmiyor',
                thumbnail: video.thumbnails[0]?.url || client.user.displayAvatarURL(),
                requester: message.author,
            };

            const musicManager = client.musicManager;
            await musicManager.joinVoiceChannel(voiceChannel);
            await musicManager.enqueue(message.guild.id, song, message.channel);

            const queue = musicManager.getQueueInfo(message.guild.id);
            const isPlaying = musicManager.getQueue(message.guild.id)?.isPlaying || false;

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setAuthor({ name: 'Sıraya Eklendi', iconURL: song.requester.displayAvatarURL() })
                .setTitle(song.title)
                .setURL(song.url)
                .setThumbnail(song.thumbnail)
                .addFields(
                    { name: 'Süre', value: `\`${song.duration}\``, inline: true },
                    { name: 'Sıradaki Yeri', value: isPlaying ? `\`#${queue.length}\`` : 'Şimdi Çalacak', inline: true }
                )
                .setTimestamp();

            await initialMessage.edit({ content: '', embeds: [embed] });

        } catch (error) {
            console.error('Play komutu hatası:', error);
            await initialMessage.edit('Şarkı aranırken veya sıraya eklenirken bir hata oluştu.');
        }
    },
};
