// Bu dosya, sadece bir Blackjack oyununun mantığını ve durumunu yönetir.

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.playerValue = 0;
        this.dealerValue = 0;
        this.gameState = 'playing';

        this.createDeck();
        this.shuffleDeck();
    }

    // Standart bir 52'lik kart destesi oluşturur.
    createDeck() {
        // --- DEĞİŞİKLİK BURADA ---
        const suits = ['♠️', '♥️', '♦️', '♣️']; // Metin yerine emojileri kullanıyoruz.
        // -------------------------
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];

        for (let i = 0; i < suits.length; i++) {
            for (let j = 0; j < ranks.length; j++) {
                this.deck.push({
                    suit: suits[i],
                    rank: ranks[j],
                    value: values[j],
                    // Display formatı aynı kalıyor, artık suit yerine emoji gösterecek.
                    display: `[${ranks[j]} ${suits[i]}]`
                });
            }
        }
    }

    // Desteyi karıştırır (Fisher-Yates algoritması).
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // Desteden bir kart çeker.
    dealCard() {
        return this.deck.pop();
    }

    // Bir elin değerini hesaplar (As'ları doğru yönetir).
    calculateHandValue(hand) {
        let value = hand.reduce((sum, card) => sum + card.value, 0);
        let aceCount = hand.filter(card => card.rank === 'A').length;

        while (value > 21 && aceCount > 0) {
            value -= 10;
            aceCount--;
        }
        return value;
    }

    // Oyunu başlatır, ilk iki kartı dağıtır.
    startGame() {
        this.playerHand.push(this.dealCard());
        this.dealerHand.push(this.dealCard());
        this.playerHand.push(this.dealCard());
        this.dealerHand.push(this.dealCard());

        this.playerValue = this.calculateHandValue(this.playerHand);
        this.dealerValue = this.calculateHandValue(this.dealerHand);

        if (this.playerValue === 21) {
            this.gameState = 'playerWin';
        }
    }

    // Oyuncu yeni bir kart çeker.
    playerHit() {
        this.playerHand.push(this.dealCard());
        this.playerValue = this.calculateHandValue(this.playerHand);

        if (this.playerValue > 21) {
            this.gameState = 'playerBust';
        }
        return this.gameState;
    }

    // Oyuncu durur, sıra kurpiyere geçer.
    dealerPlay() {
        this.dealerValue = this.calculateHandValue(this.dealerHand);

        while (this.dealerValue < 17) {
            this.dealerHand.push(this.dealCard());
            this.dealerValue = this.calculateHandValue(this.dealerHand);
        }

        if (this.dealerValue > 21) {
            this.gameState = 'dealerBust';
        } else if (this.playerValue > this.dealerValue) {
            this.gameState = 'playerWin';
        } else if (this.dealerValue > this.playerValue) {
            this.gameState = 'dealerWin';
        } else {
            this.gameState = 'push';
        }
        return this.gameState;
    }
}

module.exports = BlackjackGame;