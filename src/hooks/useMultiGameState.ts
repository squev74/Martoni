import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Room, MultiAnswerCard, MultiPlayer } from '../types/multi';
import questionsData from '../data/questions.json';
import { Question } from '../types/game';
import { generateAiAnswers } from '../services/geminiService';
import { areAnswersSimilar, normalizeDisplayAnswer } from '../utils/answerMatcher';
import { audioManager } from '../utils/audioManager';
import { cleanForFirestore } from '../utils/firestoreCleaner';

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
      const qList = room.questionsList && room.questionsList.length > 0 ? room.questionsList : allQuestions;
      const qIndex = room.currentQuestionIndex || 0;
      const q = qList[qIndex % qList.length];
      const officialTruth = q.truth || q.correctAnswer;

      const questionPayload = {
        id: q.id || `q_${qIndex}`,
        category: q.category || 'Général',
        question: q.question,
        truth: officialTruth,
        explanation: q.explanation || 'Explication officielle non disponible.',
      };

      const roomRef = doc(db, 'rooms', room.code);
      setDoc(
        roomRef,
        cleanForFirestore({
          ...room,
          question: questionPayload,
          submissions: {},
          cards: {},
          votes: {},
          scoreBreakdowns: {},
        }),
        { merge: true }
      ).catch((err) => {
        console.error('Error setting room question in Firestore:', err);
      });
    }
  }, [room?.state, isHost, room?.currentQuestionIndex]);

  // AI auto-submission when question is set
  useEffect(() => {
    if (!room || room.state !== 'QUESTION' || !room.question) return;
    const submissions = room.submissions || {};
    const playersList = Object.values(room.players || {});
    const aiPlayers = playersList.filter((p) => p.id.startsWith('ai-'));

    const needsAiSubmissions = aiPlayers.some((ai) => submissions[ai.id] === undefined);
    if (needsAiSubmissions) {
      const generateAiSubs = async () => {
        const q = room.question!;
        const officialTruth = q.truth;
        const aiRes = await generateAiAnswers(q.question, officialTruth, 'Exemple');
        const aiSubMap: Record<string, string> = { ...submissions };
        
        aiPlayers.forEach((ai) => {
          if (!aiSubMap[ai.id]) {
            if (ai.id === 'ai-ruse') aiSubMap[ai.id] = aiRes.ruse;
            else if (ai.id === 'ai-manipulateur') aiSubMap[ai.id] = aiRes.manipulateur;
            else aiSubMap[ai.id] = aiRes.farfelu;
          }
        });

        const roomRef = doc(db, 'rooms', room.code);
        await updateDoc(roomRef, cleanForFirestore({ submissions: aiSubMap })).catch(async () => {
          await setDoc(roomRef, cleanForFirestore({ ...room, submissions: aiSubMap }), { merge: true });
        });
      };
      generateAiSubs();
    }
  }, [room?.state, room?.question, room?.submissions]);

  // Submit player answer (Step 2)
  const submitAnswer = useCallback(async (text: string) => {
    if (!room || !text.trim()) return;
    const cleanCode = room.code;
    const roomRef = doc(db, 'rooms', cleanCode);
    try {
      await updateDoc(
        roomRef,
        cleanForFirestore({
          [`submissions.${playerId}`]: text.trim(),
        })
      );
    } catch {
      const updated = { ...room };
      if (!updated.submissions) updated.submissions = {};
      updated.submissions[playerId] = text.trim();
      await setDoc(roomRef, cleanForFirestore(updated));
    }
    audioManager.playSFX('question_pop');
  }, [room, playerId]);

  // Check if all submitted or timer expired (1 minute) -> Generate cards & switch to VOTE
  useEffect(() => {
    if (!room || room.state !== 'QUESTION' || !room.question) return;
    if (room.cards && Object.keys(room.cards).length > 0) return;

    const playersList = Object.values(room.players || {});
    const submissions = room.submissions || {};
    const allSubmitted = playersList.every((p) => submissions[p.id] !== undefined);

    if (allSubmitted || timeLeft === 0) {
      const finalSubmissions = { ...submissions };
      playersList.forEach((p) => {
        if (!finalSubmissions[p.id]) {
          finalSubmissions[p.id] = 'Proposition mystère';
        }
      });

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

        for (const p of playersList) {
          const rawAns = finalSubmissions[p.id] || 'Proposition mystère';
          const correctedText = normalizeDisplayAnswer(rawAns);

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
            if (!card.authorIds.includes(p.id)) card.authorIds.push(p.id);
          } else {
            const newKey = `card_${p.id}`;
            mergedCards[newKey] = {
              id: newKey,
              text: correctedText,
              authorIds: [p.id],
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
        await updateDoc(
          roomRef,
          cleanForFirestore({
            submissions: finalSubmissions,
            cards: finalCardsMap,
            state: 'VOTE',
          })
        ).catch(async () => {
          const updated = { ...room, submissions: finalSubmissions, cards: finalCardsMap, state: 'VOTE' as const };
          await setDoc(roomRef, cleanForFirestore(updated), { merge: true });
        });
      };

      processSubmissionsAndAdvance();
    }
  }, [room?.submissions, timeLeft, room?.state, room?.cards]);

  // AI auto-voting when state is VOTE
  useEffect(() => {
    if (!room || room.state !== 'VOTE' || !room.cards) return;
    const votes = room.votes || {};
    const playersList = Object.values(room.players || {});
    const aiPlayers = playersList.filter((p) => p.id.startsWith('ai-'));

    const needsAiVotes = aiPlayers.some((ai) => votes[ai.id] === undefined);
    if (needsAiVotes) {
      const generateAiVotes = async () => {
        const cardsList = Object.values(room.cards || {});
        const truthCard = cardsList.find((c) => c.isTruth);
        const newVotes = { ...votes };

        aiPlayers.forEach((ai) => {
          if (!newVotes[ai.id]) {
            const roll = Math.random();
            let prob = 0.4;
            if (ai.id === 'ai-ruse') prob = 0.6;
            else if (ai.id === 'ai-manipulateur') prob = 0.4;
            else if (ai.id === 'ai-farfelu') prob = 0.2;

            const votesTruth = roll < prob;
            if (votesTruth && truthCard && !(truthCard.authorIds || []).includes(ai.id)) {
              newVotes[ai.id] = truthCard.id;
            } else {
              const eligible = cardsList.filter(
                (c) => !c.isTruth && !(c.authorIds || []).includes(ai.id)
              );
              if (eligible.length > 0) {
                const chosen = eligible[Math.floor(Math.random() * eligible.length)];
                newVotes[ai.id] = chosen.id;
              } else if (truthCard) {
                newVotes[ai.id] = truthCard.id;
              } else if (cardsList.length > 0) {
                newVotes[ai.id] = cardsList[0].id;
              }
            }
          }
        });

        const roomRef = doc(db, 'rooms', room.code);
        await updateDoc(roomRef, cleanForFirestore({ votes: newVotes })).catch(async () => {
          await setDoc(roomRef, cleanForFirestore({ ...room, votes: newVotes }), { merge: true });
        });
      };
      generateAiVotes();
    }
  }, [room?.state, room?.cards, room?.votes]);

  // Submit vote
  const submitVote = useCallback(async (cardId: string) => {
    if (!room || room.state !== 'VOTE') return;
    const cleanCode = room.code;
    const roomRef = doc(db, 'rooms', cleanCode);
    try {
      await updateDoc(
        roomRef,
        cleanForFirestore({
          [`votes.${playerId}`]: cardId,
        })
      );
    } catch {
      const updated = { ...room };
      if (!updated.votes) updated.votes = {};
      updated.votes[playerId] = cardId;
      await setDoc(roomRef, cleanForFirestore(updated));
    }
    audioManager.playSFX('question_pop');
  }, [room, playerId]);

  // Check if all voted or timer expired (1 minute) -> Calculate scores and transition to REVEAL
  useEffect(() => {
    if (!room || room.state !== 'VOTE' || !room.cards) return;
    if (room.scoreBreakdowns && Object.keys(room.scoreBreakdowns).length > 0) return;

    const playersList = Object.values(room.players || {});
    const votes = room.votes || {};
    const allVoted = playersList.every((p) => votes[p.id] !== undefined);

    if (allVoted || timeLeft === 0) {
      const completeVotes = { ...votes };
      const cardsList = Object.values(room.cards || {});
      const truthCard = cardsList.find((c) => c.isTruth);

      playersList.forEach((p) => {
        if (!completeVotes[p.id]) {
          if (truthCard) {
            completeVotes[p.id] = truthCard.id;
          } else if (cardsList.length > 0) {
            completeVotes[p.id] = cardsList[0].id;
          }
        }
      });

      const processVotesAndReveal = async () => {
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
        });

        const roomRef = doc(db, 'rooms', room.code);
        await updateDoc(
          roomRef,
          cleanForFirestore({
            votes: completeVotes,
            cards: updatedCardsMap,
            scoreBreakdowns,
            state: 'REVEAL',
            players: newPlayers,
          })
        ).catch(async () => {
          const updated = {
            ...room,
            votes: completeVotes,
            cards: updatedCardsMap,
            scoreBreakdowns,
            state: 'REVEAL' as const,
            players: newPlayers,
          };
          await setDoc(roomRef, cleanForFirestore(updated), { merge: true });
        });

        audioManager.playSFX('correct_answer');
      };

      processVotesAndReveal();
    }
  }, [room?.votes, timeLeft, room?.state, room?.cards, room?.scoreBreakdowns]);

  const nextRoundOrFinish = useCallback(async () => {
    if (!room || !isHost) return;
    const nextRound = (room.currentRound || 1) + 1;
    const totalRounds = room.totalRounds || 4;

    const roomRef = doc(db, 'rooms', room.code);
    if (nextRound <= totalRounds) {
      const updated = {
        ...room,
        currentRound: nextRound,
        currentQuestionIndex: nextRound - 1,
        state: 'QUESTION' as const,
        question: undefined,
        submissions: undefined,
        cards: undefined,
        votes: undefined,
        scoreBreakdowns: undefined,
      };
      await setDoc(roomRef, cleanForFirestore(updated), { merge: true }).catch((err) => {
        console.error('Error advancing round in Firestore:', err);
      });
      audioManager.playSFX('question_pop');
    } else {
      const updated = { ...room, state: 'ENDED' as const };
      await setDoc(roomRef, cleanForFirestore(updated), { merge: true }).catch((err) => {
        console.error('Error ending game in Firestore:', err);
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
