const { EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const cars = require('../../data/cars');

module.exports = {
    name: 'galeri',
    description: 'Satılık arabaları listeler ve satın almanızı sağlar.',
    aliases: ['gallery', 'cars'],
    async execute(context) {
        const { message, args, client } = context;
        const prefix = process.env.PREFIX || '!';
        const action = args[0]?.toLowerCase();
        const carIdArg = args[1];

        // Satın alma aksiyonu
        if (action === 'al' || action === 'buy') {
            if (!carIdArg) {
                return message.reply(`Lütfen satın almak istediğin arabanın ID'sini belirt. Örn: \`${prefix}galeri al tofas_sahin\``);
            }

            const carToBuy = cars.find(c => c.id === carIdArg);
            if (!carToBuy) {
                return message.reply("Bu ID'ye sahip bir araba galeride bulunmuyor.");
            }

            const userProfile = await Profile.findOne({ userId: message.author.id });
            if (!userProfile) {
                 return message.reply('Önce bir profilin oluşturulmalı. Herhangi bir ekonomi komutunu kullanmayı dene.');
            }

            if (userProfile.cars.includes(carToBuy.id)) {
                return message.reply(`Bu arabaya (${carToBuy.name}) zaten sahipsin!`);
            }

            if (userProfile.bank < carToBuy.price) {
                return message.reply(`Bu arabayı almak için bankanda yeterli para yok! Gereken: **${carToBuy.price.toLocaleString()}** 💵`);
            }

            userProfile.bank -= carToBuy.price;
            userProfile.cars.push(carToBuy.id);
            await userProfile.save();

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 Tebrikler! 🎉')
                .setDescription(`**${carToBuy.name}** adlı aracı başarıyla satın aldın.`)
                .setImage(carToBuy.image)
                .setFooter({ text: `Yeni banka bakiyen: ${userProfile.bank.toLocaleString()} 💵` });

            return message.reply({ embeds: [successEmbed] });
        }

        // Varsayılan galeri listesi
        const galleryEmbed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setTitle('Araba Galerisi')
            .setDescription(`Bir araba satın almak için \`${prefix}galeri al <araba_id>\` komutunu kullanın.`);

        cars.forEach(car => {
            galleryEmbed.addFields({
                name: `${car.name} - ${car.price.toLocaleString()} 💵`,
                value: `\`ID: ${car.id}\``,
                inline: true
            });
        });

        // Rastgele bir araba resmini thumbnail olarak ayarla
        const randomCarImage = cars[Math.floor(Math.random() * cars.length)].image;
        galleryEmbed.setThumbnail(randomCarImage);

        await message.reply({ embeds: [galleryEmbed] });
    },
};
