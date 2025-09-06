const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('seviye')
        .setDescription('Sizin veya başka bir kullanıcının seviyesini gösterir.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Seviyesini görmek istediğin kullanıcı.')),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
        await interaction.deferReply();

        try {
            const userProfile = await Profile.findOne({ userId: targetUser.id });
            if (!userProfile) {
                return interaction.editReply(`**${targetUser.username}** adlı kullanıcının henüz bir profili yok.`);
            }

            const currentXp = userProfile.xp;
            const currentLevel = userProfile.level;
            const nextLevelXp = currentLevel * 300;
            const percentage = Math.max(0, Math.min(100, Math.floor((currentXp / nextLevelXp) * 100)));
            const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

            const rankEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setAuthor({ name: `${targetUser.username}'in Seviye Bilgisi`, iconURL: targetUser.displayAvatarURL() })
                .addFields(
                    { name: 'Seviye', value: `> **${currentLevel}**`, inline: true },
                    { name: 'Tecrübe Puanı (XP)', value: `> **${currentXp.toLocaleString()} / ${nextLevelXp.toLocaleString()}**`, inline: true },
                    { name: 'İlerleme', value: `> \`[${progressBar}]\` **%${percentage}**` }
                );
            await interaction.editReply({ embeds: [rankEmbed] });
        } catch (error) {
            console.error('Seviye komutunda hata:', error);
            await interaction.editReply('Seviye bilgilerini getirirken bir sorun oluştu.');
        }
    },
};
