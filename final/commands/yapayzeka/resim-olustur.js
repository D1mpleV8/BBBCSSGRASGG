const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateImageFromPrompt } = require('../../utils/aiHelper');

module.exports = {
    category: 'yapayzeka',
    data: new SlashCommandBuilder()
        .setName('resim-olustur')
        .setDescription('Yapay zeka ile metinden görsel oluşturur.')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Oluşturulacak görselin açıklaması.')
                .setRequired(true)),
    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        await interaction.deferReply();

        const result = await generateImageFromPrompt(prompt);

        if (result.success) {
            const attachment = new AttachmentBuilder(result.image, { name: 'generated-image.png' });
            const embed = new EmbedBuilder()
                .setColor('#58D68D')
                .setTitle('Görseliniz Oluşturuldu!')
                .setDescription(`**Prompt:**\n> ${prompt}`)
                .setImage('attachment://generated-image.png')
                .setTimestamp()
                .setFooter({ text: `İsteyen: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('Görsel Oluşturulamadı')
                .setDescription(result.message || 'Bilinmeyen bir hata oluştu.');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
