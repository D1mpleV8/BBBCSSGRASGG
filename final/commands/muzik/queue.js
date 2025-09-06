const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed } = require('../../utils/embeds');

module.exports = {
    category: 'muzik',
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Mevcut müzik çalma listesini gösterir.'),
    async execute(interaction) {
        const musicManager = interaction.client.musicManager;
        const queue = musicManager.getQueueInfo(interaction.guild.id);
        const currentQueue = musicManager.getQueue(interaction.guild.id);

        if (queue.length === 0 && !currentQueue.isPlaying) {
            return interaction.reply({ embeds: [createInfoEmbed('Çalma listesi şu anda boş.')], ephemeral: true });
        }

        await interaction.deferReply();

        const itemsPerPage = 10;
        let currentPage = 0;
        const totalPages = Math.ceil(queue.length / itemsPerPage);

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = queue.slice(start, end);

            const description = currentItems.map((song, index) => {
                return `**${start + index + 1}.** [${song.title}](${song.url}) | \`${song.duration}\` - İsteyen: ${song.requester}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎶 Müzik Çalma Listesi 🎶')
                .setDescription(description || 'Sırada başka şarkı yok.')
                .setFooter({ text: `Sayfa ${page + 1}/${totalPages > 0 ? totalPages : 1} | Toplam ${queue.length} şarkı` });

            if (currentQueue.isPlaying && page === 0) {
                 embed.addFields({ name: 'Şimdi Çalıyor', value: `▶️ [${currentQueue.songs[0]?.title || 'Bilinmiyor'}](${currentQueue.songs[0]?.url})` });
            }

            return embed;
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('q_prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('q_next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1)
            );
        };

        const initialEmbed = generateEmbed(currentPage);
        const initialButtons = generateButtons(currentPage);
        const reply = await interaction.editReply({ embeds: [initialEmbed], components: totalPages > 1 ? [initialButtons] : [] });

        if (totalPages <= 1) return;

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120000
        });

        collector.on('collect', async i => {
            if (i.customId === 'q_prev') currentPage--;
            else if (i.customId === 'q_next') currentPage++;

            await i.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
        });

        collector.on('end', () => {
            const disabledButtons = generateButtons(currentPage);
            disabledButtons.components.forEach(button => button.setDisabled(true));
            reply.edit({ components: [disabledButtons] }).catch(() => {});
        });
    },
};
