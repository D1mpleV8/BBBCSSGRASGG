const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { logAction } = require('../../utils/logHelper');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Belirtilen kullanıcıyı sunucudan yasaklar.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Yasaklanacak kullanıcı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Yasaklanma sebebi'))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

        if (!target) {
            return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
        }

        const userRole = interaction.member.roles.highest.position;
        const targetRole = target.roles.highest.position;
        const botRole = interaction.guild.members.me.roles.highest.position;

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'Kendini yasaklayamazsın.', ephemeral: true });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Kendimi yasaklayamam.', ephemeral: true });
        }

        if (targetRole >= userRole) {
            return interaction.reply({ content: 'Bu kullanıcının rolü senden daha yüksek veya aynı seviyede, bu yüzden onu yasaklayamazsın.', ephemeral: true });
        }

        if (targetRole >= botRole) {
            return interaction.reply({ content: 'Bu kullanıcının rolü benden daha yüksek veya aynı seviyede, bu yüzden onu yasaklayamam.', ephemeral: true });
        }

        try {
            await target.ban({ reason: reason });

            const successEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('Kullanıcı Yasaklandı')
                .addFields(
                    { name: 'Yasaklanan Kullanıcı', value: target.user.tag, inline: true },
                    { name: 'Yetkili', value: interaction.user.tag, inline: true },
                    { name: 'Sebep', value: `> ${reason}` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            await logAction(
                interaction.client,
                interaction.guild,
                'Kullanıcı Yasaklandı',
                [
                    { name: 'Yasaklanan Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: 'Sebep', value: reason }
                ],
                '#E74C3C' // Red color for ban
            );

        } catch (error) {
            console.error('Ban komutunda hata:', error);
            await interaction.reply({ content: 'Kullanıcıyı yasaklarken bir hata oluştu.', ephemeral: true });
        }
    },
};
