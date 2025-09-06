const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    channelId: {
        type: String,
        required: true,
    },
    history: [
        {
            role: {
                type: String,
                required: true,
                enum: ['user', 'model'],
            },
            parts: [
                {
                    text: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
    ],
    lastModified: {
        type: Date,
        default: Date.now,
    },
}, {
    // Kanal ve kullanıcı başına tek bir geçmiş olmasını sağlamak için birleşik bir endeks oluşturun
    index: { unique: true, fields: { userId: 1, channelId: 1 } }
});

// Belge güncellendiğinde `lastModified` alanını otomatik olarak güncelle
chatHistorySchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});


const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;
