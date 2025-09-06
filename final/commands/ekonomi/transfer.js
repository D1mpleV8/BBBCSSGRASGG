const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Başka bir kullanıcıya para gönderir.')
        .addUserOption(option => option.setName('hedef').setDescription('Para göndereceğin kullanıcı.').setRequired(true))
        .addIntegerOption(option => option.setName('miktar').setDescription('Gönderilecek miktar.').setRequired(true).setMinValue(1)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('hedef');
        const amount = interaction.options.getInteger('miktar');

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: 'Kendine para gönderemezsin!', ephemeral: true });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: 'Botlara para gönderemezsin.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const senderProfile = await Profile.findOne({ userId: interaction.user.id });
            const receiverProfile = await Profile.findOneAndUpdate(
                { userId: targetUser.id },
                { $setOnInsert: { username: targetUser.username } },
                { upsert: true, new: true }
            );

            if (!senderProfile || senderProfile.balance < amount) {
                return interaction.editReply('Bu transfer için yeterli bakiyen yok.');
            }

            senderProfile.balance -= amount;
            receiverProfile.balance += amount;

            await Promise.all([senderProfile.save(), receiverProfile.save()]);

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('💸 Transfer Başarılı 💸')
                .setDescription(`**${targetUser.username}** adlı kullanıcıya başarıyla **${amount.toLocaleString()}** 💵 gönderdin!`)
                .addFields(
                    { name: 'Gönderen', value: interaction.user.username, inline: true },
                    { name: 'Alıcı', value: targetUser.username, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Transfer komutunda hata:', error);
            await interaction.editReply('Transfer işlemi sırasında bir hata oluştu.');
        }
    },
};
