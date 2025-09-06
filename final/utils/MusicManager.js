const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
    AudioPlayerStatus,
} = require('@discordjs/voice');
const play = require('play-dl');

class MusicManager {
    constructor() {
        this.queues = new Map();
    }

    getQueue(guildId) {
        let queue = this.queues.get(guildId);
        if (!queue) {
            queue = {
                songs: [],
                connection: null,
                player: createAudioPlayer(),
                textChannel: null,
                isPlaying: false,
            };
            this.queues.set(guildId, queue);

            // Oyuncu durumunu dinle
            queue.player.on(AudioPlayerStatus.Idle, () => {
                queue.isPlaying = false;
                this.playNext(guildId);
            });

            queue.player.on('error', error => {
                console.error(`Müzik Oynatıcı Hatası (Guild: ${guildId}):`, error);
                queue.textChannel?.send('Müzik çalarken bir hata oluştu. Bir sonraki şarkıya geçiliyor.').catch(() => {});
                this.playNext(guildId);
            });
        }
        return queue;
    }

    async enqueue(guildId, song, textChannel) {
        const queue = this.getQueue(guildId);
        queue.textChannel = textChannel;
        queue.songs.push(song);

        if (!queue.isPlaying) {
            this.playNext(guildId);
        }
    }

    async playNext(guildId) {
        const queue = this.getQueue(guildId);
        if (queue.songs.length === 0) {
            queue.isPlaying = false;
            // Kuyruk bittiğinde 5 dakika sonra kanaldan ayrıl
            setTimeout(() => {
                if (!queue.isPlaying && queue.connection) {
                    queue.connection.destroy();
                    this.queues.delete(guildId);
                }
            }, 300000);
            return;
        }

        queue.isPlaying = true;
        const song = queue.songs.shift();

        try {
            const stream = await play.stream(song.url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            queue.player.play(resource);

            if(queue.textChannel) {
                queue.textChannel.send(`🎶 Şimdi Çalıyor: **${song.title}**`).catch(() => {});
            }

        } catch (error) {
            console.error("Şarkı çalma hatası:", error);
            queue.textChannel?.send(`**${song.title}** çalınırken bir hata oluştu. Atlanıyor.`).catch(() => {});
            this.playNext(guildId);
        }
    }

    async joinVoiceChannel(voiceChannel) {
        const queue = this.getQueue(voiceChannel.guild.id);
        if (queue.connection && queue.connection.joinConfig.channelId === voiceChannel.id) {
            return; // Zaten doğru kanalda
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    connection.destroy();
                    this.queues.delete(voiceChannel.guild.id);
                }
            });

            connection.subscribe(queue.player);
            queue.connection = connection;

        } catch (error) {
            console.error("Ses kanalına bağlanırken hata:", error);
            queue.textChannel?.send("Ses kanalına bağlanırken bir hata oluştu.").catch(() => {});
            this.queues.delete(voiceChannel.guild.id);
        }
    }

    skip(guildId) {
        const queue = this.getQueue(guildId);
        if (queue.player) {
            queue.player.stop(); // Bu, 'idle' durumunu tetikleyecek ve playNext'i çağıracak
        }
    }

    stop(guildId) {
        const queue = this.getQueue(guildId);
        queue.songs = [];
        if (queue.player) queue.player.stop();
        if (queue.connection) queue.connection.destroy();
        this.queues.delete(guildId);
    }

    getQueueInfo(guildId) {
        return this.getQueue(guildId).songs;
    }
}

// Singleton instance
module.exports = new MusicManager();
