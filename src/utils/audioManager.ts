// Gestionnaire Audio & Synthèse Vocale ("Présentateur TV") pour Jeu de Bluff
// Combine Web Speech API (fr-FR) et effets sonores style "Jeu TV" (Web Audio API + support fichiers/CDN)

export type SFXName =
  | 'question_pop'
  | 'tick_tock'
  | 'correct_answer'
  | 'bluff_success'
  | 'game_over';

const MUTE_STORAGE_KEY = 'bluff_audio_muted';

// URLs de secours optionnelles (si des fichiers locaux sont ajoutés dans /public/sounds/)
const OPTIONAL_SOUND_URLS: Partial<Record<SFXName, string>> = {
  question_pop: '/sounds/question_pop.mp3',
  tick_tock: '/sounds/tick_tock.mp3',
  correct_answer: '/sounds/correct_answer.mp3',
  bluff_success: '/sounds/bluff_success.mp3',
  game_over: '/sounds/game_over.mp3',
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private tickTockIntervalId: number | null = null;
  private tickPhase: number = 0;

  constructor() {
    this.muted = this.loadMuteFromStorage();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private loadMuteFromStorage(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private saveMuteToStorage(muted: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    } catch {
      // Ignore storage errors
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.saveMuteToStorage(muted);
    if (muted) {
      this.stopSpeech();
      this.stopAllSFX();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Sélectionne la meilleure voix française disponible ("Google français", voix naturelles, etc.)
   */
  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    const frenchVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('fr-fr') ||
        v.lang.toLowerCase().startsWith('fr')
    );

    if (frenchVoices.length === 0) return;

    // Priorité 1 : Voix "Google français" ou "Natural" en fr-FR
    const bestMatch =
      frenchVoices.find((v) => /google.*fran/i.test(v.name)) ||
      frenchVoices.find((v) => /natural|neural|premium/i.test(v.name)) ||
      frenchVoices.find((v) => /thomas|amelie|amélie|paul|julie|denise|henri/i.test(v.name)) ||
      frenchVoices.find((v) => v.lang.toLowerCase() === 'fr-fr') ||
      frenchVoices[0];

    this.preferredVoice = bestMatch || null;
  }

  /**
   * 1. Synthèse vocale : Fait parler le présentateur virtuel en français (fr-FR)
   * Pitch = 1.0, Rate = 1.05 pour un rythme dynamique de jeu télé.
   */
  public speak(text: string): void {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    try {
      this.stopSpeech();

      if (!this.preferredVoice) {
        this.initVoices();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.pitch = 1.0;
      utterance.rate = 1.05;
      utterance.volume = 1.0;

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore Web Speech API errors on unsupported browsers
    }
  }

  /**
   * Coupe immédiatement la synthèse vocale si le joueur passe rapidement à l'étape suivante.
   */
  public stopSpeech(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * 2. Gestionnaire de Bruitages style "Jeu TV"
   */
  public playSFX(soundName: SFXName): void {
    if (this.muted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    switch (soundName) {
      case 'question_pop':
        this.playQuestionPopJingle(ctx);
        break;
      case 'tick_tock':
        this.startTickTockLoop();
        break;
      case 'correct_answer':
        this.playCorrectAnswerFanfare(ctx);
        break;
      case 'bluff_success':
        this.playBluffSuccessSound(ctx);
        break;
      case 'game_over':
        this.playGameOverFanfare(ctx);
        break;
    }
  }

  public stopSFX(soundName?: SFXName): void {
    if (!soundName || soundName === 'tick_tock') {
      if (this.tickTockIntervalId !== null && typeof window !== 'undefined') {
        window.clearInterval(this.tickTockIntervalId);
        this.tickTockIntervalId = null;
      }
    }
  }

  public stopAllSFX(): void {
    this.stopSFX('tick_tock');
  }

  /**
   * `question_pop` : Petit jingle joyeux d'ouverture de manche (arpège montant lumineux)
   */
  private playQuestionPopJingle(ctx: AudioContext): void {
    try {
      const notes = [440, 554.37, 659.25, 880]; // A4 - C#5 - E5 - A5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + i * 0.065;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * `tick_tock` : Tension/suspense en fond sonore léger pendant la phase de vote
   */
  private startTickTockLoop(): void {
    this.stopSFX('tick_tock');
    if (this.muted || typeof window === 'undefined') return;

    this.tickPhase = 0;
    this.playSingleTick();

    this.tickTockIntervalId = window.setInterval(() => {
      if (this.muted) {
        this.stopSFX('tick_tock');
        return;
      }
      this.playSingleTick();
    }, 650);
  }

  private playSingleTick(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const isTick = this.tickPhase % 2 === 0;
      this.tickPhase += 1;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const freq = isTick ? 820 : 620;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + 0.045);

      gain.gain.setValueAtTime(0.032, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignore
    }
  }

  /**
   * `correct_answer` : Son de victoire / bonne réponse trouvée (+2 pts)
   */
  private playCorrectAnswerFanfare(ctx: AudioContext): void {
    try {
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + idx * 0.075;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.095, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.32);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * `bluff_success` : Bruitage malicieux / applaudissements stylisés quand une IA tombe dans le piège (+1 pt)
   */
  private playBluffSuccessSound(ctx: AudioContext): void {
    try {
      // Petit trait chromatique malicieux suivi d'un accord brillant
      const notes = [392.0, 440.0, 466.16, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const start = ctx.currentTime + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.055, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * `game_over` : Grande fanfare télévisée de fin de partie
   */
  private playGameOverFanfare(ctx: AudioContext): void {
    try {
      const sequence = [
        { freq: 523.25, delay: 0.0, duration: 0.16 },
        { freq: 659.25, delay: 0.14, duration: 0.16 },
        { freq: 783.99, delay: 0.28, duration: 0.16 },
        { freq: 1046.5, delay: 0.44, duration: 0.5 },
      ];
      sequence.forEach((item) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + item.delay;
        osc.frequency.setValueAtTime(item.freq, start);
        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + item.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + item.duration);
      });
    } catch {
      // Ignore
    }
  }

  public getOptionalSoundUrl(soundName: SFXName): string | undefined {
    return OPTIONAL_SOUND_URLS[soundName];
  }
}

export const audioManager = new AudioManager();

export const speak = (text: string) => audioManager.speak(text);
export const stopSpeech = () => audioManager.stopSpeech();
export const playSFX = (soundName: SFXName) => audioManager.playSFX(soundName);
export const stopSFX = (soundName?: SFXName) => audioManager.stopSFX(soundName);
