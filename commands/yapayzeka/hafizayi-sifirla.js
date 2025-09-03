const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resetChatHistory } = require('../../utils/aiHelper');

module.exports = {
    category: 'yapayzeka',
    data: new SlashCommandBuilder()
        .setName('hafizayi-sifirla')
        .setDescription('Bu kanaldaki yapay zeka sohbet geçmişinizi sıfırlar.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const result = await resetChatHistory(interaction.channel.id, interaction.user.id);

        const embed = new EmbedBuilder()
            .setColor(result.success ? '#2ECC71' : '#E74C3C')
            .setTitle('Hafıza Sıfırlama Sonucu')
            .setDescription(result.message);

        await interaction.editReply({ embeds: [embed] });
    },
};
