const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { logAction } = require('../../utils/logHelper');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Belirtilen kullanıcıyı sunucudan atar.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Atılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Atılma sebebi'))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
        .setDMPermission(false), // Bu komut sunucularda kullanılabilir
    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

        const userRole = interaction.member.roles.highest.position;
        const targetRole = target.roles.highest.position;
        const botRole = interaction.guild.members.me.roles.highest.position;

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'Kendini atamazsın.', ephemeral: true });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Kendimi atamam.', ephemeral: true });
        }

        if (targetRole >= userRole) {
            return interaction.reply({ content: 'Bu kullanıcının rolü senden daha yüksek veya aynı seviyede, bu yüzden onu atamazsın.', ephemeral: true });
        }

        if (targetRole >= botRole) {
            return interaction.reply({ content: 'Bu kullanıcının rolü benden daha yüksek veya aynı seviyede, bu yüzden onu atamam.', ephemeral: true });
        }

        try {
            await target.kick(reason);

            const successEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('Kullanıcı Atıldı')
                .addFields(
                    { name: 'Atılan Kullanıcı', value: target.user.tag, inline: true },
                    { name: 'Yetkili', value: interaction.user.tag, inline: true },
                    { name: 'Sebep', value: `> ${reason}` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            await logAction(
                interaction.client,
                interaction.guild,
                'Kullanıcı Atıldı',
                [
                    { name: 'Atılan Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: 'Sebep', value: reason }
                ],
                '#E67E22' // Orange color for kick
            );

        } catch (error) {
            console.error('Kick komutunda hata:', error);
            await interaction.reply({ content: 'Kullanıcıyı atarken bir hata oluştu.', ephemeral: true });
        }
    },
};
