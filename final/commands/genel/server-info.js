const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('İçinde bulunulan sunucu hakkında detaylı bilgi verir.'),
    async execute(interaction) {
        const guild = interaction.guild;

        // Sunucu üyelerini ve botları say
        const members = await guild.members.fetch();
        const userCount = members.filter(member => !member.user.bot).size;
        const botCount = members.filter(member => member.user.bot).size;

        // Kanalları say
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

        const embed = new EmbedBuilder()
            .setColor('#1ABC9C')
            .setTitle(`${guild.name} Sunucu Bilgileri`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'Sunucu Sahibi', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Sunucu ID', value: `\`${guild.id}\``, inline: true },
                { name: 'Oluşturulma Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` },
                { name: 'Üyeler', value: `Toplam: **${guild.memberCount}**\nİnsan: **${userCount}**\nBot: **${botCount}**`, inline: true },
                { name: 'Kanallar', value: `Metin: **${textChannels}**\nSes: **${voiceChannels}**\nKategori: **${categoryChannels}**`, inline: true },
                { name: 'Rol Sayısı', value: `**${guild.roles.cache.size}**`, inline: true }
            )
            .setTimestamp();

        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.reply({ embeds: [embed] });
    },
};
