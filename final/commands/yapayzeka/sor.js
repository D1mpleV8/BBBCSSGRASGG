const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAiChatResponse } = require('../../utils/aiHelper');

module.exports = {
    category: 'yapayzeka',
    data: new SlashCommandBuilder()
        .setName('sor')
        .setDescription('Yapay zekâya bir soru sorar. (Sohbeti hatırlar)')
        .addStringOption(option =>
            option.setName('soru')
                .setDescription('Yapay zekâya sormak istediğiniz soru')
                .setRequired(true)),
    async execute(interaction) {
        const prompt = interaction.options.getString('soru');
        await interaction.deferReply();

        const result = await getAiChatResponse(
            interaction.channel.id,
            interaction.user.id,
            prompt
        );

        if (result.success) {
            const responseEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTitle('Soru')
                .setDescription(`> ${prompt}`)
                .addFields({ name: 'Genesis\'in Cevabı', value: result.message });

            await interaction.editReply({ embeds: [responseEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('Yanıt Alınamadı')
                .setDescription(result.message || 'Bilinmeyen bir hata oluştu.');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
