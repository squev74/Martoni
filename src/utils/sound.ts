// Pont de compatibilité vers audioManager.ts
import { audioManager } from './audioManager';

class SoundEngineBridge {
  get enabled(): boolean {
    return !audioManager.isMuted();
  }

  set enabled(val: boolean) {
    audioManager.setMuted(!val);
  }

  playPop() {
    audioManager.playSFX('question_pop');
  }

  playReveal() {
    audioManager.playSFX('correct_answer');
  }

  playPoints() {
    audioManager.playSFX('bluff_success');
  }
}

export const soundEngine = new SoundEngineBridge();
