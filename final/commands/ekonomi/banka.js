const { EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

// Miktarı ayrıştıran yardımcı fonksiyon
const parseAmount = (text, balance, bankBalance, action) => {
    const cleanText = text.toLowerCase();
    const targetBalance = action === 'yatir' ? balance : bankBalance;

    if (cleanText === 'hepsi' || cleanText === 'all') {
        return targetBalance;
    }
    if (cleanText === 'yarısı' || cleanText === 'half') {
        return Math.floor(targetBalance / 2);
    }
    if (cleanText === 'çeyreği' || cleanText === 'quarter') {
        return Math.floor(targetBalance / 4);
    }
    if (cleanText.startsWith('%')) {
        const percentage = parseInt(cleanText.substring(1));
        if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
            return Math.floor(targetBalance * (percentage / 100));
        }
    }

    const amount = parseInt(cleanText);
    return isNaN(amount) ? null : amount;
};


module.exports = {
    name: 'banka',
    description: 'Bankaya para yatırır veya bankadan para çeker.',
    aliases: ['bank'],
    async execute(context) {
        const { message, args, client } = context;
        const prefix = process.env.PREFIX || '!';

        const action = args[0]?.toLowerCase();
        const amountArg = args[1];

        if (!action || !amountArg || !['yatir', 'çek', 'cek', 'deposit', 'withdraw'].includes(action)) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('Banka Komutu Kullanımı')
                .setDescription('Bankaya para yatırmak veya çekmek için kullanılır.')
                .addFields(
                    { name: 'Para Yatırma', value: `\`${prefix}banka yatir <miktar>\``, inline: true },
                    { name: 'Para Çekme', value: `\`${prefix}banka çek <miktar>\``, inline: true },
                    { name: 'Örnek Miktarlar', value: '`5000`, `hepsi`, `yarısı`, `çeyreği`, `%50`' }
                )
                .setFooter({ text: 'İşlem yapmak için komutu doğru şekilde kullanın.' });
            return message.reply({ embeds: [usageEmbed] });
        }

        let userProfile = await Profile.findOne({ userId: message.author.id });
        if (!userProfile) {
            userProfile = new Profile({ userId: message.author.id, username: message.author.username });
            await userProfile.save();
        }

        const isDeposit = ['yatir', 'deposit'].includes(action);
        const amount = parseAmount(amountArg, userProfile.balance, userProfile.bank, isDeposit ? 'yatir' : 'cek');

        if (amount === null || amount <= 0) {
            return message.reply('Lütfen geçerli bir miktar girin. Örnek: `5000`, `hepsi`, `yarısı`, `%50`');
        }

        if (isDeposit) {
            if (userProfile.balance < amount) {
                return message.reply('Cüzdanında bu kadar para yok!');
            }
            userProfile.balance -= amount;
            userProfile.bank += amount;
        } else { // Withdraw
            if (userProfile.bank < amount) {
                return message.reply('Bankanda bu kadar para yok!');
            }
            userProfile.bank -= amount;
            userProfile.balance += amount;
        }

        await userProfile.save();

        const successEmbed = new EmbedBuilder()
            .setColor(isDeposit ? '#2ECC71' : '#3498DB')
            .setTitle('Banka İşlemi Başarılı')
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`**${amount.toLocaleString()}** 💵 tutarında para başarıyla ${isDeposit ? 'bankaya yatırıldı' : 'bankadan çekildi'}.`)
            .addFields(
                { name: 'Yeni Cüzdan Bakiyesi', value: `> 💵 **${userProfile.balance.toLocaleString()}**`, inline: true },
                { name: 'Yeni Banka Bakiyesi', value: `> 🏦 **${userProfile.bank.toLocaleString()}**`, inline: true }
            )
            .setTimestamp();

        await message.reply({ embeds: [successEmbed] });
    },
};
