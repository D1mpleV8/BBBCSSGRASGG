const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('user-info')
        .setDescription('Belirtilen kullanıcının veya kendinizin bilgilerini gösterir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Bilgilerini görmek istediğiniz kullanıcı.')),
    async execute(interaction) {
        const member = interaction.options.getMember('kullanıcı') || interaction.member;

        const roles = member.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, -1); // @everyone rolünü hariç tut

        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor || '#95A5A6')
            .setTitle(`${member.user.username}'in Bilgileri`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'Kullanıcı Adı & ID', value: `\`${member.user.tag}\` (${member.id})`, inline: false },
                { name: 'Hesap Oluşturulma Tarihi', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                { name: 'Sunucuya Katılma Tarihi', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: 'Roller', value: roles.length > 0 ? roles.join(', ') : 'Hiç rolü yok.', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
