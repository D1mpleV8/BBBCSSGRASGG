const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Warning = require('../../models/Warning');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Bir kullanıcının uyarı geçmişini gösterir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Uyarıları görülecek kullanıcı')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const target = interaction.options.getUser('kullanıcı');

        await interaction.deferReply();

        try {
            const userWarnings = await Warning.find({
                guildId: interaction.guild.id,
                userId: target.id
            }).sort({ timestamp: -1 });

            if (userWarnings.length === 0) {
                const noWarningsEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setAuthor({ name: `${target.username}'in Uyarı Geçmişi`, iconURL: target.displayAvatarURL() })
                    .setDescription('Bu kullanıcının hiç uyarısı bulunmuyor.');
                return interaction.editReply({ embeds: [noWarningsEmbed] });
            }

            let page = 0;
            const warningsPerPage = 5;
            const totalPages = Math.ceil(userWarnings.length / warningsPerPage);

            const generateEmbed = (currentPage) => {
                const start = currentPage * warningsPerPage;
                const end = start + warningsPerPage;
                const currentWarnings = userWarnings.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setAuthor({ name: `${target.username}'in Uyarı Geçmişi (${userWarnings.length} toplam)`, iconURL: target.displayAvatarURL() })
                    .setFooter({ text: `Sayfa ${currentPage + 1} / ${totalPages}` });

                for (const warn of currentWarnings) {
                    embed.addFields({
                        name: `ID: ${warn._id} | Tarih: ${new Date(warn.timestamp).toLocaleDateString('tr-TR')}`,
                        value: `**Yetkili:** ${warn.moderatorTag}\n**Sebep:** ${warn.reason}`
                    });
                }
                return embed;
            };

            const generateButtons = (currentPage) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('◀️ Önceki')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('Sonraki ▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage >= totalPages - 1)
                    );
            };

            const initialEmbed = generateEmbed(page);
            const initialButtons = generateButtons(page);
            const reply = await interaction.editReply({ embeds: [initialEmbed], components: [initialButtons] });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000 // 60 saniye
            });

            collector.on('collect', async i => {
                if (i.customId === 'prev_page') {
                    page--;
                } else if (i.customId === 'next_page') {
                    page++;
                }
                const newEmbed = generateEmbed(page);
                const newButtons = generateButtons(page);
                await i.update({ embeds: [newEmbed], components: [newButtons] });
            });

            collector.on('end', () => {
                const disabledButtons = generateButtons(page);
                disabledButtons.components.forEach(button => button.setDisabled(true));
                reply.edit({ components: [disabledButtons] }).catch(() => {});
            });

        } catch (error) {
            console.error('Warnings komutunda hata:', error);
            await interaction.editReply({ content: 'Kullanıcının uyarıları getirilirken bir hata oluştu.' });
        }
    },
};
