const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Profile = require('../../models/Profile');
const cars = require('../../data/cars');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('galeri')
        .setDescription('Satılık arabaları gösteren interaktif bir galeri açar.'),
    async execute(interaction) {
        let currentPage = 0;

        const generateEmbed = (page) => {
            const car = cars[page];
            return new EmbedBuilder()
                .setColor('#FFFFFF')
                .setTitle(`Galerideki Arabalar (${page + 1}/${cars.length})`)
                .setAuthor({ name: car.name })
                .setDescription(`**Fiyat:** ${car.price.toLocaleString()} 💵`)
                .setImage(car.image)
                .setFooter({ text: 'Aşağıdaki butonlarla galeriyi gezebilir veya aracı satın alabilirsin.' });
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('gallery_prev').setLabel('Önceki').setStyle(ButtonStyle.Secondary).setEmoji('⬅️').setDisabled(page === 0),
                new ButtonBuilder().setCustomId('gallery_buy').setLabel('Satın Al').setStyle(ButtonStyle.Success).setEmoji('🛒'),
                new ButtonBuilder().setCustomId('gallery_next').setLabel('Sonraki').setStyle(ButtonStyle.Secondary).setEmoji('➡️').setDisabled(page === cars.length - 1)
            );
        };

        const galleryMessage = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)],
            fetchReply: true
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = galleryMessage.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'gallery_buy') {
                const carToBuy = cars[currentPage];
                const userProfile = await Profile.findOne({ userId: i.user.id });

                if (!userProfile || userProfile.bank < carToBuy.price) {
                    return i.reply({ content: `Bu arabayı almak için bankanda yeterli para yok! Gereken: ${carToBuy.price.toLocaleString()} 💵`, ephemeral: true });
                }
                if (userProfile.cars.includes(carToBuy.id)) {
                    return i.reply({ content: `Bu arabaya (${carToBuy.name}) zaten sahipsin!`, ephemeral: true });
                }

                userProfile.bank -= carToBuy.price;
                userProfile.cars.push(carToBuy.id);
                await userProfile.save();

                collector.stop();
                const successEmbed = new EmbedBuilder().setColor('#2ECC71').setTitle('🎉 Tebrikler! 🎉').setDescription(`**${carToBuy.name}** adlı aracı başarıyla satın aldın.`).setImage(carToBuy.image);
                await i.update({ embeds: [successEmbed], components: [] });
                return;
            }

            currentPage = i.customId === 'gallery_prev' ? currentPage - 1 : currentPage + 1;
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                 galleryMessage.edit({ components: [] }).catch(() => {});
            }
        });
    },
};
