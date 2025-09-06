const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

const categoryDetails = {
    ekonomi: { label: 'Ekonomi', description: 'Servetini yönet, borç al ve zenginleş.', emoji: '💵' },
    oyunlar: { label: 'Kumarhane & Oyunlar', description: 'Risk al, büyük oyna ve servetini katla.', emoji: '🎰' },
    genel: { label: 'Genel Komutlar', description: 'Profil, seviye ve yardım gibi temel komutlar.', emoji: '🌟' },
    moderasyon: { label: 'Moderasyon', description: 'Sunucu yönetimi için gerekli komutlar.', emoji: '🔨' },
    yonetim: { label: 'Yönetim', description: 'Sunucu ve bot ayarları için komutlar.', emoji: '⚙️' },
    muzik: { label: 'Müzik', description: 'Ses kanallarında müzik keyfi.', emoji: '🎶' },
    yapayzeka: { label: 'Yapay Zeka', description: 'Yapay zeka ile sohbet et, özet çıkar veya resim oluştur.', emoji: '🤖' },
};

module.exports = {
    name: 'yardim',
    description: 'Botun tüm komutlarını gösteren yardım menüsü.',
    aliases: ['help', 'y'],

    async execute(context) {
        const { message, client } = context;
        const prefix = process.env.PREFIX || '!';

        // Komutları dinamik olarak kategorilere ayır
        const commandsByCategory = new Map();
        client.commands.forEach(cmd => {
            if (!cmd.category || !categoryDetails[cmd.category]) return;
            if (!commandsByCategory.has(cmd.category)) {
                commandsByCategory.set(cmd.category, []);
            }
            commandsByCategory.get(cmd.category).push(`\`${prefix}${cmd.data?.name || cmd.name}\``);
        });

        // Ana yardım embed'ini oluştur
        const mainEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Yardım Menüsü')
            .setDescription('Tüm komut kategorilerini görmek için aşağıdaki menüyü kullanabilirsiniz.')
            .setTimestamp()
            .setFooter({ text: `${client.user.username} | Yardım Sistemi` });

        for (const [key, value] of Object.entries(categoryDetails)) {
            mainEmbed.addFields({ name: `${value.emoji} ${value.label}`, value: value.description, inline: true });
        }

        // Kategori seçimi için select menüsünü oluştur
        const categoryOptions = Object.keys(categoryDetails).map(key => ({
            label: categoryDetails[key].label,
            description: categoryDetails[key].description,
            value: key,
            emoji: categoryDetails[key].emoji,
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Bir kategori seç...')
            .addOptions(categoryOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const helpMessage = await message.reply({
            embeds: [mainEmbed],
            components: [row]
        });

        const filter = (i) => i.user.id === message.author.id;
        const collector = helpMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter,
            time: 300000, // 5 dakika
        });

        collector.on('collect', async (i) => {
            const categoryKey = i.values[0];
            const categoryInfo = categoryDetails[categoryKey];
            const commands = commandsByCategory.get(categoryKey) || [];

            const categoryEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${categoryInfo.emoji} ${categoryInfo.label} Komutları`)
                .setDescription(commands.length > 0 ? commands.join('\n') : 'Bu kategoride komut bulunmuyor.')
                .setTimestamp()
                .setFooter({ text: `${client.user.username} | Yardım Sistemi` });

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            // Zaman aşımında menüyü devre dışı bırak
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true)
            );
            helpMessage.edit({ components: [disabledRow] }).catch(console.error);
        });
    },
};
