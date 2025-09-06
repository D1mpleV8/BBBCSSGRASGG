const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

// --- Ortam Değişkenleri ve Sabitler ---
const { DISCORD_TOKEN, PREFIX, MONGO_URI } = process.env;
const BOT_NAME = 'genesis';

// --- Veritabanı ve Yapılandırma ---
const connectDB = require('./config/database');
const { getAiChatResponse } = require('./utils/aiHelper');

// --- Kontroller ---
if (!DISCORD_TOKEN || !MONGO_URI) {
    console.error("Hata: DISCORD_TOKEN veya MONGO_URI bulunamadı. Lütfen .env dosyanızı kontrol edin.");
    process.exit(1);
}

// --- Discord Client Kurulumu ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates, // Müzik komutları için gerekli
    ],
    partials: [Partials.Channel],
});
client.commands = new Collection();
client.musicManager = require('./utils/MusicManager');

// --- Dinamik Komut Yükleyici ---
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);
for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        // Hem slash komutlarından (data.name) hem de prefix komutlarından (name) gelen ismi destekle
        const commandName = command.data ? command.data.name : command.name;
        if (commandName && command.execute) {
            command.category = folder;
            client.commands.set(commandName, command);
        }
    }
}
console.log(`[BİLGİ] ✅ ${client.commands.size} adet komut belleğe yüklendi.`);

// --- Olay Yöneticileri ---
client.once('clientReady', () => { // Deprecation fix: 'ready' -> 'clientReady'
    console.log(`🟢 ${client.user.tag} olarak giriş yapıldı ve operasyona hazır!`);
    client.user.setActivity(`${PREFIX}yardim`, { type: 'WATCHING' });
});

// Prefix-only komut yöneticisi
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // "Genesis" NLP Tetikleyicisi
    const prefix = PREFIX || '!';
    if (message.content.toLowerCase().includes(BOT_NAME.toLowerCase()) && !message.content.startsWith(prefix)) {
        await message.channel.sendTyping();
        const aiResponse = await getAiChatResponse(message.channel.id, message.author.id, message.content);
        if (aiResponse.success) {
            message.reply(aiResponse.message);
        }
        return; // NLP tetiklendiyse komut işlemini durdur
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    // Komutları çalıştırmak için bir 'context' objesi oluşturuyoruz.
    // Bu, hem mesaj (message) hem de argümanları (args) içerir.
    // Komut dosyaları bu context objesini kullanarak çalışacak şekilde düzenlenmelidir.
    const context = {
        client: client,
        message: message,
        args: args,
    };

    try {
        // Komutun execute fonksiyonuna context objesini gönder
        await command.execute(context);
    } catch (error) {
        console.error(`Komut hatası (${commandName}):`, error);
        message.reply('Bu komutu çalıştırırken bir hata oluştu!');
    }
});

// --- Veritabanı Bağlantısı ve Botun Başlatılması ---
(async () => {
    await connectDB();
    client.login(DISCORD_TOKEN);
})();
