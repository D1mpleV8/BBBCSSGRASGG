const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { generateMainMenuImage, generateCategoryPageImage } = require('../../utils/helpImageGenerator');

// Kategori bilgilerini burada merkezi olarak tanımlıyoruz.
const categoryDetails = {
    ekonomi: { label: 'Ekonomi', description: 'Servetini yönet, borç al ve zenginleş.', emoji: '💵' },
    oyunlar: { label: 'Kumarhane & Oyunlar', description: 'Risk al, büyük oyna ve servetini katla.', emoji: '🎰' },
    genel: { label: 'Genel Komutlar', description: 'Profil, seviye ve yardım gibi temel komutlar.', emoji: '🌟' },
    moderasyon: { label: 'Moderasyon', description: 'Sunucu yönetimi için gerekli komutlar.', emoji: '🔨' },
    yonetim: { label: 'Yönetim', description: 'Sunucu ve bot ayarları için komutlar.', emoji: '⚙️' },
    muzik: { label: 'Müzik', description: 'Ses kanallarında müzik keyfi.', emoji: '🎶' },
    yapayzeka: { label: 'Yapay Zeka', description: 'Yapay zeka ile sohbet et, özet çıkar veya resim oluştur.', emoji: '🤖' },
    // Yeni kategoriler buraya eklenebilir
};

module.exports = {
    category: 'genel',
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Botun tüm özelliklerini gösteren dinamik yardım arayüzü.'),

    async execute(interaction) {
        // Komutları dinamik olarak kategorilere ayır
        const commandData = {};
        interaction.client.commands.forEach(cmd => {
            if (!cmd.category || !categoryDetails[cmd.category]) return;

            if (!commandData[cmd.category]) {
                commandData[cmd.category] = {
                    ...categoryDetails[cmd.category],
                    commands: []
                };
            }
            commandData[cmd.category].commands.push({
                name: cmd.data.name,
                description: cmd.data.description
            });
        });

        // --- Geri kalan kod, statik `commandData` yerine bu dinamik olanı kullandığı için aynı kalabilir ---

        const mainMenuBuffer = await generateMainMenuImage(interaction.client, commandData);
        const mainMenuAttachment = new AttachmentBuilder(mainMenuBuffer, { name: 'yardim-ana-menu.png' });
        const mainMenuEmbed = new EmbedBuilder().setColor('#080a0c').setImage('attachment://yardim-ana-menu.png');

        const categoryOptions = Object.keys(commandData).map(key => ({ label: commandData[key].label, description: commandData[key].description, value: `help_category_${key}`, emoji: commandData[key].emoji }));
        const selectMenu = new ActionRowBuilder().addComponents( new StringSelectMenuBuilder().setCustomId('help_category_select').setPlaceholder('Bir kategori seç...').addOptions(categoryOptions) );

        const helpMessage = await interaction.reply({
            embeds: [mainMenuEmbed],
            files: [mainMenuAttachment],
            components: [selectMenu],
            fetchReply: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = helpMessage.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.isButton()) {
                if (i.customId === 'help_main_menu_button') {
                    const newMainMenuBuffer = await generateMainMenuImage(interaction.client, commandData);
                    const newMainMenuAttachment = new AttachmentBuilder(newMainMenuBuffer, { name: 'yardim-ana-menu.png' });
                    await i.editReply({ embeds: [mainMenuEmbed], files: [newMainMenuAttachment], components: [selectMenu] });
                }
                return;
            }

            if (i.isStringSelectMenu()) {
                const categoryKey = i.values[0].replace('help_category_', '');
                const category = commandData[categoryKey];
                const categoryPageBuffer = await generateCategoryPageImage(category, interaction.client);
                const categoryPageAttachment = new AttachmentBuilder(categoryPageBuffer, { name: `yardim-${categoryKey}.png` });
                const categoryEmbed = new EmbedBuilder().setColor('#080a0c').setImage(`attachment://yardim-${categoryKey}.png`);
                const backButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('help_main_menu_button').setLabel('Ana Menüye Dön').setStyle(ButtonStyle.Secondary).setEmoji('🏠'));
                await i.editReply({ embeds: [categoryEmbed], files: [categoryPageAttachment], components: [selectMenu, backButton] });
            }
        });

        collector.on('end', () => {
            helpMessage.edit({ components: [] }).catch(console.error);
        });
    },
};
