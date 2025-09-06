const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Profile = require('../../models/Profile');
const cars = require('../../data/cars');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('garaj')
        .setDescription('Sahip olduğun arabaları gösterir ve yönetmeni sağlar.'),
    async execute(interaction) {
        await interaction.deferReply();
        const userProfile = await Profile.findOne({ userId: interaction.user.id });

        if (!userProfile || userProfile.cars.length === 0) {
            return interaction.editReply('Garajın bomboş. `/galeri` komutuyla yeni bir araba alabilirsin.');
        }

        let currentPage = 0;
        const ownedCarsData = userProfile.cars.map(carId => cars.find(c => c.id === carId)).filter(Boolean);

        if(ownedCarsData.length === 0) {
            return interaction.editReply('Garajında hiç araba bulunamadı. Veritabanı tutarsız olabilir.');
        }

        const generateEmbed = (page) => {
            const car = ownedCarsData[page];
            const isFavorite = userProfile.favoriteCar === car.id;
            return new EmbedBuilder().setColor(isFavorite ? '#FFD700' : '#95A5A6').setTitle(`${isFavorite ? '⭐ ' : ''}${car.name}`).setAuthor({ name: `${interaction.user.username}'in Garajı (${page + 1}/${ownedCarsData.length})` }).setImage(car.image);
        };

        const generateButtons = (page) => {
            const carId = ownedCarsData[page].id;
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`garage_prev_${carId}`).setLabel('Önceki').setStyle(ButtonStyle.Secondary).setEmoji('⬅️').setDisabled(page === 0),
                new ButtonBuilder().setCustomId(`garage_fav_${carId}`).setLabel('Favori Yap').setStyle(ButtonStyle.Primary).setEmoji('⭐').setDisabled(userProfile.favoriteCar === carId),
                new ButtonBuilder().setCustomId(`garage_sell_${carId}`).setLabel('Sat').setStyle(ButtonStyle.Danger).setEmoji('💸'),
                new ButtonBuilder().setCustomId(`garage_next_${carId}`).setLabel('Sonraki').setStyle(ButtonStyle.Secondary).setEmoji('➡️').setDisabled(page === ownedCarsData.length - 1)
            );
        };

        const garageMessage = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = garageMessage.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async (i) => {
            const [action, type, carId] = i.customId.split('_');

            if (type === 'prev' || type === 'next') {
                currentPage = type === 'prev' ? currentPage - 1 : currentPage + 1;
                await i.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
            } else if (type === 'fav') {
                userProfile.favoriteCar = carId;
                await userProfile.save();
                await i.update({ content: `**${ownedCarsData[currentPage].name}** favori araban olarak ayarlandı!`, embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
            } else if (type === 'sell') {
                const carToSell = cars.find(c => c.id === carId);
                const sellPrice = Math.floor(carToSell.price * 0.75);

                userProfile.bank += sellPrice;
                userProfile.cars = userProfile.cars.filter(id => id !== carId);
                if (userProfile.favoriteCar === carId) userProfile.favoriteCar = null;
                await userProfile.save();

                collector.stop();
                const successEmbed = new EmbedBuilder().setColor('#2ECC71').setDescription(`✅ **${carToSell.name}** satıldı ve bankana **${sellPrice.toLocaleString()}** 💵 eklendi.`);
                await i.update({ embeds: [successEmbed], components: [] });
            }
        });
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                 garageMessage.edit({ components: [] }).catch(() => {});
            }
        });
    },
};
