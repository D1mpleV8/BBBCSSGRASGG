const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Stock } = require('../../models/Stock');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('hisse')
        .setDescription('Hisse senedi piyasası işlemleri.')
        .addSubcommand(sub => sub.setName('piyasa').setDescription('Mevcut hisseleri ve fiyatlarını listeler.'))
        .addSubcommand(sub => sub.setName('al').setDescription('Bir şirketten hisse satın alır.')
            .addStringOption(opt => opt.setName('id').setDescription('Satın almak istediğin hissenin IDsi (Örn: FORT).').setRequired(true))
            .addIntegerOption(opt => opt.setName('adet').setDescription('Almak istediğin hisse adedi.').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('sat').setDescription('Sahip olduğun bir hisseden satarsın.')
            .addStringOption(opt => opt.setName('id').setDescription('Satmak istediğin hissenin IDsi.').setRequired(true))
            .addIntegerOption(opt => opt.setName('adet').setDescription('Satmak istediğin hisse adedi.').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('portföy').setDescription('Sahip olduğun hisseleri ve kâr/zarar durumunu gösterir.')
            .addUserOption(opt => opt.setName('kullanıcı').setDescription('Portföyünü görmek istediğin kullanıcı.'))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();

        try {
            if (subcommand === 'piyasa') {
                const stocks = await Stock.find({});
                if (stocks.length === 0) return interaction.editReply('Piyasada görüntülenecek hisse senedi yok.');

                const embed = new EmbedBuilder().setColor('#1ABC9C').setTitle('Fortune Borsa Piyasası | Anlık Fiyatlar').setTimestamp();
                stocks.forEach(stock => {
                    embed.addFields({ name: `${stock.name} (${stock.id})`, value: `> **Fiyat:** ${stock.currentPrice.toLocaleString()} 💵` });
                });
                return interaction.editReply({ embeds: [embed] });
            }

            const userProfile = await Profile.findOne({ userId: interaction.user.id });
            if (!userProfile) return interaction.editReply('İşlem yapmak için bir profilin olmalı.');

            if (subcommand === 'al') {
                const stockId = interaction.options.getString('id').toUpperCase();
                const sharesToBuy = interaction.options.getInteger('adet');

                const stock = await Stock.findOne({ id: stockId });
                if (!stock) return interaction.editReply('Bu ID ile bir hisse senedi bulunamadı.');

                const totalCost = stock.currentPrice * sharesToBuy;
                if (userProfile.balance < totalCost) return interaction.editReply(`Yeterli paran yok. Gereken: **${totalCost.toLocaleString()}** 💵`);

                userProfile.balance -= totalCost;

                const existingHolding = userProfile.portfolio.find(h => h.stockId === stockId);
                if (existingHolding) {
                    // Ortalama maliyeti yeniden hesapla
                    const newTotalShares = existingHolding.shares + sharesToBuy;
                    const newTotalCost = (existingHolding.purchasePrice * existingHolding.shares) + totalCost;
                    existingHolding.purchasePrice = newTotalCost / newTotalShares;
                    existingHolding.shares = newTotalShares;
                } else {
                    userProfile.portfolio.push({ stockId: stockId, shares: sharesToBuy, purchasePrice: stock.currentPrice });
                }

                await userProfile.save();
                return interaction.editReply(`✅ Başarıyla **${sharesToBuy}** adet **${stock.name}** hissesini, hisse başına **${stock.currentPrice.toLocaleString()}** 💵 fiyattan satın aldın.`);

            } else if (subcommand === 'sat') {
                const stockId = interaction.options.getString('id').toUpperCase();
                const sharesToSell = interaction.options.getInteger('adet');

                const holding = userProfile.portfolio.find(h => h.stockId === stockId);
                if (!holding || holding.shares < sharesToSell) return interaction.editReply(`Elinde satmak için yeterli miktarda (${sharesToSell} adet) **${stockId}** hissesi bulunmuyor.`);

                const stock = await Stock.findOne({ id: stockId });
                if (!stock) return interaction.editReply('Bu hisse artık piyasada değil? Bir hata oluştu.');

                const totalEarnings = stock.currentPrice * sharesToSell;
                userProfile.balance += totalEarnings;

                holding.shares -= sharesToSell;
                if (holding.shares === 0) {
                    userProfile.portfolio = userProfile.portfolio.filter(h => h.stockId !== stockId);
                }

                await userProfile.save();
                return interaction.editReply(`✅ Başarıyla **${sharesToSell}** adet **${stock.name}** hissesini, hisse başına **${stock.currentPrice.toLocaleString()}** 💵 fiyattan sattın.`);

            } else if (subcommand === 'portföy') {
                const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
                const targetProfile = await Profile.findOne({ userId: targetUser.id });
                if (!targetProfile || !targetProfile.portfolio.length === 0) return interaction.editReply(`**${targetUser.username}** adlı kullanıcının hiç hisse senedi yok.`);

                const embed = new EmbedBuilder().setColor('#F1C40F').setAuthor({ name: `${targetUser.username}'in Hisse Senedi Portföyü`, iconURL: targetUser.displayAvatarURL() });
                let totalPortfolioValue = 0;
                let totalInvestment = 0;

                for (const holding of targetProfile.portfolio) {
                    const stock = await Stock.findOne({ id: holding.stockId });
                    const currentValue = stock ? stock.currentPrice * holding.shares : 0;
                    const initialValue = holding.purchasePrice * holding.shares;
                    const profitLoss = currentValue - initialValue;
                    const profitLossPercent = initialValue > 0 ? (profitLoss / initialValue) * 100 : 0;

                    totalPortfolioValue += currentValue;
                    totalInvestment += initialValue;

                    embed.addFields({
                        name: `${stock ? stock.name : holding.stockId} (${holding.shares} Adet)`,
                        value: `> **Anlık Değer:** ${currentValue.toLocaleString()} 💵\n` +
                               `> **Kâr/Zarar:** ${profitLoss > 0 ? '📈' : '📉'} ${profitLoss.toLocaleString()} 💵 (${profitLossPercent.toFixed(2)}%)`
                    });
                }
                const totalProfitLoss = totalPortfolioValue - totalInvestment;
                embed.setFooter({ text: `Toplam Portföy Değeri: ${totalPortfolioValue.toLocaleString()} 💵 | Toplam K/Z: ${totalProfitLoss.toLocaleString()} 💵` });
                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error("Hisse komutunda hata:", error);
            await interaction.editReply("İşlem sırasında bir hata oluştu.");
        }
    },
};
