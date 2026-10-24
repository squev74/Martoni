import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/services/firebase';
import { Room, MultiAnswerCard, MultiPlayer } from '@/src/types/multi';
import questionsData from '@/src/data/questions.json';
import { Question } from '@/src/types/game';
import { generateAiAnswers } from '@/src/services/geminiService';
import { areAnswersSimilar, normalizeDisplayAnswer } from '@/src/utils/answerMatcher';
import { audioManager } from '@/src/utils/audioManager';

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function useMultiGameState(roomCode: string, playerId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const timerRef = useRef<number | null>(null);

  const allQuestions = questionsData as Question[];

  // Subscribe to room
  useEffect(() => {
    if (!roomCode) return;
    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', cleanCode);

    const unsubscribe = onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Room;
          setRoom(data);
          setLoading(false);
        } else {
          setRoom(null);
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, [roomCode]);

  // Timer effect based on room state & timerSeconds
  useEffect(() => {
    if (!room) return;
    setTimeLeft(room.timerSeconds || 60);

    if (timerRef.current) clearInterval(timerRef.current);

    if (room.state === 'QUESTION' || room.state === 'VOTE') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.state, room?.currentRound]);

  const isHost = room?.hostId === playerId;

  // Host action: start round question if state is QUESTION and no question set
  useEffect(() => {
    if (!room || !isHost) return;
    if (room.state === 'QUESTION' && !room.question) {
      const qIndex = room.currentQuestionIndex || 0;
      const q = allQuestions[qIndex % allQuestions.length];
      const officialTruth = q.truth || q.correctAnswer;

      const questionPayload = {
        id: q.id || `q_${qIndex}`,
        category: q.category || 'Général',
        question: q.question,
        truth: officialTruth,
        explanation: q.explanation || 'Explication officielle non disponible.',
      };

      const roomRef = doc(db, 'rooms', room.code);
      updateDoc(roomRef, {
        question: questionPayload,
        submissions: {},
        cards: {},
        votes: {},
        scoreBreakdowns: {},
      }).catch(() => {});
    }
  }, [room?.state, isHost, room?.currentQuestionIndex]);

  // Submit player answer (Step 2)
  const submitAnswer = useCallback(async (text: string) => {
    if (!room || !text.trim()) return;
    const cleanCode = room.code;
    const roomRef = doc(db, 'rooms', cleanCode);
    try {
      await updateDoc(roomRef, {
        [`submissions.${playerId}`]: text.trim(),
      });
    } catch {
      const updated = { ...room };
      if (!updated.submissions) updated.submissions = {};
      updated.submissions[playerId] = text.trim();
      await setDoc(roomRef, updated);
    }
    audioManager.playSFX('question_pop');
  }, [room, playerId]);

  // Check if all humans submitted or timer expired -> Host generates cards & switches to VOTE
  useEffect(() => {
    if (!room || !isHost || room.state !== 'QUESTION' || !room.question) return;

    const playersList = Object.values(room.players || {});
    const humanPlayers = playersList.filter((p) => !p.id.startsWith('ai_'));
    const submissions = room.submissions || {};
    const allSubmitted = humanPlayers.every((hp) => submissions[hp.id] !== undefined);

    if (allSubmitted || timeLeft === 0) {
      const processSubmissionsAndAdvance = async () => {
        const q = room.question!;
        const officialTruth = q.truth;
        const formattedTruth = normalizeDisplayAnswer(officialTruth);

        const mergedCards: Record<string, MultiAnswerCard> = {};
        const truthCardId = 'card-truth';
        mergedCards[truthCardId] = {
          id: truthCardId,
          text: formattedTruth,
          isTruth: true,
          authorIds: [],
        };

        for (const hp of humanPlayers) {
          const rawAns = submissions[hp.id] || 'Proposition mystère';
          const aiRes = await generateAiAnswers(q.question, officialTruth, rawAns);
          const correctedText = normalizeDisplayAnswer(aiRes.userCorrected);

          let matchedCardKey: string | null = null;
          for (const [key, card] of Object.entries(mergedCards)) {
            if (areAnswersSimilar(card.text, correctedText)) {
              matchedCardKey = key;
              break;
            }
          }

          if (matchedCardKey) {
            const card = mergedCards[matchedCardKey];
            if (!card.authorIds) card.authorIds = [];
            if (!card.authorIds.includes(hp.id)) card.authorIds.push(hp.id);
            if (!card.isTruth && hp.id === playerId) {
              card.text = correctedText;
            }
          } else {
            const newKey = `card_hum_${hp.id}`;
            mergedCards[newKey] = {
              id: newKey,
              text: correctedText,
              authorIds: [hp.id],
              isTruth: false,
            };
          }
        }

        const aiCount = room.aiCount ?? 3;
        const sampleAiResponses = await generateAiAnswers(q.question, officialTruth, 'Exemple');
        const aiPersonas = [
          { id: 'ai-ruse', text: sampleAiResponses.ruse },
          { id: 'ai-manipulateur', text: sampleAiResponses.manipulateur },
          { id: 'ai-farfelu', text: sampleAiResponses.farfelu },
        ];

        for (let i = 0; i < Math.min(aiCount, aiPersonas.length); i++) {
          const ai = aiPersonas[i];
          const correctedAiText = normalizeDisplayAnswer(ai.text);

          let matchedCardKey: string | null = null;
          for (const [key, card] of Object.entries(mergedCards)) {
            if (areAnswersSimilar(card.text, correctedAiText)) {
              matchedCardKey = key;
              break;
            }
          }

          if (matchedCardKey) {
            const card = mergedCards[matchedCardKey];
            if (!card.authorIds) card.authorIds = [];
            if (!card.authorIds.includes(ai.id)) card.authorIds.push(ai.id);
          } else {
            const newKey = `card_${ai.id}`;
            mergedCards[newKey] = {
              id: newKey,
              text: correctedAiText,
              authorIds: [ai.id],
              isTruth: false,
            };
          }
        }

        const cardsArray = Object.values(mergedCards);
        const shuffled = shuffleArray(cardsArray);
        const finalCardsMap: Record<string, MultiAnswerCard> = {};
        shuffled.forEach((c) => {
          finalCardsMap[c.id] = c;
        });

        const roomRef = doc(db, 'rooms', room.code);
        await updateDoc(roomRef, {
          cards: finalCardsMap,
          state: 'VOTE',
        }).catch(async () => {
          const updated = { ...room, cards: finalCardsMap, state: 'VOTE' as const };
          await setDoc(roomRef, updated);
        });
      };

      processSubmissionsAndAdvance();
    }
  }, [room?.submissions, timeLeft, isHost, room?.state]);

  // Submit vote
  const submitVote = useCallback(async (cardId: string) => {
    if (!room || room.state !== 'VOTE') return;
    const cleanCode = room.code;
    const roomRef = doc(db, 'rooms', cleanCode);
    try {
      await updateDoc(roomRef, {
        [`votes.${playerId}`]: cardId,
      });
    } catch {
      const updated = { ...room };
      if (!updated.votes) updated.votes = {};
      updated.votes[playerId] = cardId;
      await setDoc(roomRef, updated);
    }
    audioManager.playSFX('question_pop');
  }, [room, playerId]);

  // Check if all voted or timer expired -> Host calculates scores and transitions to REVEAL
  useEffect(() => {
    if (!room || !isHost || room.state !== 'VOTE' || !room.cards) return;

    const playersList = Object.values(room.players || {});
    const humanPlayers = playersList.filter((p) => !p.id.startsWith('ai_'));
    const votes = room.votes || {};
    const allVoted = humanPlayers.every((hp) => votes[hp.id] !== undefined);

    if (allVoted || timeLeft === 0) {
      const processVotesAndReveal = async () => {
        const cardsMap = room.cards || {};
        const cardsList = Object.values(cardsMap);
        const truthCard = cardsList.find((c) => c.isTruth);

        const completeVotes = { ...votes };
        const aiCount = room.aiCount ?? 3;
        const aiBots = [
          { id: 'ai-ruse', prob: 0.6 },
          { id: 'ai-manipulateur', prob: 0.4 },
          { id: 'ai-farfelu', prob: 0.2 },
        ].slice(0, aiCount);

        aiBots.forEach((ai) => {
          if (!completeVotes[ai.id]) {
            const roll = Math.random();
            const votesTruth = roll < ai.prob;
            if (votesTruth && truthCard && !(truthCard.authorIds || []).includes(ai.id)) {
              completeVotes[ai.id] = truthCard.id;
            } else {
              const eligible = cardsList.filter(
                (c) => !c.isTruth && !(c.authorIds || []).includes(ai.id)
              );
              if (eligible.length > 0) {
                const chosen = eligible[Math.floor(Math.random() * eligible.length)];
                completeVotes[ai.id] = chosen.id;
              } else if (truthCard) {
                completeVotes[ai.id] = truthCard.id;
              }
            }
          }
        });

        const updatedCardsMap: Record<string, MultiAnswerCard> = {};
        cardsList.forEach((c) => {
          const cardVoters: Record<string, boolean> = {};
          Object.entries(completeVotes).forEach(([voterId, votedCardId]) => {
            if (votedCardId === c.id) {
              cardVoters[voterId] = true;
            }
          });
          updatedCardsMap[c.id] = {
            ...c,
            voters: cardVoters,
          };
        });

        const scoreBreakdowns: Record<string, any> = {};
        const playerUpdates: Record<string, number> = {};
        const newPlayers = { ...room.players };

        playersList.forEach((p) => {
          const votedCardId = completeVotes[p.id];
          const votedCard = cardsList.find((c) => c.id === votedCardId);
          const truthPoints = votedCard?.isTruth ? 2 : 0;

          let bluffPoints = 0;
          const fooledPlayerIds: string[] = [];

          cardsList.forEach((c) => {
            if ((c.authorIds || []).includes(p.id)) {
              const cardVoters = updatedCardsMap[c.id]?.voters || {};
              Object.keys(cardVoters).forEach((voterId) => {
                if (voterId !== p.id) {
                  bluffPoints += 1;
                  fooledPlayerIds.push(voterId);
                }
              });
            }
          });

          const totalRoundPoints = truthPoints + bluffPoints;
          scoreBreakdowns[p.id] = {
            truthPoints,
            bluffPoints,
            totalRoundPoints,
            votedForCardId: votedCardId || null,
            fooledPlayerIds,
          };

          const newScore = (newPlayers[p.id]?.score || 0) + totalRoundPoints;
          if (newPlayers[p.id]) {
            newPlayers[p.id].score = newScore;
          }
          playerUpdates[`players.${p.id}.score`] = newScore;
        });

        const roomRef = doc(db, 'rooms', room.code);
        await updateDoc(roomRef, {
          votes: completeVotes,
          cards: updatedCardsMap,
          scoreBreakdowns,
          state: 'REVEAL',
          players: newPlayers,
        }).catch(async () => {
          const updated = {
            ...room,
            votes: completeVotes,
            cards: updatedCardsMap,
            scoreBreakdowns,
            state: 'REVEAL' as const,
            players: newPlayers,
          };
          await setDoc(roomRef, updated);
        });

        audioManager.playSFX('correct_answer');
      };

      processVotesAndReveal();
    }
  }, [room?.votes, timeLeft, isHost, room?.state]);

  const nextRoundOrFinish = useCallback(async () => {
    if (!room || !isHost) return;
    const nextRound = (room.currentRound || 1) + 1;
    const totalRounds = room.totalRounds || 4;

    const roomRef = doc(db, 'rooms', room.code);
    if (nextRound <= totalRounds) {
      await updateDoc(roomRef, {
        currentRound: nextRound,
        currentQuestionIndex: (room.currentQuestionIndex || 0) + 1,
        state: 'QUESTION',
        question: null,
        submissions: null,
        cards: null,
        votes: null,
        scoreBreakdowns: null,
      }).catch(async () => {
        const updated = {
          ...room,
          currentRound: nextRound,
          currentQuestionIndex: (room.currentQuestionIndex || 0) + 1,
          state: 'QUESTION' as const,
          question: undefined,
          submissions: undefined,
          cards: undefined,
          votes: undefined,
          scoreBreakdowns: undefined,
        };
        await setDoc(roomRef, updated);
      });
      audioManager.playSFX('question_pop');
    } else {
      await updateDoc(roomRef, {
        state: 'ENDED',
      }).catch(async () => {
        const updated = { ...room, state: 'ENDED' as const };
        await setDoc(roomRef, updated);
      });
      audioManager.playSFX('game_over');
    }
  }, [room, isHost]);

  return {
    room,
    loading,
    timeLeft,
    isHost,
    submitAnswer,
    submitVote,
    nextRoundOrFinish,
  };
}
