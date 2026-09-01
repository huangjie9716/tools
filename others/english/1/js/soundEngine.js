        // ================================================================
        //  2. 音效引擎
        // ================================================================
        class SoundEngine {
            constructor() {
                this.ctx = null;
                this.ready = false;
            }
            _init() {
                if (this.ready) return;
                try {
                    this.ctx = new(window.AudioContext || window.webkitAudioContext)();
                    this.ready = true;
                } catch (_) {}
            }
            playPop() {
                this._init();
                if (!this.ready) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(620, this.ctx.currentTime + 0.10);
                    gain.gain.setValueAtTime(0.20, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(this.ctx.currentTime);
                    osc.stop(this.ctx.currentTime + 0.12);
                } catch (_) {}
            }
            playMatch() {
                this._init();
                if (!this.ready) return;
                try {
                    const now = this.ctx.currentTime;
                    [523.25, 659.25].forEach((freq, i) => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start(now + i * 0.06);
                        osc.stop(now + 0.30);
                    });
                    const osc3 = this.ctx.createOscillator();
                    const gain3 = this.ctx.createGain();
                    osc3.type = 'sine';
                    osc3.frequency.setValueAtTime(783.99, now + 0.10);
                    gain3.gain.setValueAtTime(0.10, now + 0.10);
                    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
                    osc3.connect(gain3);
                    gain3.connect(this.ctx.destination);
                    osc3.start(now + 0.10);
                    osc3.stop(now + 0.35);
                } catch (_) {}
            }
            playVictory() {
                this._init();
                if (!this.ready) return;
                try {
                    const now = this.ctx.currentTime;
                    const melody = [
                        [523.25, 0.00],
                        [587.33, 0.12],
                        [659.25, 0.24],
                        [783.99, 0.36],
                        [1046.50, 0.52],
                        [1174.66, 0.66],
                        [1318.51, 0.80]
                    ];
                    melody.forEach(([freq, delay]) => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + delay);
                        gain.gain.setValueAtTime(0.13, now + delay);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start(now + delay);
                        osc.stop(now + delay + 0.25);
                    });
                    for (let i = 0; i < 3; i++) {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime([523.25, 659.25, 783.99][i], now + 0.10 + i * 0.08);
                        gain.gain.setValueAtTime(0.06, now + 0.10 + i * 0.08);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.50 + i * 0.06);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start(now + 0.10 + i * 0.08);
                        osc.stop(now + 0.55 + i * 0.06);
                    }
                } catch (_) {}
            }
            speakEnglish(word) {
                if (!window.speechSynthesis) return;
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1;
                window.speechSynthesis.speak(utterance);
            }
        }
