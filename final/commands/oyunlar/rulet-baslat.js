const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const { generateRouletteImage } = require('../../utils/rouletteImageGenerator');

// Bu Map, kanal ID'lerini aktif oyun verilerine eşler.
// Her oyun verisi, bahisleri ve oyun mesajını içerir.
const activeGames = new Map();

const ROULETTE_NUMBERS_MAP = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
    11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
    21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};
const COLOR_EMOJIS = { red: '🔴', black: '⚫', green: '🟢' };

// Bahisleri formatlayan yardımcı fonksiyon
function formatBets(bets) {
    if (bets.length === 0) return 'Henüz bahis yapılmadı.';
    return bets.map(bet => {
        const betChoice = bet.type === 'color'
            ? `${COLOR_EMOJIS[bet.option]} ${bet.option.charAt(0).toUpperCase() + bet.option.slice(1)}`
            : `🔢 ${bet.option}`;
        return `> **${bet.username}**: ${bet.amount.toLocaleString()} 💵 > ${betChoice}`;
    }).join('\n');
}

module.exports = {
    name: 'rulet-baslat',
    description: 'Çok oyunculu bir rulet turu başlatır.',
    aliases: ['rulet', 'roulette'],

    // Bu komutun kendisi artık sadece oyunu başlatıyor. Bahisler `bahis` komutu ile yapılıyor.
    async execute(context) {
        const { message } = context;
        const prefix = process.env.PREFIX || '!';

        if (activeGames.has(message.channel.id)) {
            return message.reply('Bu kanalda zaten devam eden bir rulet turu var!');
        }

        const gameDuration = 60000; // 60 saniye
        const endTime = Date.now() + gameDuration;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎡 Rulet Masası Açıldı! 🎡')
            .setDescription(`Bahisler açıldı! Tur <t:${Math.floor(endTime / 1000)}:R> sona erecek.\nBahis yapmak için: \`${prefix}bahis <renk/sayı> <miktar>\``)
            .addFields({ name: 'Yapılan Bahisler', value: 'Henüz bahis yapılmadı.' })
            .setThumbnail('https://i.imgur.com/8db1pA8.png');

        const gameMessage = await message.channel.send({ embeds: [embed] });
        const gameData = {
            bets: [],
            message: gameMessage,
            embed: embed
        };
        activeGames.set(message.channel.id, gameData);

        // Oyunun bitişini ayarla
        setTimeout(async () => {
            const finalGameData = activeGames.get(message.channel.id);
            if (!finalGameData) return; // Oyun bir şekilde iptal edilmiş olabilir

            const processingEmbed = EmbedBuilder.from(finalGameData.embed)
                .setColor('#F1C40F')
                .setDescription('Bahisler kapandı! Çark dönüyor...');
            await finalGameData.message.edit({ embeds: [processingEmbed] });

            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle

            const winningNumber = Math.floor(Math.random() * 37);
            const imageBuffer = await generateRouletteImage(winningNumber);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'rulet-sonuc.png' });
            const winningColorName = ROULETTE_NUMBERS_MAP[winningNumber];
            const winners = [];
            const updatePromises = [];

            for (const bet of finalGameData.bets) {
                let hasWon = false, payoutRatio = 0;
                if ((bet.type === 'color' && bet.option === winningColorName) || (bet.type === 'number' && parseInt(bet.option) === winningNumber)) {
                    hasWon = true;
                    if (bet.type === 'color') payoutRatio = bet.option === 'green' ? 14 : 2;
                    if (bet.type === 'number') payoutRatio = 35;
                }

                if (hasWon) {
                    const winnings = bet.amount * payoutRatio;
                    winners.push(`> **${bet.username}**, ${winnings.toLocaleString()} 💵 kazandı!`);
                    updatePromises.push(Profile.findOneAndUpdate({ userId: bet.userId }, { $inc: { balance: winnings } }));
                }
            }

            if (updatePromises.length > 0) await Promise.all(updatePromises);

            const finalEmbed = new EmbedBuilder()
                .setColor(winningColorName === 'green' ? '#2ECC71' : (winningColorName === 'red' ? '#E74C3C' : '#95A5A6'))
                .setTitle('🎡 Rulet Sonucu 🎡')
                .setDescription(`Top **${COLOR_EMOJIS[winningColorName]} ${winningNumber}** sayısında durdu!`)
                .setImage('attachment://rulet-sonuc.png')
                .addFields({ name: 'Kazananlar', value: winners.length > 0 ? winners.join('\n') : 'Bu tur kimse kazanamadı.' });

            await finalGameData.message.edit({ embeds: [finalEmbed], files: [attachment] });
            activeGames.delete(message.channel.id);

        }, gameDuration);
    },
    // Diğer komutların erişebilmesi için aktif oyunları dışa aktar
    activeGames: activeGames,
    formatBets: formatBets,
};
