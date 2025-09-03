const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Profile = require('../../models/Profile');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('banka')
        .setDescription('İnteraktif banka paneli.'),

    async execute(interaction) {
        await interaction.deferReply();

        let userProfile = await Profile.findOne({ userId: interaction.user.id });
        if (!userProfile) {
            userProfile = new Profile({ userId: interaction.user.id, username: interaction.user.username });
            await userProfile.save();
        }

        const createBankEmbed = (profile) => {
            return new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('🏦 Banka Paneli')
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: 'Cüzdan', value: `> 💵 **${profile.balance.toLocaleString()}**`, inline: true },
                    { name: 'Banka Kasası', value: `> 🏦 **${profile.bank.toLocaleString()}**`, inline: true }
                )
                .setFooter({ text: 'Yapmak istediğin işlemi aşağıdaki butonlarla seç.' });
        };

        const generateButtons = (isGameOver = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bank_deposit').setLabel('Para Yatır').setStyle(ButtonStyle.Success).setEmoji('💸').setDisabled(isGameOver),
                new ButtonBuilder().setCustomId('bank_withdraw').setLabel('Para Çek').setStyle(ButtonStyle.Primary).setEmoji('💰').setDisabled(isGameOver)
            );
        };

        const bankMessage = await interaction.editReply({
            embeds: [createBankEmbed(userProfile)],
            components: [generateButtons()]
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = bankMessage.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 120000 }); // 2 dakika

        collector.on('collect', async (i) => {
            const action = i.customId.split('_')[1]; // 'deposit' veya 'withdraw'

            const modal = new ModalBuilder()
                .setCustomId(`bank_modal_${action}_${i.id}`)
                .setTitle(action === 'deposit' ? 'Bankaya Para Yatır' : 'Bankadan Para Çek');

            const amountInput = new TextInputBuilder()
                .setCustomId('transaction_amount')
                .setLabel('İşlem yapmak istediğin miktar:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 5000 veya hepsi')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
            await i.showModal(modal);

            try {
                const modalSubmit = await i.awaitModalSubmit({ filter: modalI => modalI.customId === `bank_modal_${action}_${i.id}`, time: 60000 });

                // En güncel profil verisini tekrar çekiyoruz
                let freshProfile = await Profile.findOne({ userId: i.user.id });
                let amountToTransact;

                const amountInputText = modalSubmit.fields.getTextInputValue('transaction_amount').toLowerCase();

                if (amountInputText === 'hepsi') {
                    amountToTransact = action === 'deposit' ? freshProfile.balance : freshProfile.bank;
                } else {
                    amountToTransact = parseInt(amountInputText);
                }

                if (isNaN(amountToTransact) || amountToTransact <= 0) {
                    return modalSubmit.reply({ content: 'Lütfen geçerli bir miktar girin.', ephemeral: true });
                }

                if (action === 'deposit') {
                    if (freshProfile.balance < amountToTransact) return modalSubmit.reply({ content: 'Cüzdanında o kadar para yok!', ephemeral: true });
                    freshProfile.balance -= amountToTransact;
                    freshProfile.bank += amountToTransact;
                } else { // withdraw
                    if (freshProfile.bank < amountToTransact) return modalSubmit.reply({ content: 'Bankanda o kadar para yok!', ephemeral: true });
                    freshProfile.bank -= amountToTransact;
                    freshProfile.balance += amountToTransact;
                }

                await freshProfile.save();

                // Ana embed mesajını yeni bakiye ile güncelle
                await modalSubmit.update({ embeds: [createBankEmbed(freshProfile)] });

            } catch (err) {
                // Modal zaman aşımına uğradı, görmezden gel.
            }
        });

        collector.on('end', () => {
            // Zaman dolduğunda butonları devre dışı bırak
            interaction.editReply({ components: [generateButtons(true)] });
        });
    },
};
