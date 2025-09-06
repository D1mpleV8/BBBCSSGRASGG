const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Bir arkadaşınla Tic-Tac-Toe oyna.')
        .addUserOption(option =>
            option.setName('rakip')
                .setDescription('Oynamak istediğin kişi.')
                .setRequired(true)),
    async execute(interaction) {
        const opponent = interaction.options.getMember('rakip');
        const challenger = interaction.member;

        if (opponent.id === challenger.id) {
            return interaction.reply({ content: 'Kendinle oynayamazsın!', ephemeral: true });
        }
        if (opponent.user.bot) {
            return interaction.reply({ content: 'Botlarla oynayamazsın!', ephemeral: true });
        }

        const game = {
            players: [challenger, opponent],
            board: Array(9).fill(null),
            turn: 0, // 0 for challenger (X), 1 for opponent (O)
            symbols: ['❌', '⭕'],
        };

        const generateComponents = () => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const index = i * 3 + j;
                    const button = new ButtonBuilder()
                        .setCustomId(`ttt_${index}`)
                        .setLabel(game.board[index] || '‎ ') // Invisible character
                        .setStyle(game.board[index] ? (game.board[index] === 'X' ? ButtonStyle.Danger : ButtonStyle.Primary) : ButtonStyle.Secondary)
                        .setDisabled(game.board[index] !== null);
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
                    { name: 'Oyuncu 1 (❌)', value: challenger.displayName, inline: true },
                    { name: 'Oyuncu 2 (⭕)', value: opponent.displayName, inline: true }
                );
        };

        const checkWin = () => {
            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for (const line of lines) {
                const [a, b, c] = line;
                if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
                    return game.board[a]; // 'X' or 'O'
                }
            }
            if (game.board.every(cell => cell !== null)) return 'tie';
            return null;
        };

        await interaction.reply({ embeds: [generateEmbed()], components: generateComponents() });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== game.players[game.turn].id) {
                return i.reply({ content: 'Sıra sende değil!', ephemeral: true });
            }

            const index = parseInt(i.customId.split('_')[1]);
            game.board[index] = game.turn === 0 ? 'X' : 'O';

            const winner = checkWin();
            if (winner) {
                collector.stop();
                const winnerText = winner === 'tie' ? 'Oyun berabere bitti!' : `${game.players[game.turn]} kazandı!`;
                await i.update({ embeds: [generateEmbed(winnerText)], components: [] });
            } else {
                game.turn = 1 - game.turn; // Switch turns
                await i.update({ embeds: [generateEmbed()], components: generateComponents() });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                message.edit({ content: 'Oyun zaman aşımına uğradı.', components: [] });
            }
        });
    },
};
