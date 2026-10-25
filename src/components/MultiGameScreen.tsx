import React, { useState, useEffect } from 'react';
import { useMultiGameState } from '../hooks/useMultiGameState';
import { Send, Clock, Users, CheckCircle2, Award, BookOpen, Drama, RotateCcw } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { MultiEndScreen } from './MultiEndScreen';

interface MultiGameScreenProps {
  roomCode: string;
  playerId: string;
  onLeaveRoom: () => void;
}

export const MultiGameScreen: React.FC<MultiGameScreenProps> = ({
  roomCode,
  playerId,
  onLeaveRoom,
}) => {
  const { room, loading, timeLeft, isHost, submitAnswer, submitVote, nextRoundOrFinish } =
    useMultiGameState(roomCode, playerId);

  const [answerText, setAnswerText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    setHasSubmitted(false);
    setAnswerText('');
    setHasVoted(false);
    setSelectedCardId(null);
  }, [room?.currentRound, room?.state]);

  if (loading || !room) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Connexion au salon en temps réel...</p>
      </div>
    );
  }

  // If state is ENDED, render MultiEndScreen
  if (room.state === 'ENDED') {
    return <MultiEndScreen room={room} playerId={playerId} onLeaveRoom={onLeaveRoom} />;
  }

  const playersList = room.players ? Object.values(room.players) : [];
  const humanPlayers = playersList.filter((p) => !p.id.startsWith('ai_'));
  const submissionsCount = room.submissions ? Object.keys(room.submissions).length : 0;
  const votesCount = room.votes ? Object.keys(room.votes).length : 0;

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || hasSubmitted) return;
    submitAnswer(answerText);
    setHasSubmitted(true);
  };

  const handleVoteSubmit = (cardId: string) => {
    if (hasVoted || room.state !== 'VOTE') return;
    submitVote(cardId);
    setSelectedCardId(cardId);
    setHasVoted(true);
  };

  const getPlayerName = (id: string) => room.players?.[id]?.name || id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header Bar with Round & Timer */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400">
            Manche {room.currentRound} / {room.totalRounds} · Salon : {room.code}
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            {room.state === 'QUESTION' && 'Étape 1 & 2 : Saisie de votre bluff'}
            {room.state === 'VOTE' && 'Étape 5 : Vote secret'}
            {room.state === 'REVEAL' && 'Étape 6 & 7 : Révélation & Score'}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs font-bold shrink-0">
          <Clock className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* State 1: QUESTION / SUBMISSION */}
      {room.state === 'QUESTION' && room.question && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="text-xs font-mono text-slate-400">{room.question.category}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-serif-display leading-snug">
              {room.question.question}
            </h2>
          </div>

          {!hasSubmitted ? (
            <form onSubmit={handleAnswerSubmit} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-200">
                Votre réponse (sincère ou bluff) :
              </label>
              <textarea
                rows={3}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Rédigez votre réponse ici..."
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-4 text-base text-white focus:border-amber-400 focus:outline-none resize-none"
              />
              <button
                type="submit"
                disabled={!answerText.trim()}
                className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Valider ma réponse</span>
              </button>
            </form>
          ) : (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Réponse enregistrée !</h3>
              <p className="text-sm text-slate-400">
                En attente des autres joueurs : {submissionsCount} / {humanPlayers.length} ont soumis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* State 2: VOTE */}
      {room.state === 'VOTE' && room.cards && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-2">
            <h2 className="text-xl font-bold text-white font-serif-display">À vous de voter !</h2>
            <p className="text-sm text-slate-400">
              Démasquez la vraie réponse ou piégez vos adversaires. (Interdit de voter pour soi).
            </p>
          </div>

          <div className="space-y-3">
            {Object.values(room.cards).map((card, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isMyCard = (card.authorIds || []).includes(playerId);
              const isSelected = selectedCardId === card.id;

              return (
                <div
                  key={card.id}
                  className={`rounded-3xl p-5 border transition-all ${
                    isMyCard
                      ? 'bg-slate-950/50 border-slate-800 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-400/10 border-amber-400 ring-2 ring-amber-400/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                  onClick={() => !isMyCard && !hasVoted && handleVoteSubmit(card.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-lg font-mono text-xs font-bold bg-slate-800 text-slate-300 flex items-center justify-center">
                      {letter}
                    </span>
                    {isMyCard && (
                      <span className="text-xs font-mono text-slate-500">Votre proposition</span>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-white">{card.text}</p>
                </div>
              );
            })}
          </div>

          {hasVoted && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center text-xs text-slate-400">
              Vote enregistré ! En attente des autres joueurs : {votesCount} / {humanPlayers.length} ont voté.
            </div>
          )}
        </div>
      )}

      {/* State 3: REVEAL */}
      {room.state === 'REVEAL' && room.cards && room.question && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white font-serif-display">Révélation de la manche</h2>
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="text-xs font-mono text-emerald-400">Vraie réponse officielle</div>
              <div className="text-base font-bold text-white">{room.question.truth}</div>
              <p className="text-xs text-emerald-100 leading-relaxed">{room.question.explanation}</p>
            </div>
          </div>

          <div className="space-y-3">
            {Object.values(room.cards).map((card, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const authorNames = (card.authorIds || []).map(getPlayerName);
              const votersMap = card.voters || {};
              const voterIds = Object.keys(votersMap);

              return (
                <div
                  key={card.id}
                  className={`rounded-3xl p-5 border ${
                    card.isTruth
                      ? 'bg-emerald-950/50 border-emerald-400 shadow-lg'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                          card.isTruth ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-xs font-semibold text-amber-300">
                        {card.isTruth ? 'VRAIE RÉPONSE' : `Bluff de : ${authorNames.join(', ') || 'IA'}`}
                      </span>
                    </div>
                  </div>
                  <p className="text-base font-semibold text-white">{card.text}</p>

                  {voterIds.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-1.5 items-center text-xs">
                      <span className="text-slate-400">Votants :</span>
                      {voterIds.map((vId) => {
                        const isMe = vId === playerId;
                        return (
                          <span
                            key={vId}
                            className={`px-2.5 py-1 rounded-xl border ${
                              isMe
                                ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                                : 'bg-slate-950 border-slate-700 text-slate-200'
                            }`}
                          >
                            {getPlayerName(vId)} {isMe && '(Votre vote)'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Round Score Breakdown */}
          {room.scoreBreakdowns && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white font-serif-display flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Comptabilisation des points de cette manche</span>
              </h3>
              <div className="space-y-2.5">
                {Object.entries(room.scoreBreakdowns).map(([pId, breakdown]: [string, any]) => {
                  const pName = getPlayerName(pId);
                  const isMe = pId === playerId;
                  return (
                    <div
                      key={pId}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        isMe
                          ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-white">
                          {pName} {isMe && '(Vous)'}
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap gap-2">
                          {breakdown.truthPoints > 0 && (
                            <span className="text-emerald-400">+{breakdown.truthPoints} pts (Vraie réponse)</span>
                          )}
                          {breakdown.bluffPoints > 0 && (
                            <span className="text-amber-400">+{breakdown.bluffPoints} pts (Bluff réussi)</span>
                          )}
                          {breakdown.totalRoundPoints === 0 && (
                            <span className="text-slate-500">0 pt cette manche</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono font-black text-amber-400 text-lg">
                        +{breakdown.totalRoundPoints}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host Controls */}
          {isHost ? (
            <button
              type="button"
              onClick={nextRoundOrFinish}
              className="w-full min-h-[56px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/15 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>
                {room.currentRound < room.totalRounds
                  ? `Passer à la manche ${room.currentRound + 1}`
                  : 'Voir le classement final'}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center text-xs text-slate-400">
              En attente que l'hôte lance la manche suivante...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
