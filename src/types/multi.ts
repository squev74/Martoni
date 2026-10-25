import { Question } from './game';

export type RoomState = 'LOBBY' | 'QUESTION' | 'VOTE' | 'REVEAL' | 'ENDED';

export interface MultiPlayer {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  isReady: boolean;
}

export interface MultiAnswerCard {
  id: string;
  text: string;
  authorId?: string;
  authorIds?: string[];
  isTruth?: boolean;
  voters?: Record<string, boolean>; // playerId -> true
}

export interface Room {
  code: string;
  hostId: string;
  state: RoomState;
  timerSeconds: number;
  aiCount: number;
  currentRound: number;
  totalRounds: number;
  players: Record<string, MultiPlayer>;
  currentQuestionIndex: number;
  questionsList?: Question[];
  question?: {
    id: string;
    category: string;
    question: string;
    truth: string;
    explanation: string;
  };
  submissions?: Record<string, string>; // playerId -> answer text
  cards?: Record<string, MultiAnswerCard>;
  votes?: Record<string, string>; // playerId -> cardId
  scoreBreakdowns?: Record<string, any>;
  createdAt: number;
}
