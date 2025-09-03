const { SlashCommandBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');

module.exports = {
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('kefalet')
        .setDescription('Kefalet bedelini ödeyerek hapisten çıkarsınız.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const userProfile = await Profile.findOne({ userId: interaction.user.id });

        if (!userProfile || !userProfile.jail.isInJail) {
            const embed = createInfoEmbed('Zaten özgürsün, kefalet ödemene gerek yok.');
            return interaction.editReply({ embeds: [embed] });
        }

        const now = Date.now();
        const releaseTime = userProfile.jail.releaseDate.getTime();
        const remainingMinutes = Math.max(0, Math.ceil((releaseTime - now) / 60000));
        const bailAmount = remainingMinutes * 2000;

        if (bailAmount <= 0) {
            userProfile.jail.isInJail = false;
            userProfile.jail.releaseDate = null;
            await userProfile.save();
            const embed = createSuccessEmbed('🎉 Cezan zaten bitmiş. Hapisten çıktın!', 'Özgürsün!');
            return interaction.editReply({ embeds: [embed] });
        }

        if (userProfile.bank < bailAmount) {
            const embed = createErrorEmbed(`Kefaletini ödemek için bankanda yeterli para yok.\n> **Gereken:** ${bailAmount.toLocaleString()} 💵`);
            return interaction.editReply({ embeds: [embed] });
        }

        userProfile.bank -= bailAmount;
        userProfile.jail.isInJail = false;
        userProfile.jail.releaseDate = null;
        await userProfile.save();

        const embed = createSuccessEmbed(`**${bailAmount.toLocaleString()}** 💵 kefalet bedelini ödedin ve hapisten çıktın. Artık özgürsün!`, 'Kefalet Ödendi!');
        await interaction.editReply({ embeds: [embed] });
    },
};
