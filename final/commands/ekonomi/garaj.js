const { EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const cars = require('../../data/cars');

module.exports = {
    name: 'garaj',
    description: 'Sahip olduğun arabaları gösterir ve yönetmeni sağlar.',
    aliases: ['garage'],
    async execute(context) {
        const { message, args, client } = context;
        const prefix = process.env.PREFIX || '!';
        const action = args[0]?.toLowerCase();
        const carIdArg = args[1];

        const userProfile = await Profile.findOne({ userId: message.author.id });

        if (!userProfile || userProfile.cars.length === 0) {
            return message.reply(`Garajın bomboş. \`${prefix}galeri\` komutuyla yeni bir araba alabilirsin.`);
        }

        const ownedCarsData = userProfile.cars.map(carId => cars.find(c => c.id === carId)).filter(Boolean);

        if (ownedCarsData.length === 0) {
            return message.reply('Garajında hiç araba bulunamadı. Veritabanı tutarsız olabilir.');
        }

        // --- Aksiyonları Yönet ---
        if (action === 'sat' || action === 'sell') {
            if (!carIdArg) return message.reply(`Lütfen satmak istediğin arabanın ID'sini belirt. Örn: \`${prefix}garaj sat tofas_sahin\``);

            const carToSell = ownedCarsData.find(c => c.id === carIdArg);
            if (!carToSell) {
                return message.reply("Bu arabaya sahip değilsin veya araba ID'si yanlış.");
            }

            const sellPrice = Math.floor(carToSell.price * 0.75);
            userProfile.bank += sellPrice;
            userProfile.cars = userProfile.cars.filter(id => id !== carIdArg);
            if (userProfile.favoriteCar === carIdArg) {
                userProfile.favoriteCar = null;
            }
            await userProfile.save();

            const successEmbed = new EmbedBuilder().setColor('#2ECC71').setDescription(`✅ **${carToSell.name}** satıldı ve bankana **${sellPrice.toLocaleString()}** 💵 eklendi.`);
            return message.reply({ embeds: [successEmbed] });

        } else if (action === 'favori' || action === 'fav') {
            if (!carIdArg) return message.reply(`Lütfen favori yapmak istediğin arabanın ID'sini belirt. Örn: \`${prefix}garaj favori bmw_m4\``);

            const carToFavorite = ownedCarsData.find(c => c.id === carIdArg);
            if (!carToFavorite) {
                return message.reply("Bu arabaya sahip değilsin veya araba ID'si yanlış.");
            }

            userProfile.favoriteCar = carIdArg;
            await userProfile.save();
            return message.reply(`⭐ **${carToFavorite.name}** favori araban olarak ayarlandı!`);
        }

        // --- Varsayılan Garaj Listesi ---
        const favoriteCar = ownedCarsData.find(c => c.id === userProfile.favoriteCar);

        const garageEmbed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle(`${message.author.username}'in Garajı`)
            .setDescription(`Garajındaki arabaların listesi aşağıdadır. \nBir arabayı satmak için: \`${prefix}garaj sat <araba_id>\`\nFavori yapmak için: \`${prefix}garaj favori <araba_id>\``);

        if (favoriteCar) {
            garageEmbed.setThumbnail(favoriteCar.image);
            garageEmbed.addFields({ name: '⭐ Favori Araba', value: `${favoriteCar.name} (\`ID: ${favoriteCar.id}\`)` });
        }

        const carList = ownedCarsData.map(car => {
            const isFav = car.id === userProfile.favoriteCar ? '⭐' : '';
            return `${isFav} **${car.name}** - \`ID: ${car.id}\``;
        }).join('\n');

        garageEmbed.addFields({ name: 'Tüm Arabalar', value: carList || 'Hiç araban yok.' });

        await message.reply({ embeds: [garageEmbed] });
    },
};
