const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { CLIENT_ID, DISCORD_TOKEN } = process.env;

if (!CLIENT_ID || !DISCORD_TOKEN) {
    console.error('Hata: CLIENT_ID veya DISCORD_TOKEN .env dosyasında bulunamadı.');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

console.log('--------------------------------');
console.log('[BİLGİ] Komut dosyaları taranıyor...');

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    console.log(`[BİLGİ] '${folder}' kategorisinde ${commandFiles.length} komut bulundu.`);

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`[BAŞARILI] ✅ ${folder}/${file} komutu kayıt listesine eklendi.`);
            } else {
                console.log(`[HATA] ❌ ${file} dosyası, 'data' veya 'execute' özelliğini dışa aktarmadığı için ATLANDI.`);
            }
        } catch (error) {
            console.log(`[KRİTİK HATA] ❌ ${file} dosyası yüklenemedi: ${error.message}`);
        }
    }
}

console.log('--------------------------------');

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[BİLGİ] ${commands.length} adet (/) komutu Discord'a kaydedilmeye başlandı.`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`[SONUÇ] ✅ ${data.length} adet (/) komutu başarıyla kaydedildi.`);
    } catch (error) {
        console.error("[KAYIT BAŞARISIZ]", error);
    }
})();
