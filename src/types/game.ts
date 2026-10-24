export type AIPersonality = 'farfelu' | 'ruse' | 'manipulateur';

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  personality?: AIPersonality;
  tagline: string;
  truthProbability: number; // e.g., 0.2, 0.6, 0.4 for AIs
  score: number;
  bluffPoints: number; // Total points earned from bluffing opponents
  truthsFound: number; // Count of times this player voted for the true answer
  bluffsSucceeded: number; // Count of opponent votes attracted
}

export interface Question {
  id: string;
  category: string;
  question: string;
  truth: string;
  correctAnswer: string;
  explanation: string;
  aiBluffs: {
    farfelu: string[];
    ruse: string[];
    manipulateur: string[];
  };
  samplePlayerSuggestions?: string[];
}

export interface RawSubmission {
  playerId: string;
  text: string;
}

export interface AnswerCard {
  id: string;
  text: string;
  normalizedText: string;
  authorIds: string[]; // Empty array if only official truth, or list of playerIds who wrote this exact text
  isTruth: boolean;
  voterIds: string[]; // Players who voted for this card in Step 5
}

export interface Vote {
  voterId: string;
  cardId: string;
}

export interface RoundScoreBreakdown {
  playerId: string;
  truthPoints: number; // +2 if voted for truth
  bluffPoints: number; // +1 per opponent who voted for a card authored by this player
  totalRoundPoints: number;
  votedForCardId: string | null;
  fooledPlayerIds: string[];
}

export type RoundStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type GamePhase = 'WELCOME' | 'PLAYING' | 'GAME_OVER';

export interface RoundHistory {
  roundNumber: number;
  question: Question;
  cards: AnswerCard[];
  votes: Vote[];
  scoreBreakdowns: RoundScoreBreakdown[];
}

export interface GameStats {
  bestBluffer: {
    player: Player;
    bluffCount: number;
  };
  bestDetector: {
    player: Player;
    truthCount: number;
  };
}

export interface EndGameBadge {
  player: string;
  badge: string;
  reason: string;
}

export interface EndGameComment {
  summary: string;
  badges: EndGameBadge[];
  source?: 'gemini' | 'fallback';
}

export interface EndGameStatsPayload {
  humanName: string;
  humanTruthsFound: number;
  humanBluffsSucceeded: number;
  topAiBlufferName: string;
  topAiBlufferCount: number;
}
