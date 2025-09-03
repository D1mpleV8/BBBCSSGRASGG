const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('hapishane')
        .setDescription('Hapishane durumunuzu kontrol eder.'),

    async execute(interaction) {
        await interaction.deferReply();
        const userProfile = await Profile.findOne({ userId: interaction.user.id });

        if (!userProfile) {
            return interaction.editReply('Önce bir profilin olmalı. `/profil`');
        }

        // Eğer kullanıcı hapisteyse ve ceza süresi dolmuşsa, onu serbest bırak.
        if (userProfile.jail.isInJail && new Date() > userProfile.jail.releaseDate) {
            userProfile.jail.isInJail = false;
            userProfile.jail.releaseDate = null;
            await userProfile.save();

            return interaction.editReply('🎉 Özgürsün! Cezan bitti ve hapishaneden çıktın.');
        }

        if (userProfile.jail.isInJail) {
            const embed = new EmbedBuilder()
                .setColor('#C0392B')
                .setTitle('Hapishane Koğuşu')
                .setThumbnail('https://i.imgur.com/22M5h7S.png')
                .setDescription('Demir parmaklıklar ardındasın. Bazı komutları kullanamazsın.')
                .addFields({ name: 'Cezanın Bitiş Zamanı', value: `> <t:${Math.floor(userProfile.jail.releaseDate.getTime() / 1000)}:R>` });
            return interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('Özgürsün!')
                .setDescription('Herhangi bir cezan bulunmuyor, dilediğin gibi takılabilirsin.');
            return interaction.editReply({ embeds: [embed] });
        }
    },
};
