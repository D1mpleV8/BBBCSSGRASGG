const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Profile = require('../../models/Profile');
const BlackjackGame = require('../../utils/BlackjackGame');

module.exports = {
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('İnteraktif Blackjack oynarsınız.')
        .addIntegerOption(option =>
            option.setName('bahis')
                .setDescription('Oynamak istediğiniz miktar.')
                .setRequired(true)
                .setMinValue(10)), // Minimum bahis

    async execute(interaction) {
        const betAmount = interaction.options.getInteger('bahis');
        const userProfile = await Profile.findOne({ userId: interaction.user.id });

        if (!userProfile) return interaction.reply({ content: 'Oynamak için bir profilin olmalı. `/profil`', ephemeral: true });
        if (userProfile.balance < betAmount) return interaction.reply({ content: `Bu bahsi oynamak için cüzdanında yeterli para yok.`, ephemeral: true });

        await interaction.deferReply();
        userProfile.balance -= betAmount;
        await userProfile.save();

        const game = new BlackjackGame();
        game.startGame();

        const createGameEmbed = (game, isGameOver = false, resultText = '') => {
            const playerHandString = game.playerHand.map(card => card.display).join(' ');
            const dealerHandString = isGameOver ? game.dealerHand.map(card => card.display).join(' ') : `${game.dealerHand[0].display} [❓]`;
            const dealerValue = isGameOver ? game.dealerValue : game.dealerHand[0].value;

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`Blackjack Masası - Bahis: ${betAmount.toLocaleString()} 💵`)
                .addFields(
                    { name: `Kurpiyerin Eli (${dealerValue})`, value: `> ${dealerHandString}` },
                    { name: `${interaction.user.username}'in Eli (${game.playerValue})`, value: `> ${playerHandString}` }
                );
            if(isGameOver) embed.addFields({ name: 'Oyun Sonucu', value: `**${resultText}**` });
            return embed;
        };

        const generateButtons = (isGameOver = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bj_hit').setLabel('Kart Çek').setStyle(ButtonStyle.Success).setEmoji('🃏').setDisabled(isGameOver),
                new ButtonBuilder().setCustomId('bj_stand').setLabel('Dur').setStyle(ButtonStyle.Danger).setEmoji('🛑').setDisabled(isGameOver)
            );
        };

        const gameMessage = await interaction.editReply({
            embeds: [createGameEmbed(game)],
            components: [generateButtons()]
        });

        const endGame = async (result) => {
            let resultText, winnings = 0;
            switch (result) {
                case 'blackjack': winnings = Math.floor(betAmount * 2.5); resultText = `Blackjack! Kazandın!`; break;
                case 'playerWin': case 'dealerBust': winnings = betAmount * 2; resultText = `Kazandın!`; break;
                case 'dealerWin': resultText = `Kurpiyer kazandı.`; break;
                case 'playerBust': resultText = `Battın! Elin 21'i geçti.`; break;
                case 'push': winnings = betAmount; resultText = 'Berabere! Bahsin iade edildi.'; break;
            }

            if (winnings > 0) {
                await Profile.updateOne({ userId: interaction.user.id }, { $inc: { balance: winnings } });
                resultText += ` **+${winnings.toLocaleString()}** 💵`;
            }
            const finalEmbed = createGameEmbed(game, true, resultText);
            await interaction.editReply({ embeds: [finalEmbed], components: [generateButtons(true)] });
        };

        if (game.gameState === 'playerWin') return endGame('blackjack');

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = gameMessage.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (i) => {
            await i.deferUpdate();
            let gameState;
            if (i.customId === 'bj_hit') {
                gameState = game.playerHit();
                if (gameState === 'playerBust') return collector.stop();
                if (game.playerValue === 21) return collector.stop(); // Otomatik dur
                await interaction.editReply({ embeds: [createGameEmbed(game)], components: [generateButtons()] });
            } else if (i.customId === 'bj_stand') {
                collector.stop();
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'user' || reason === 'limit') { // Stand veya 21'e ulaşıldı
                const finalState = game.dealerPlay();
                endGame(finalState);
            } else if (reason === 'time') {
                interaction.editReply({ content: 'Süren dolduğu için bahsini kaybettin.', embeds: [], components: [] });
            } else { // Oyuncu battı
                endGame('playerBust');
            }
        });
    },
};
