const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const cars = require('../../data/cars'); // Favori arabanın bilgilerini çekmek için bu gerekli

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Sizin veya başka bir kullanıcının profilini gösterir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Profilini görmek istediğin kullanıcı.')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;

        await interaction.deferReply();

        try {
            // Kullanıcının profilini bul veya yoksa oluştur
            let userProfile = await Profile.findOne({ userId: targetUser.id });
            if (!userProfile) {
                userProfile = new Profile({ userId: targetUser.id, username: targetUser.username });
                await userProfile.save();
                return interaction.editReply('Profilin başarıyla oluşturuldu! Bilgilerini görmek için komutu tekrar kullan.');
            }

            // Ana embed'i oluştur
            const profileEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${targetUser.username}'in Profili`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Seviye', value: `> **${userProfile.level}**`, inline: true },
                    { name: 'XP', value: `> **${userProfile.xp.toLocaleString()} / ${(userProfile.level * 300).toLocaleString()}**`, inline: true },
                    { name: '\u200B', value: '\u200B' }, // Boşluk
                    { name: 'Cüzdan', value: `> 💵 **${userProfile.balance.toLocaleString()}**`, inline: true },
                    { name: 'Banka', value: `> 🏦 **${userProfile.bank.toLocaleString()}**`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `${interaction.user.username} tarafından istendi`});

            // Eğer kullanıcının favori bir arabası varsa, embed'e ekle
            if (userProfile.favoriteCar) {
                const favCarData = cars.find(c => c.id === userProfile.favoriteCar);
                if (favCarData) {
                    profileEmbed.setImage(favCarData.image); // Arabanın resmini büyük resim olarak ekle
                    profileEmbed.addFields({ name: 'Favori Araç', value: `> ⭐ **${favCarData.name}**` });
                }
            }

            // Sonucu gönder
            await interaction.editReply({ embeds: [profileEmbed] });

        } catch (error) {
            console.error('Profil komutunda hata:', error);
            await interaction.editReply('Profilini getirirken bir sorun oluştu.');
        }
    },
};
