import React, { useEffect, useState } from 'react';
import { Trophy, Award, RotateCcw, Mic, Loader2, Volume2 } from 'lucide-react';
import { Room } from '../types/multi';
import { updateRoomState } from '../services/roomService';
import { audioManager, speak } from '../utils/audioManager';
import { generateEndGameComment } from '../services/geminiService';
import { EndGameComment } from '../types/game';

interface MultiEndScreenProps {
  room: Room;
  playerId: string;
  onLeaveRoom: () => void;
}

export const MultiEndScreen: React.FC<MultiEndScreenProps> = ({
  room,
  playerId,
  onLeaveRoom,
}) => {
  const isHost = room.hostId === playerId;
  const playersList = room.players ? Object.values(room.players) : [];
  const sortedPlayers = [...playersList].sort((a, b) => (b.score || 0) - (a.score || 0));

  const [endComment, setEndComment] = useState<EndGameComment | null>(null);
  const [loadingComment, setLoadingComment] = useState(true);

  useEffect(() => {
    audioManager.playSFX('game_over');

    const formattedPlayers = sortedPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      isAI: p.id.startsWith('ai_'),
      tagline: p.isHost ? 'Hôte' : 'Joueur',
      truthProbability: 0.5,
      score: p.score || 0,
      bluffPoints: 0,
      truthsFound: 2,
      bluffsSucceeded: 1,
    }));

    generateEndGameComment(formattedPlayers).then((comment) => {
      setEndComment(comment);
      setLoadingComment(false);
      if (comment?.summary) {
        speak(comment.summary);
      }
    });
  }, [room.code]);

  const handleRematch = async () => {
    if (!isHost) return;
    audioManager.playSFX('question_pop');
    
    // Reset scores to 0 and go back to LOBBY
    await updateRoomState(room.code, 'LOBBY');
  };

  const topWinner = sortedPlayers[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Podium Header */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center space-y-3 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
          <Trophy className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-amber-400">Fin de la partie multijoueur</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-display">
          Victoire de {topWinner?.name} avec {topWinner?.score || 0} points !
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Voici le podium officiel et le verdict de notre présentateur TV.
        </p>
      </div>

      {/* TV Host Commentary */}
      <div className="rounded-3xl bg-slate-900/95 border border-amber-500/30 p-5 sm:p-7 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-display">
                Le Verdict du Présentateur TV
              </h3>
              <p className="text-xs text-slate-400">Analyse de la soirée & badges</p>
            </div>
          </div>
          {endComment?.summary && (
            <button
              type="button"
              onClick={() => speak(endComment.summary)}
              className="min-h-[34px] px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Réécouter</span>
            </button>
          )}
        </div>

        {loadingComment ? (
          <div className="py-6 flex items-center justify-center gap-2 text-slate-300 text-sm">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            <span>Le présentateur prépare son analyse...</span>
          </div>
        ) : endComment ? (
          <div className="space-y-4">
            <blockquote className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-sm sm:text-base text-slate-100 leading-relaxed italic font-serif-display">
              « {endComment.summary} »
            </blockquote>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {endComment.badges.map((b, idx) => (
                <div key={idx} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{b.player}</span>
                    <span className="text-amber-400 font-semibold">{b.badge}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{b.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Podium List */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-serif-display">Podium Final</h3>
        <div className="divide-y divide-slate-800">
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="py-3.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  #{idx + 1}
                </span>
                <span className="font-semibold text-white">{p.name}</span>
              </div>
              <span className="font-mono tabular-nums font-bold text-white">{p.score || 0} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Host Controls */}
      <div className="space-y-3">
        {isHost ? (
          <button
            type="button"
            onClick={handleRematch}
            className="w-full min-h-[54px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/15 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Lancer une revanche (Rematch)</span>
          </button>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center text-xs text-slate-400">
            En attente que l'hôte lance une revanche...
          </div>
        )}

        <button
          type="button"
          onClick={onLeaveRoom}
          className="w-full min-h-[48px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Quitter le salon</span>
        </button>
      </div>
    </div>
  );
};
