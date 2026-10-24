import { useState, useCallback, useMemo, useRef } from 'react';
import questionsData from '../data/questions.json';
import {
  Player,
  Question,
  AnswerCard,
  Vote,
  RoundScoreBreakdown,
  RoundStep,
  GamePhase,
  RoundHistory,
  GameStats,
  RawSubmission,
  EndGameComment,
  EndGameStatsPayload,
} from '../types/game';
import { generateAiAnswers, generateEndGameComment } from '../services/geminiService';
import {
  areAnswersSimilar,
  normalizeDisplayAnswer,
  normalizeText,
  polishFallbackUserAnswer,
} from '../utils/answerMatcher';
import {
  getQuestionBankStatus,
  getRandomQuestions,
  markQuestionAsSeen,
  resetQuestionHistory,
} from '../utils/questionManager';
import {
  audioManager,
  playSFX,
  speak,
  stopSFX,
  stopSpeech,
} from '../utils/audioManager';

export const TOTAL_ROUNDS = 4;

const INITIAL_PLAYERS_TEMPLATE = (humanName: string): Player[] => [
  {
    id: 'human',
    name: humanName.trim() || 'Vous',
    isAI: false,
    tagline: 'Stratège humain',
    truthProbability: 0,
    score: 0,
    bluffPoints: 0,
    truthsFound: 0,
    bluffsSucceeded: 0,
  },
  {
    id: 'ai-ruse',
    name: 'Le Rusé',
    isAI: true,
    personality: 'ruse',
    tagline: '60 % vote juste · Temp. ~0.35 (Hyper-crédible)',
    truthProbability: 0.6,
    score: 0,
    bluffPoints: 0,
    truthsFound: 0,
    bluffsSucceeded: 0,
  },
  {
    id: 'ai-manipulateur',
    name: 'Le Manipulateur',
    isAI: true,
    personality: 'manipulateur',
    tagline: '40 % vote juste · Temp. ~0.70 (Piège psychologique)',
    truthProbability: 0.4,
    score: 0,
    bluffPoints: 0,
    truthsFound: 0,
    bluffsSucceeded: 0,
  },
  {
    id: 'ai-farfelu',
    name: 'Le Farfelu',
    isAI: true,
    personality: 'farfelu',
    tagline: '20 % vote juste · Temp. ~0.95 (Encyclopédiste loufoque)',
    truthProbability: 0.2,
    score: 0,
    bluffPoints: 0,
    truthsFound: 0,
    bluffsSucceeded: 0,
  },
];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Étape 4 : Prépare, regroupe les réponses similaires via `areAnswersSimilar`
 * (articles, casse, accents, fautes de frappe Levenshtein <= 2) et mélange les cartes.
 * Si le joueur humain ('human') fait partie d'une carte regroupée de bluff,
 * le texte affiché donne la priorité à `userCorrected`.
 */
export function prepareAndMergeRoundCards(
  question: Question,
  userCorrected: string,
  aiResponses: { ruse: string; manipulateur: string; farfelu: string }
): AnswerCard[] {
  const officialTruth = question.truth || question.correctAnswer;
  const formattedTruth = normalizeDisplayAnswer(officialTruth);
  const formattedHuman = normalizeDisplayAnswer(userCorrected);
  const formattedRuse = normalizeDisplayAnswer(aiResponses.ruse);
  const formattedManip = normalizeDisplayAnswer(aiResponses.manipulateur);
  const formattedFarfelu = normalizeDisplayAnswer(aiResponses.farfelu);

  const mergedCards: AnswerCard[] = [
    {
      id: 'card-truth',
      text: formattedTruth,
      normalizedText: normalizeText(formattedTruth),
      authorIds: [],
      isTruth: true,
      voterIds: [],
    },
  ];

  // Le joueur humain est inséré en premier avec sa version corrigée et normalisée
  const submissions: RawSubmission[] = [
    { playerId: 'human', text: formattedHuman },
    { playerId: 'ai-ruse', text: formattedRuse },
    { playerId: 'ai-manipulateur', text: formattedManip },
    { playerId: 'ai-farfelu', text: formattedFarfelu },
  ];

  submissions.forEach((sub, idx) => {
    const existingCard = mergedCards.find((card) =>
      areAnswersSimilar(card.text, sub.text)
    );

    if (existingCard) {
      if (!existingCard.authorIds.includes(sub.playerId)) {
        existingCard.authorIds.push(sub.playerId);
      }
      // Priorité à la version `userCorrected` si le joueur fait partie d'un groupe de bluff
      if (!existingCard.isTruth && sub.playerId === 'human') {
        existingCard.text = sub.text;
        existingCard.normalizedText = normalizeText(sub.text);
      }
    } else {
      mergedCards.push({
        id: `card-${idx}-${sub.playerId}`,
        text: sub.text,
        normalizedText: normalizeText(sub.text),
        authorIds: [sub.playerId],
        isTruth: false,
        voterIds: [],
      });
    }
  });

  return shuffleArray(mergedCards);
}

