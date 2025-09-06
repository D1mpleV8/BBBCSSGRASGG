const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('bakiye')
        .setDescription('Sizin veya başka bir kullanıcının bakiyesini gösterir.')
        .addUserOption(option => option.setName('kullanıcı').setDescription('Bakiyesini görmek istediğin kullanıcı.')),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
        await interaction.deferReply();

        try {
            let userProfile = await Profile.findOne({ userId: targetUser.id });
            if (!userProfile) {
                userProfile = new Profile({ userId: targetUser.id, username: targetUser.username });
                await userProfile.save();
            }

            const bakiyeEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setAuthor({ name: `${targetUser.username}'in Bakiyesi`, iconURL: targetUser.displayAvatarURL() })
                .addFields(
                    { name: 'Cüzdan', value: `> 💵 **${userProfile.balance.toLocaleString()}**`, inline: true },
                    { name: 'Banka', value: `> 🏦 **${userProfile.bank.toLocaleString()}**`, inline: true }
                );
            await interaction.editReply({ embeds: [bakiyeEmbed] });
        } catch (error) {
            console.error('Bakiye komutunda hata:', error);
            await interaction.editReply('Bakiyeyi getirirken bir sorun oluştu.');
        }
    },
};
