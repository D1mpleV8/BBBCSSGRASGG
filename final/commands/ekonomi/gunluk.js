const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('gunluk')
        .setDescription('24 saatte bir günlük ödülünüzü alırsınız.'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            let userProfile = await Profile.findOne({ userId: interaction.user.id });
            if (!userProfile) {
                userProfile = new Profile({ userId: interaction.user.id, username: interaction.user.username });
            }

            const cooldown = 24 * 60 * 60 * 1000; // 24 saat
            const lastUsed = userProfile.dailyLastUsed?.getTime() || 0;

            if (Date.now() - lastUsed < cooldown) {
                const timeLeft = cooldown - (Date.now() - lastUsed);
                const hours = Math.floor(timeLeft / 3600000);
                const minutes = Math.floor((timeLeft % 3600000) / 60000);

                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('Beklemen Gerekiyor')
                    .setDescription(`Günlük ödülünü zaten aldın. Lütfen **${hours} saat ${minutes} dakika** sonra tekrar dene.`);

                return interaction.editReply({ embeds: [cooldownEmbed] });
            }

            const reward = Math.floor(Math.random() * 1001) + 500; // 500 ile 1500 arası
            userProfile.balance += reward;
            userProfile.dailyLastUsed = new Date();
            await userProfile.save();

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 Günlük Ödül 🎉')
                .setDescription(`**${reward.toLocaleString()}** 💵 cüzdanına eklendi! Yarın tekrar gel.`);

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Günlük komutunda hata:', error);
            await interaction.editReply('Ödülünü alırken bir sorun oluştu.');
        }
    },
};
