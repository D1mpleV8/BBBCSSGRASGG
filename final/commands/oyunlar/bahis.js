const { EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const rouletteGame = require('./rulet-baslat'); // Aktif oyunları ve formatlayıcıyı içe aktar

module.exports = {
    name: 'bahis',
    description: 'Aktif bir rulet oyununa bahis yapar.',
    aliases: ['bet'],

    async execute(context) {
        const { message, args } = context;
        const channelId = message.channel.id;
        const activeGames = rouletteGame.activeGames;

        // Aktif oyun var mı kontrol et
        const gameData = activeGames.get(channelId);
        if (!gameData) {
            return message.reply('Bu kanalda şu anda aktif bir rulet turu yok.');
        }

        const betOptionArg = args[0]?.toLowerCase();
        const betAmountArg = args[1];

        if (!betOptionArg || !betAmountArg) {
            return message.reply(`Lütfen bahsinizi ve miktarınızı belirtin. Örn: \`!bahis kırmızı 500\` veya \`!bahis 25 100\``);
        }

        let betType;
        let betOption;

        const numberBet = parseInt(betOptionArg);
        if (!isNaN(numberBet) && numberBet >= 0 && numberBet <= 36) {
            betType = 'number';
            betOption = numberBet;
        } else if (['kırmızı', 'red', 'siyah', 'black', 'yeşil', 'green'].includes(betOptionArg)) {
            betType = 'color';
            // Renkleri standart bir isme çevir
            if (betOptionArg === 'kırmızı') betOption = 'red';
            else if (betOptionArg === 'siyah') betOption = 'black';
            else if (betOptionArg === 'yeşil') betOption = 'green';
            else betOption = betOptionArg;
        } else {
            return message.reply('Geçersiz bahis seçeneği. Seçenekler: `kırmızı`, `siyah`, `yeşil` veya `0-36` arası bir sayı.');
        }

        const betAmount = parseInt(betAmountArg);
        if (isNaN(betAmount) || betAmount <= 0) {
            return message.reply('Lütfen geçerli bir bahis miktarı girin.');
        }

        const userProfile = await Profile.findOne({ userId: message.author.id });
        if (!userProfile || userProfile.balance < betAmount) {
            return message.reply(`Yetersiz bakiye! Cüzdanında **${(userProfile?.balance || 0).toLocaleString()}** 💵 var.`);
        }

        // Kullanıcının mevcut bahislerini kontrol et (isteğe bağlı, istenirse eklenebilir)
        // const existingBet = gameData.bets.find(b => b.userId === message.author.id);
        // if (existingBet) {
        //     return message.reply('Bu tur için zaten bir bahis yaptın!');
        // }

        // Bahsi işle
        userProfile.balance -= betAmount;
        await userProfile.save();

        gameData.bets.push({
            userId: message.author.id,
            username: message.author.username,
            amount: betAmount,
            type: betType,
            option: betOption
        });

        // Ana oyun mesajını güncelle
        const updatedEmbed = EmbedBuilder.from(gameData.embed)
            .setFields({ name: 'Yapılan Bahisler', value: rouletteGame.formatBets(gameData.bets) });

        await gameData.message.edit({ embeds: [updatedEmbed] });

        // Kullanıcıya onay mesajı gönder ve 5 saniye sonra sil
        const confirmation = await message.reply('✅ Bahsin kabul edildi!');
        setTimeout(() => {
            message.delete().catch(() => {});
            confirmation.delete().catch(() => {});
        }, 5000);
    },
};