export function useGameState() {
  const allQuestions = questionsData as Question[];

  const [gamePhase, setGamePhase] = useState<GamePhase>('WELCOME');
  const [humanName, setHumanName] = useState<string>('Vous');
  const [players, setPlayers] = useState<Player[]>(() => INITIAL_PLAYERS_TEMPLATE('Vous'));
  const [deck, setDeck] = useState<Question[]>(() => allQuestions.slice(0, TOTAL_ROUNDS));
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<RoundStep>(1);
  const [questionBankStatus, setQuestionBankStatus] = useState(() =>
    getQuestionBankStatus(allQuestions)
  );

  // Current round data
  const [rawHumanAnswer, setRawHumanAnswer] = useState<string>('');
  const [humanAnswer, setHumanAnswer] = useState<string>(''); // Stores userCorrected
  const [rawSubmissions, setRawSubmissions] = useState<RawSubmission[]>([]);
  const [cards, setCards] = useState<AnswerCard[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [roundScoreBreakdowns, setRoundScoreBreakdowns] = useState<RoundScoreBreakdown[]>([]);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => !audioManager.isMuted());
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiGenerationSource, setAiGenerationSource] = useState<'gemini' | 'fallback' | null>(null);

  // End-of-game commentary state
  const [endGameComment, setEndGameComment] = useState<EndGameComment | null>(null);
  const [isGeneratingEndComment, setIsGeneratingEndComment] = useState<boolean>(false);

  // Track active request ID to prevent stale async resolutions if user skips or restarts
  const generationRequestIdRef = useRef<number>(0);

  const currentQuestion: Question = useMemo(() => {
    const q = deck[currentRound - 1] || allQuestions[0];
    const officialTruth = q.truth || q.correctAnswer;
    return {
      ...q,
      truth: officialTruth,
      correctAnswer: officialTruth,
    };
  }, [deck, currentRound, allQuestions]);

  const toggleSound = useCallback(() => {
    const nowMuted = audioManager.toggleMute();
    setSoundEnabled(!nowMuted);
  }, []);

  const handleResetQuestionHistory = useCallback(() => {
    resetQuestionHistory();
    setQuestionBankStatus(getQuestionBankStatus(allQuestions));
    playSFX('question_pop');
  }, [allQuestions]);

  // Start or restart a full 4-round game using getRandomQuestions(4, allQuestions)
  const startNewGame = useCallback(
    (customName?: string) => {
      generationRequestIdRef.current += 1;
      stopSpeech();
      stopSFX();

      const finalName = (customName ?? humanName).trim() || 'Vous';
      setHumanName(finalName);
      setPlayers(INITIAL_PLAYERS_TEMPLATE(finalName));

      // Tirage sans remise via localStorage ('bluff_seen_questions')
      const newDeck = getRandomQuestions(TOTAL_ROUNDS, allQuestions);
      setDeck(newDeck);
      setQuestionBankStatus(getQuestionBankStatus(allQuestions));

      setCurrentRound(1);
      setCurrentStep(1);
      setRawHumanAnswer('');
      setHumanAnswer('');
      setRawSubmissions([]);
      setCards([]);
      setVotes([]);
      setRoundScoreBreakdowns([]);
      setHistory([]);
      setIsGeneratingAI(false);
      setAiGenerationSource(null);
      setEndGameComment(null);
      setIsGeneratingEndComment(false);
      setGamePhase('PLAYING');

      // Étape 1 & 2 : Jingle d'ouverture + lecture vocale de la question 1
      const firstQuestion = newDeck[0] || allQuestions[0];
      playSFX('question_pop');
      speak(`Manche 1. ${firstQuestion.question}`);
    },
    [allQuestions, humanName]
  );

  // Move from Step 1 (Question reading) to Step 2 (Human answer input)
  const proceedToStep2 = useCallback(() => {
    setCurrentStep(2);
  }, []);

  // Step 2 -> Step 3 (Gemini API call for userCorrected + 3 AI bluffs) -> Step 4 (Fuzzy card merging) -> Step 5 (Vote)
  const submitHumanAnswer = useCallback(
    async (rawAnswerText: string, forceDuplicateWithAI?: boolean) => {
      const trimmedRaw = rawAnswerText.trim();
      if (!trimmedRaw) return;

      const requestId = ++generationRequestIdRef.current;

      // Coupe la lecture de la question si le joueur valide rapidement
      stopSpeech();
      stopSFX();

      // S'assurer que la question courante est bien marquée comme vue dans localStorage
      markQuestionAsSeen(currentQuestion.id);
      setQuestionBankStatus(getQuestionBankStatus(allQuestions));

      setRawHumanAnswer(trimmedRaw);
      setHumanAnswer(trimmedRaw);
      setCurrentStep(3);
      setIsGeneratingAI(true);

      const officialTruth = currentQuestion.truth || currentQuestion.correctAnswer;

      // Single API call to Gemini returning { userCorrected, farfelu, ruse, manipulateur }
      const aiResult = await generateAiAnswers(
        currentQuestion.question,
        officialTruth,
        trimmedRaw
      );

      // Ignore if superseded by a skip or new game
      if (generationRequestIdRef.current !== requestId) {
        return;
      }

      const correctedHumanText = aiResult.userCorrected || polishFallbackUserAnswer(trimmedRaw);
      const manipChoice = forceDuplicateWithAI ? correctedHumanText : aiResult.manipulateur;

      const submissions: RawSubmission[] = [
        { playerId: 'human', text: correctedHumanText },
        { playerId: 'ai-ruse', text: aiResult.ruse },
        { playerId: 'ai-manipulateur', text: manipChoice },
        { playerId: 'ai-farfelu', text: aiResult.farfelu },
      ];

      setHumanAnswer(correctedHumanText);
      setRawSubmissions(submissions);
      setAiGenerationSource(aiResult.source);

      const mixedCards = prepareAndMergeRoundCards(currentQuestion, correctedHumanText, {
        ruse: aiResult.ruse,
        manipulateur: manipChoice,
        farfelu: aiResult.farfelu,
      });

      setCards(mixedCards);
      setIsGeneratingAI(false);

      // Step 4: Show shuffled cards & transition to Step 5 (Vote)
      setCurrentStep(4);

      setTimeout(() => {
        if (generationRequestIdRef.current === requestId) {
          setCurrentStep(5);
          // Étape 5 (Vote) : Joue le son de tension tick_tock en fond sonore léger
          playSFX('tick_tock');
        }
      }, 450);
    },
    [currentQuestion, allQuestions]
  );

  // Allow user to bypass wait if desired by immediately applying fallback answers
  const advanceToStep5Immediately = useCallback(() => {
    generationRequestIdRef.current += 1;
    stopSpeech();

    if (cards.length === 0) {
      const rusePool = currentQuestion.aiBluffs.ruse;
      const manipPool = currentQuestion.aiBluffs.manipulateur;
      const farfeluPool = currentQuestion.aiBluffs.farfelu;

      const corrected = polishFallbackUserAnswer(rawHumanAnswer || humanAnswer || 'Proposition mystère');
      const ruseChoice = rusePool[Math.floor(Math.random() * rusePool.length)];
      const manipChoice = manipPool[Math.floor(Math.random() * manipPool.length)];
      const farfeluChoice = farfeluPool[Math.floor(Math.random() * farfeluPool.length)];

      setHumanAnswer(corrected);
      setRawSubmissions([
        { playerId: 'human', text: corrected },
        { playerId: 'ai-ruse', text: ruseChoice },
        { playerId: 'ai-manipulateur', text: manipChoice },
        { playerId: 'ai-farfelu', text: farfeluChoice },
      ]);
      setAiGenerationSource('fallback');
      setCards(
        prepareAndMergeRoundCards(currentQuestion, corrected, {
          ruse: ruseChoice,
          manipulateur: manipChoice,
          farfelu: farfeluChoice,
        })
      );
    }

    setIsGeneratingAI(false);
    setCurrentStep(5);
    // Étape 5 (Vote) : Joue le son de tension tick_tock
    playSFX('tick_tock');
  }, [cards.length, currentQuestion, rawHumanAnswer, humanAnswer]);

  // Step 5: Human votes for a card + 3 AIs vote automatically via JS probabilities
  // Then transitions to Step 6 (Animated Reveal)
  const submitHumanVote = useCallback(
    (selectedCardId: string) => {
      const targetCard = cards.find((c) => c.id === selectedCardId);
      if (!targetCard) return;

      // Forbidden to vote for one's own answer / group
      if (targetCard.authorIds.includes('human')) {
        return;
      }

      // Étape 6 : Coupe immédiatement le son de suspense tick_tock
      stopSFX('tick_tock');
      stopSpeech();

      const roundVotes: Vote[] = [{ voterId: 'human', cardId: selectedCardId }];

      // AI Votes according to exact rules:
      // Le Rusé: 60% truth, Le Manipulateur: 40% truth, Le Farfelu: 20% truth
      const truthCard = cards.find((c) => c.isTruth);

      players
        .filter((p) => p.isAI)
        .forEach((ai) => {
          const roll = Math.random();
          const votesTruth = roll < ai.truthProbability;

          if (votesTruth && truthCard && !truthCard.authorIds.includes(ai.id)) {
            roundVotes.push({ voterId: ai.id, cardId: truthCard.id });
          } else {
            const eligibleBluffCards = cards.filter(
              (c) => !c.isTruth && !c.authorIds.includes(ai.id)
            );
            if (eligibleBluffCards.length > 0) {
              const chosen =
                eligibleBluffCards[Math.floor(Math.random() * eligibleBluffCards.length)];
              roundVotes.push({ voterId: ai.id, cardId: chosen.id });
            } else if (truthCard && !truthCard.authorIds.includes(ai.id)) {
              roundVotes.push({ voterId: ai.id, cardId: truthCard.id });
            }
          }
        });

      const updatedCards = cards.map((card) => ({
        ...card,
        voterIds: roundVotes.filter((v) => v.cardId === card.id).map((v) => v.voterId),
      }));

      const breakdowns: RoundScoreBreakdown[] = players.map((player) => {
        const playerVote = roundVotes.find((v) => v.voterId === player.id);
        const votedCard = updatedCards.find((c) => c.id === playerVote?.cardId);

        // +2 pts for finding the true answer
        const truthPoints = votedCard?.isTruth ? 2 : 0;

        // +1 pt of bluff per opponent who voted for a card authored by this player
        // If a card grouped multiple authors, each author receives +1 pt per voter on that card
        let bluffPoints = 0;
        const fooledPlayerIds: string[] = [];

        updatedCards.forEach((card) => {
          if (card.authorIds.includes(player.id)) {
            card.voterIds.forEach((voterId) => {
              if (voterId !== player.id) {
                bluffPoints += 1;
                fooledPlayerIds.push(voterId);
              }
            });
          }
        });

        return {
          playerId: player.id,
          truthPoints,
          bluffPoints,
          totalRoundPoints: truthPoints + bluffPoints,
          votedForCardId: playerVote?.cardId ?? null,
          fooledPlayerIds,
        };
      });

      setCards(updatedCards);
      setVotes(roundVotes);
      setRoundScoreBreakdowns(breakdowns);
      setCurrentStep(6);

      // Étape 6 : Joue correct_answer ou bluff_success selon la performance du joueur humain
      const humanBreakdown = breakdowns.find((b) => b.playerId === 'human');
      if (humanBreakdown && humanBreakdown.truthPoints > 0) {
        playSFX('correct_answer');
      } else if (humanBreakdown && humanBreakdown.bluffPoints > 0) {
        playSFX('bluff_success');
      } else {
        playSFX('question_pop');
      }

      // Le présentateur annonce la vérité à voix haute
      const officialTruth = currentQuestion.truth || currentQuestion.correctAnswer;
      speak(`Et la bonne réponse était... ${officialTruth}`);
    },
    [cards, players, currentQuestion]
  );

  // Move from Step 6 (Reveal) to Step 7 (Points calculation & tally)
  const proceedToStep7 = useCallback(() => {
    if (currentStep !== 6) return;

    stopSpeech();

    const updatedPlayers = players.map((player) => {
      const bd = roundScoreBreakdowns.find((b) => b.playerId === player.id);
      if (!bd) return player;
      return {
        ...player,
        score: player.score + bd.totalRoundPoints,
        bluffPoints: player.bluffPoints + bd.bluffPoints,
        truthsFound: player.truthsFound + (bd.truthPoints > 0 ? 1 : 0),
        bluffsSucceeded: player.bluffsSucceeded + bd.bluffPoints,
      };
    });

    setPlayers(updatedPlayers);

    setHistory((prev) => [
      ...prev,
      {
        roundNumber: currentRound,
        question: currentQuestion,
        cards,
        votes,
        scoreBreakdowns: roundScoreBreakdowns,
      },
    ]);

    setCurrentStep(7);

    const humanBreakdown = roundScoreBreakdowns.find((b) => b.playerId === 'human');
    if (humanBreakdown && humanBreakdown.bluffPoints > 0) {
      playSFX('bluff_success');
    } else if (humanBreakdown && humanBreakdown.truthPoints > 0) {
      playSFX('correct_answer');
    }

    if (currentRound === TOTAL_ROUNDS) {
      const requestId = ++generationRequestIdRef.current;
      const human = updatedPlayers.find((p) => !p.isAI);
      const aiPlayers = updatedPlayers.filter((p) => p.isAI);
      const topAi = [...aiPlayers].sort(
        (a, b) => b.bluffsSucceeded - a.bluffsSucceeded || b.score - a.score
      )[0];

      const statsPayload: EndGameStatsPayload = {
        humanName: human?.name ?? 'Vous',
        humanTruthsFound: human?.truthsFound ?? 0,
        humanBluffsSucceeded: human?.bluffsSucceeded ?? 0,
        topAiBlufferName: topAi?.name ?? 'Le Rusé',
        topAiBlufferCount: topAi?.bluffsSucceeded ?? 0,
      };

      setIsGeneratingEndComment(true);
      generateEndGameComment(updatedPlayers, statsPayload).then((comment) => {
        if (generationRequestIdRef.current === requestId) {
          setEndGameComment(comment);
          setIsGeneratingEndComment(false);
        }
      });
    }
  }, [currentStep, players, roundScoreBreakdowns, currentRound, currentQuestion, cards, votes]);

  // Move from Step 7 to Next Round (Step 1) or Final ScoreBoard
  const nextRoundOrFinish = useCallback(() => {
    stopSpeech();
    stopSFX();

    if (currentRound < TOTAL_ROUNDS) {
      generationRequestIdRef.current += 1;
      const nextRoundNumber = currentRound + 1;
      const nextQ = deck[nextRoundNumber - 1] || allQuestions[0];

      setCurrentRound(nextRoundNumber);
      setCurrentStep(1);
      setRawHumanAnswer('');
      setHumanAnswer('');
      setRawSubmissions([]);
      setCards([]);
      setVotes([]);
      setRoundScoreBreakdowns([]);
      setIsGeneratingAI(false);
      setAiGenerationSource(null);

      // Étape 1 & 2 : Joue question_pop et lit la nouvelle question à voix haute
      playSFX('question_pop');
      speak(`Manche ${nextRoundNumber}. ${nextQ.question}`);
    } else {
      setGamePhase('GAME_OVER');
      // Fin de partie : Joue game_over et lit le bilan généré par Gemini
      playSFX('game_over');
      if (endGameComment?.summary) {
        speak(endGameComment.summary);
      }
    }
  }, [currentRound, deck, allQuestions, endGameComment]);

  // Compute end-of-game stats (Meilleur bluffeur, Meilleur détecteur)
  const gameStats: GameStats = useMemo(() => {
    const sortedByBluff = [...players].sort(
      (a, b) => b.bluffsSucceeded - a.bluffsSucceeded || b.score - a.score
    );
    const sortedByDetector = [...players].sort(
      (a, b) => b.truthsFound - a.truthsFound || b.score - a.score
    );

    return {
      bestBluffer: {
        player: sortedByBluff[0],
        bluffCount: sortedByBluff[0]?.bluffsSucceeded ?? 0,
      },
      bestDetector: {
        player: sortedByDetector[0],
        truthCount: sortedByDetector[0]?.truthsFound ?? 0,
      },
    };
  }, [players]);

  return {
    gamePhase,
    humanName,
    setHumanName,
    players,
    currentRound,
    totalRounds: TOTAL_ROUNDS,
    currentStep,
    currentQuestion,
    questionBankStatus,
    rawHumanAnswer,
    humanAnswer,
    rawSubmissions,
    cards,
    votes,
    roundScoreBreakdowns,
    history,
    gameStats,
    soundEnabled,
    isGeneratingAI,
    aiGenerationSource,
    endGameComment,
    isGeneratingEndComment,
    toggleSound,
    handleResetQuestionHistory,
    startNewGame,
    proceedToStep2,
    submitHumanAnswer,
    advanceToStep5Immediately,
    submitHumanVote,
    proceedToStep7,
    nextRoundOrFinish,
  };
}

export type GameStateEngine = ReturnType<typeof useGameState>;
