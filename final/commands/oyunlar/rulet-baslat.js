const Profile = require('../../models/Profile');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { generateRouletteImage } = require('../../utils/rouletteImageGenerator');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const activeGames = new Map();

const ROULETTE_NUMBERS_MAP = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
    11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
    21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};
const COLOR_EMOJIS = { red: '🔴', black: '⚫', green: '🟢' };

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
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('rulet-baslat')
        .setDescription('Çok oyunculu, resimli bir rulet turu başlatır.'),
    async execute(interaction) {
        if (activeGames.has(interaction.channel.id)) {
            return interaction.reply({ content: 'Bu kanalda zaten devam eden bir rulet turu var!', ephemeral: true });
        }

        const gameDuration = 60000;
        const endTime = Date.now() + gameDuration;

        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('🎡 Rulet Masası Açıldı! 🎡').setDescription(`Bahisler açıldı! Tur <t:${Math.floor(endTime / 1000)}:R> sona erecek.`).addFields({ name: 'Yapılan Bahisler', value: 'Henüz bahis yapılmadı.' }).setThumbnail('https://i.imgur.com/8db1pA8.png');
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('roulette_bet_red').setLabel('Kırmızı').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('roulette_bet_black').setLabel('Siyah').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('roulette_bet_green').setLabel('Yeşil (14x)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('roulette_bet_number').setLabel('Sayı Seç (35x)').setStyle(ButtonStyle.Primary)
        );

        const gameMessage = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });
        const gameData = { bets: [], message: gameMessage };
        activeGames.set(interaction.channel.id, gameData);

        const collector = gameMessage.createMessageComponentCollector({ time: gameDuration });

        collector.on('collect', async i => {
            if (!i.isButton()) return;

            const betTypeRaw = i.customId.split('_')[2];
            let betType, betTitle;
            switch(betTypeRaw) {
                case 'red': case 'black': case 'green': betType = 'color'; betTitle = `${betTypeRaw.charAt(0).toUpperCase() + betTypeRaw.slice(1)} Rengi`; break;
                case 'number': betType = 'number'; betTitle = 'Sayı Bahsi'; break;
            }

            const modal = new ModalBuilder().setCustomId(`roulette_modal_${i.id}`).setTitle(betTitle);
            const amountInput = new TextInputBuilder().setCustomId('bet_amount').setLabel('Ne kadar bahis yapmak istersin?').setStyle(TextInputStyle.Short).setRequired(true);

            if (betType === 'number') {
                const numberInput = new TextInputBuilder().setCustomId('bet_number').setLabel('Hangi sayıya? (0-36)').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(numberInput), new ActionRowBuilder().addComponents(amountInput));
            } else {
                modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
            }

            await i.showModal(modal);

            try {
                const modalSubmit = await i.awaitModalSubmit({ filter: modalI => modalI.customId === `roulette_modal_${i.id}` && modalI.user.id === i.user.id, time: 60000 });
                const betAmount = parseInt(modalSubmit.fields.getTextInputValue('bet_amount'));
                let betOption = (betType === 'number') ? modalSubmit.fields.getTextInputValue('bet_number') : betTypeRaw;

                const userProfile = await Profile.findOne({ userId: i.user.id });
                if (!userProfile || isNaN(betAmount) || betAmount <= 0 || userProfile.balance < betAmount) return modalSubmit.reply({ content: 'Geçersiz bahis veya yetersiz bakiye.', flags: [MessageFlags.Ephemeral] });
                if (betType === 'number' && (isNaN(parseInt(betOption)) || parseInt(betOption) < 0 || parseInt(betOption) > 36)) return modalSubmit.reply({ content: 'Lütfen 0-36 arası geçerli bir sayı gir.', flags: [MessageFlags.Ephemeral] });

                userProfile.balance -= betAmount;
                await userProfile.save();

                gameData.bets.push({ userId: i.user.id, username: i.user.username, amount: betAmount, type: betType, option: betOption });
                const updatedEmbed = EmbedBuilder.from(gameMessage.embeds[0]).setFields({ name: 'Yapılan Bahisler', value: formatBets(gameData.bets) });
                await gameMessage.edit({ embeds: [updatedEmbed] });
                await modalSubmit.reply({ content: `✅ Bahsin kabul edildi!`, flags: [MessageFlags.Ephemeral] });
            } catch (err) {}
        });

        collector.on('end', async () => {
            const processingEmbed = EmbedBuilder.from(gameMessage.embeds[0]).setColor('#F1C40F').setFields({ name: 'Yapılan Bahisler', value: formatBets(gameData.bets) }).setDescription('Bahisler kapandı! Çark dönüyor...');
            await gameMessage.edit({ embeds: [processingEmbed], components: [] });
            await delay(2000);

            const winningNumber = Math.floor(Math.random() * 37);
            const imageBuffer = await generateRouletteImage(winningNumber);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'rulet-sonuc.png' });
            const winningColorName = ROULETTE_NUMBERS_MAP[winningNumber];
            const winners = [];
            const updatePromises = [];

            for (const bet of gameData.bets) {
                let hasWon = false, payoutRatio = 0;
                if ((bet.type === 'color' && bet.option === winningColorName) || (bet.type === 'number' && parseInt(bet.option) === winningNumber)) {
                    hasWon = true;
                    if(bet.type === 'color') payoutRatio = bet.option === 'green' ? 14 : 2;
                    if(bet.type === 'number') payoutRatio = 35;
                }

                if (hasWon) {
                    const winnings = bet.amount * payoutRatio;
                    winners.push(`> **${bet.username}**, ${winnings.toLocaleString()} 💵 kazandı!`);
                    updatePromises.push(Profile.findOneAndUpdate({ userId: bet.userId }, { $inc: { balance: winnings } }));
                }
            }

            if (updatePromises.length > 0) await Promise.all(updatePromises);

            const finalEmbed = new EmbedBuilder().setColor(winningColorName === 'green' ? '#2ECC71' : (winningColorName === 'red' ? '#E74C3C' : '#95A5A6')).setTitle('🎡 Rulet Sonucu 🎡').setDescription(`Top **${COLOR_EMOJIS[winningColorName]} ${winningNumber}** sayısında durdu!`).setImage('attachment://rulet-sonuc.png').addFields({ name: 'Kazananlar', value: winners.length > 0 ? winners.join('\n') : 'Bu tur kimse kazanamadı.' });
            await gameMessage.edit({ embeds: [finalEmbed], files: [attachment] });
            activeGames.delete(interaction.channel.id);
        });
    },
};
