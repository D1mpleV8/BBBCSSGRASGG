const { EmbedBuilder } = require('discord.js');

const COLORS = {
    SUCCESS: '#2ECC71',
    ERROR: '#E74C3C',
    INFO: '#3498DB',
    WARNING: '#F1C40F',
    DEFAULT: '#95A5A6',
};

/**
 * Creates a standardized success embed.
 * @param {string} description The main text of the embed.
 * @param {string} [title='✅ Başarılı'] The title of the embed.
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(description, title = '✅ Başarılı') {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(title)
        .setDescription(description);
}

/**
 * Creates a standardized error embed.
 * @param {string} description The main text of the embed.
 * @param {string} [title='❌ Hata'] The title of the embed.
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(description, title = '❌ Hata') {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(title)
        .setDescription(description);
}

/**
 * Creates a standardized informational embed.
 * @param {string} description The main text of the embed.
 * @param {string} [title='ℹ️ Bilgi'] The title of the embed.
 * @returns {EmbedBuilder}
 */
function createInfoEmbed(description, title = 'ℹ️ Bilgi') {
    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(title)
        .setDescription(description);
}

module.exports = {
    createSuccessEmbed,
    createErrorEmbed,
    createInfoEmbed,
    COLORS,
};
