const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'tictactoe',
    description: 'Bir arkadaşınla Tic-Tac-Toe oyna.',
    aliases: ['ttt', 'xox'],
    async execute(context) {
        const { message } = context;

        const challenger = message.member;
        const opponent = message.mentions.members.first();

        if (!opponent) {
            return message.reply('Lütfen oynamak istediğin kişiyi etiketle. Örn: `!ttt @kullanici`');
        }
        if (opponent.id === challenger.id) {
            return message.reply('Kendinle oynayamazsın!');
        }
        if (opponent.user.bot) {
            return message.reply('Botlarla oynayamazsın!');
        }

        const game = {
            players: [challenger, opponent],
            board: Array(9).fill(null),
            turn: 0, // 0 for challenger (X), 1 for opponent (O)
            symbols: ['❌', '⭕'],
        };

        const generateComponents = (isGameOver = false) => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const index = i * 3 + j;
                    const button = new ButtonBuilder()
                        .setCustomId(`ttt_${index}`)
                        .setLabel(game.board[index] || '‎ ') // Invisible character
                        .setStyle(game.board[index] ? (game.board[index] === 'X' ? ButtonStyle.Danger : ButtonStyle.Primary) : ButtonStyle.Secondary)
                        .setDisabled(game.board[index] !== null || isGameOver);
                    row.addComponents(button);
                }
                rows.push(row);
            }
            return rows;
        };

        const generateEmbed = (winnerText) => {
            let description = winnerText
                ? `**Oyun Bitti!**\n${winnerText}`
                : `Sıradaki oyuncu: ${game.players[game.turn]} (${game.symbols[game.turn]})`;

            return new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('Tic-Tac-Toe')
                .setDescription(description)
                .addFields(
                    { name: `Oyuncu 1 (${game.symbols[0]})`, value: challenger.displayName, inline: true },
                    { name: `Oyuncu 2 (${game.symbols[1]})`, value: opponent.displayName, inline: true }
                );
        };

        const checkWin = () => {
            const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
            for (const line of lines) {
                const [a, b, c] = line;
                if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
                    return game.board[a]; // 'X' or 'O'
                }
            }
            if (game.board.every(cell => cell !== null)) return 'tie';
            return null;
        };

        const gameMessage = await message.reply({ embeds: [generateEmbed()], components: generateComponents() });

        const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on('collect', async i => {
            // Sadece oyundaki oyuncuların butonları kullanabilmesini sağla
            if (i.user.id !== game.players[0].id && i.user.id !== game.players[1].id) {
                 const reply = await i.reply({ content: 'Bu oyuna dahil değilsin!' });
                 setTimeout(() => reply.delete().catch(() => {}), 5000);
                 return;
            }
            if (i.user.id !== game.players[game.turn].id) {
                const reply = await i.reply({ content: 'Sıra sende değil!' });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }

            const index = parseInt(i.customId.split('_')[1]);
            game.board[index] = game.turn === 0 ? 'X' : 'O';

            const winner = checkWin();
            if (winner) {
                collector.stop();
                const winnerText = winner === 'tie' ? 'Oyun berabere bitti!' : `${game.players[game.turn]} kazandı!`;
                await i.update({ embeds: [generateEmbed(winnerText)], components: generateComponents(true) });
            } else {
                game.turn = 1 - game.turn; // Switch turns
                await i.update({ embeds: [generateEmbed()], components: generateComponents() });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                gameMessage.edit({ content: 'Oyun zaman aşımına uğradı.', components: generateComponents(true) });
            }
        });
    },
};
