const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAiChatResponse } = require('../../utils/aiHelper');

module.exports = {
    category: 'yapayzeka',
    data: new SlashCommandBuilder()
        .setName('ozetle')
        .setDescription('Verilen metni yapay zeka kullanarak özetler.')
        .addStringOption(option =>
            option.setName('metin')
                .setDescription('Özetlenecek metin.')
                .setRequired(true)),
    async execute(interaction) {
        const textToSummarize = interaction.options.getString('metin');
        await interaction.deferReply();

        // Performansı artırmak ve token kullanımını optimize etmek için,
        // özetleme işlemi için sohbet geçmişini kullanmayacağız.
        // Bu nedenle doğrudan modele bir istek gönderiyoruz.
        // `getAiChatResponse`'i geçici olarak bu şekilde kullanıyoruz.
        // İdeal senaryoda, geçmişi olmayan tek seferlik istekler için ayrı bir yardımcı fonksiyon olmalıdır.
        const prompt = `Aşağıdaki metni kısa ve anlaşılır bir şekilde özetle:\n\n---\n\n${textToSummarize}`;

        // We use a temporary session key to avoid using and polluting the user's chat history
        const temporaryChannelId = `summarize-${interaction.channel.id}`;
        const temporaryUserId = `summarize-${interaction.user.id}`;

        const result = await getAiChatResponse(temporaryChannelId, temporaryUserId, prompt);

        // Clean up the temporary history entry after getting the response
        const { resetChatHistory } = require('../../utils/aiHelper');
        await resetChatHistory(temporaryChannelId, temporaryUserId);


        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('Metin Özeti')
                .addFields(
                    { name: 'Orijinal Metin', value: `\`\`\`${textToSummarize.substring(0, 1020)}...\`\`\`` },
                    { name: 'Özet', value: result.message }
                )
                .setTimestamp()
                .setFooter({ text: `İsteyen: ${interaction.user.username}` });

            await interaction.editReply({ embeds: [embed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('Özetleme Başarısız')
                .setDescription(result.message || 'Bilinmeyen bir hata oluştu.');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
