const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, PermissionsBitField, EmbedBuilder, Partials } = require('discord.js');
require('dotenv').config();

// --- Ortam Değişkenleri ve Sabitler ---
const { DISCORD_TOKEN, PREFIX, MONGO_URI, OWNER_ID } = process.env;
const BOT_NAME = 'genesis';

// --- Veritabanı ve Yapılandırma ---
const connectDB = require('./config/database');
const badWords = require('./bad-words.json').words;
const { logAction } = require('./utils/logHelper');
const { getAiChatResponse } = require('./utils/aiHelper'); // YAPAY ZEKA YARDIMCISI

// --- Kontroller ---
if (!DISCORD_TOKEN || !MONGO_URI) {
    console.error("Hata: DISCORD_TOKEN veya MONGO_URI bulunamadı. Lütfen .env dosyanızı kontrol edin.");
    process.exit(1);
}

// --- Discord & AI Client Kurulumu ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel], // DM mesajlarını alabilmek için gerekli
});
client.commands = new Collection();
client.musicManager = require('./utils/MusicManager');

// --- Dinamik Slash Komut Yükleyici ---
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);
for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            command.category = folder; // Kategoriyi komut objesine ekle
            client.commands.set(command.data.name, command);
        }
    }
}
console.log(`[BİLGİ] ✅ ${client.commands.size} adet slash komutu belleğe yüklendi.`);

// --- Olay Yöneticileri ---
client.once('ready', () => {
    console.log(`🟢 ${client.user.tag} olarak giriş yapıldı ve operasyona hazır!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true }).catch(() => interaction.editReply({ content: 'Bu komutu çalıştırırken bir hata oluştu!' }));
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // ... (Filtreleme ve diğer pasif mantıklar buraya gelecek)

    // "Genesis" NLP Tetikleyicisi
    if (message.content.toLowerCase().includes(BOT_NAME.toLowerCase()) && !message.content.startsWith(PREFIX || '!')) {
        await message.channel.sendTyping();
        const aiResponse = await getAiChatResponse(message.channel.id, message.author.id, message.content);
        message.reply(aiResponse.message); // aiHelper'dan gelen mesajı doğrudan kullan
        return;
    }

    // 4. Prefix Komut Yöneticisi (Slash Komut Adaptörü)
    const prefix = PREFIX || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.data.aliases && cmd.data.aliases.includes(commandName));

    if (!command) return;

    // Slash komutları için sahte bir 'interaction' objesi oluştur
    const mockInteraction = {
        client: client,
        guild: message.guild,
        channel: message.channel,
        member: message.member,
        user: message.author,
        options: {
            // Argümanları slash komut seçeneklerine dönüştür
            _options: command.data.options,
            _args: args,
            getString: function(name) {
                const optIndex = this._options.findIndex(o => o.name === name && o.type === 3); // 3 = STRING
                return optIndex !== -1 ? this._args[optIndex] : null;
            },
            getInteger: function(name) {
                const optIndex = this._options.findIndex(o => o.name === name && o.type === 4); // 4 = INTEGER
                return optIndex !== -1 ? parseInt(this._args[optIndex]) : null;
            },
            getUser: function(name) {
                const optIndex = this._options.findIndex(o => o.name === name && o.type === 6); // 6 = USER
                if (optIndex === -1) return null;
                const userMention = this._args[optIndex]; // <@!id> or <@id>
                const userId = userMention?.replace(/[<@!>]/g, '');
                return client.users.cache.get(userId) || null;
            },
            getMember: function(name) {
                 const user = this.getUser(name);
                 return user ? message.guild.members.cache.get(user.id) : null;
            },
            getSubcommand: function() {
                // Bu basit adaptör alt komutları doğrudan desteklemez.
                // Komutlar buna göre ayarlanmalı veya adaptör geliştirilmelidir.
                return null;
            }
        },
        reply: async (options) => {
            return message.reply(options);
        },
        editReply: async (options) => {
            // Prefix komutlarında genellikle tek bir yanıt olur, bu yüzden yeni bir mesaj gönderiyoruz.
            return message.channel.send(options);
        },
        deferReply: async () => {
            return message.channel.sendTyping();
        },
        followUp: async (options) => {
            return message.channel.send(options);
        }
    };

    // Karmaşık buton/menü gerektiren komutları atla
    if (['tictactoe', 'rulet-baslat', 'banka', 'meslek', 'yardim', 'galeri', 'garaj'].includes(command.data.name)) {
        return message.reply(`Bu komut \`/${command.data.name}\` şeklinde sadece slash komutu olarak kullanılabilir.`);
    }

    try {
        await command.execute(mockInteraction);
    } catch (error) {
        console.error(`Prefix komut hatası (${commandName}):`, error);
        message.reply('Bu komutu çalıştırırken bir hata oluştu!');
    }
});

// --- Veritabanı Bağlantısı ve Botun Başlatılması ---
(async () => {
    await connectDB();
    client.login(DISCORD_TOKEN);
})();
