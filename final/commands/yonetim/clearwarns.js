const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Warning = require('../../models/Warning');
const { logAction } = require('../../utils/logHelper');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('Bir kullanıcının tüm uyarılarını temizler.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Uyarıları temizlenecek kullanıcı')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        const target = interaction.options.getUser('kullanıcı');

        const confirmationEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('Uyarıları Temizleme Onayı')
            .setDescription(`**${target.tag}** adlı kullanıcının tüm uyarılarını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_clearwarns')
                    .setLabel('Evet, Tümünü Sil')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_clearwarns')
                    .setLabel('Hayır, İptal Et')
                    .setStyle(ButtonStyle.Secondary)
            );

        const reply = await interaction.reply({
            embeds: [confirmationEmbed],
            components: [buttons],
            ephemeral: true
        });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 15000 // 15 saniye
        });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_clearwarns') {
                try {
                    const result = await Warning.deleteMany({ guildId: interaction.guild.id, userId: target.id });

                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setDescription(`✅ **${target.tag}** adlı kullanıcının **${result.deletedCount}** adet uyarısı başarıyla silindi.`);

                    await i.update({ embeds: [successEmbed], components: [] });

                    await logAction(
                        interaction.client,
                        interaction.guild,
                        'Kullanıcı Uyarıları Temizlendi',
                        [
                            { name: 'Kullanıcı', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Yetkili', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                            { name: 'Silinen Uyarı Sayısı', value: result.deletedCount.toString() }
                        ],
                        '#3498DB'
                    );

                } catch (error) {
                    console.error('Clearwarns hatası:', error);
                    const errorEmbed = new EmbedBuilder().setColor('#E74C3C').setDescription('Uyarılar silinirken bir hata oluştu.');
                    await i.update({ embeds: [errorEmbed], components: [] });
                }
            } else {
                const cancelEmbed = new EmbedBuilder().setColor('#95A5A6').setDescription('İşlem iptal edildi.');
                await i.update({ embeds: [cancelEmbed], components: [] });
            }
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder().setColor('#95A5A6').setDescription('Onay süresi dolduğu için işlem iptal edildi.');
                reply.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    },
};
