const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { logAction } = require('../../utils/logHelper');

module.exports = {
    category: 'moderasyon',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı (1-100) kanaldan siler.')
        .addIntegerOption(option =>
            option.setName('sayı')
                .setDescription('Silinecek mesaj sayısı')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .setDMPermission(false),
    async execute(interaction) {
        const amount = interaction.options.getInteger('sayı');

        await interaction.deferReply({ ephemeral: true });

        try {
            const messages = await interaction.channel.bulkDelete(amount, true);

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(`✅ Başarıyla **${messages.size}** adet mesaj silindi.`);

            await interaction.editReply({ embeds: [successEmbed] });

            // Log the action
            await logAction(
                interaction.client,
                interaction.guild,
                'Mesajlar Silindi',
                [
                    { name: 'Kanal', value: interaction.channel.toString(), inline: true },
                    { name: 'Silinen Mesaj Sayısı', value: messages.size.toString(), inline: true },
                    { name: 'Yetkili', value: interaction.user.tag, inline: false }
                ],
                '#95A5A6' // Grey color for clear
            );

        } catch (error) {
            console.error('Clear komutunda hata:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription(`Bir hata oluştu. Muhtemelen 14 günden eski mesajları silmeye çalıştınız.`);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
