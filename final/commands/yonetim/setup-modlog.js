const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('setup-modlog')
        .setDescription('Moderasyon kayıtlarının gönderileceği kanalı ayarlar veya sıfırlar.')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Kayıtların gönderileceği metin kanalı. (Boş bırakırsanız sıfırlanır)')
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        const channel = interaction.options.getChannel('kanal');

        await interaction.deferReply({ ephemeral: true });

        try {
            let settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
            if (!settings) {
                settings = new GuildSettings({ guildId: interaction.guild.id });
            }

            const embed = new EmbedBuilder().setColor('#3498DB');

            if (channel) {
                settings.modLogChannelId = channel.id;
                await settings.save();
                embed.setDescription(`✅ Moderasyon kayıt kanalı başarıyla ${channel} olarak ayarlandı.`);
            } else {
                settings.modLogChannelId = null;
                await settings.save();
                embed.setDescription('ℹ️ Moderasyon kayıt kanalı sıfırlandı.');
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Modlog setup hatası:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription('Kayıt kanalı ayarlanırken bir hata oluştu.');
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
