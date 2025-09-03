const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { CLIENT_ID, DISCORD_TOKEN } = process.env;

if (!CLIENT_ID || !DISCORD_TOKEN) {
    console.error('[HATA] ❌ CLIENT_ID veya DISCORD_TOKEN .env dosyasında bulunamadı. Lütfen .env dosyanızı kontrol edin.');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

try {
    const commandFolders = fs.readdirSync(commandsPath);

    console.log('--------------------------------');
    console.log('[BİLGİ] Komut dosyaları taranıyor...');

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        console.log(`[BİLGİ] -> '${folder}' kategorisinde ${commandFiles.length} komut bulundu.`);

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                    // Detaylı loglamayı isteğe bağlı tutabiliriz veya kaldırabiliriz. Şimdilik kalsın.
                    // console.log(`[BAŞARILI] ✅ ${folder}/${file} komutu kayıt listesine eklendi.`);
                } else {
                    console.warn(`[UYARI] ⚠️  ${filePath} dosyası, 'data' veya 'execute' özelliğini dışa aktarmadığı için ATLANDI.`);
                }
            } catch (error) {
                console.error(`[HATA] ❌ ${filePath} dosyası yüklenemedi: ${error.message}`);
            }
        }
    }

    console.log('--------------------------------');

    if (commands.length === 0) {
        console.error('[HATA] ❌ Kaydedilecek komut bulunamadı. Komut dosyalarınızın yapısını ve yollarını kontrol edin.');
        process.exit(1);
    }

    console.log(`[BİLGİ] Toplam ${commands.length} komut Discord API'sine kaydedilmek üzere hazırlandı.`);
    console.log('[BİLGİ] Kaydedilecek komutların listesi:');
    commands.forEach(c => console.log(`  - /${c.name}`));
    console.log('--------------------------------');


    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    (async () => {
        try {
            console.log(`[BİLGİ] ${commands.length} adet (/) komutu Discord'a gönderiliyor...`);

            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );

            console.log(`[SONUÇ] ✅ ${data.length} adet (/) komutu başarıyla kaydedildi.`);
            console.log('[BİLGİ] Değişikliklerin Discord sunucularında görünmesi birkaç dakika sürebilir.');
        } catch (error) {
            console.error("[KAYIT BAŞARISIZ]", error);
        }
    })();

} catch (error) {
    console.error('[KRİTİK HATA] ❌ Komutlar okunurken genel bir hata oluştu:', error);
}
