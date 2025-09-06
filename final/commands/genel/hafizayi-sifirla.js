const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('hafizayi-sifirla')
        .setDescription('Genesis\'in bu kanaldaki sohbet geçmişini temizler.'),
    async execute(interaction) {
        // We will create a unique session key for each user in each channel
        const sessionKey = `${interaction.channel.id}-${interaction.user.id}`;
        const chatSessions = interaction.client.chatSessions;

        if (chatSessions.has(sessionKey)) {
            chatSessions.delete(sessionKey);
            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription('✅ Bu kanaldaki sohbet geçmişim başarıyla sıfırlandı. Yeni bir başlangıç yapabiliriz!');
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } else {
            const noHistoryEmbed = new EmbedBuilder()
                .setColor('#E67E22')
                .setDescription('ℹ️ Bu kanalda zaten temiz bir sayfamız var. Sıfırlanacak bir şey yok.');
            await interaction.reply({ embeds: [noHistoryEmbed], ephemeral: true });
        }
    },
};
