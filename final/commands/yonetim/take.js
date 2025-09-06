const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('take')
        .setDescription('Bot sahibi özel komutu: Kullanıcılardan varlık alır.')
        .addSubcommand(sub => sub
            .setName('para')
            .setDescription('Bir kullanıcının cüzdanından para alır.')
            .addUserOption(option => option.setName('kullanıcı').setDescription('Para alınacak kullanıcı').setRequired(true))
            .addIntegerOption(option => option.setName('miktar').setDescription('Alınacak miktar').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('banka')
            .setDescription('Bir kullanıcının bankasından para alır.')
            .addUserOption(option => option.setName('kullanıcı').setDescription('Para alınacak kullanıcı').setRequired(true))
            .addIntegerOption(option => option.setName('miktar').setDescription('Alınacak miktar').setRequired(true)))
        .setDMPermission(false),

    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: 'Bu komutu sadece bot sahibi kullanabilir.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('kullanıcı');
        const amount = interaction.options.getInteger('miktar');

        await interaction.deferReply({ ephemeral: true });

        const targetProfile = await Profile.findOne({ userId: target.id });
        if (!targetProfile) {
            return interaction.editReply('Bu kullanıcının profili bulunamadı.');
        }

        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setAuthor({ name: 'Varlık Alındı', iconURL: interaction.client.user.displayAvatarURL() });

        try {
            switch (subcommand) {
                case 'para':
                    targetProfile.balance = Math.max(0, targetProfile.balance - amount);
                    await targetProfile.save();
                    embed.setDescription(`✅ **${target.tag}** adlı kullanıcının cüzdanından **${amount.toLocaleString()}** 💵 alındı.`);
                    break;
                case 'banka':
                    targetProfile.bank = Math.max(0, targetProfile.bank - amount);
                    await targetProfile.save();
                    embed.setDescription(`✅ **${target.tag}** adlı kullanıcının bankasından **${amount.toLocaleString()}** 💵 alındı.`);
                    break;
            }
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Take komutu hatası:', error);
            await interaction.editReply('Varlık alınırken bir hata oluştu.');
        }
    },
};
