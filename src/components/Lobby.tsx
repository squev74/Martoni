import React, { useState } from 'react';
import { Users, Copy, Check, Play, LogOut, Bot, Clock, Crown } from 'lucide-react';
import { Room } from '../types/multi';
import { updateRoomState, leaveRoom } from '../services/roomService';
import { audioManager } from '../utils/audioManager';

interface LobbyProps {
  room: Room;
  playerId: string;
  onLeaveRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  playerId,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === playerId;
  const playersList = room.players ? Object.values(room.players) : [];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    audioManager.playSFX('question_pop');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (!isHost) return;
    try {
      audioManager.playSFX('correct_answer');
      await updateRoomState(room.code, 'QUESTION');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveRoom(room.code, playerId);
      onLeaveRoom();
    } catch (err) {
      console.error(err);
      onLeaveRoom();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Room Code Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center space-y-4 shadow-xl">
        <div className="text-xs font-mono text-amber-400">Salon Mode Soirée (En direct)</div>
        <div className="space-y-1">
          <div className="text-sm text-slate-400">Code d'accès du salon</div>
          <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-amber-400">
            {room.code}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Code copié !' : 'Copier le code'}</span>
          </button>

          <button
            type="button"
            onClick={handleLeave}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Quitter le salon</span>
          </button>
        </div>
      </div>

      {/* Players & AIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Human Players */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-serif-display flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Joueurs connectés ({playersList.length})</span>
            </h3>
          </div>

          <div className="space-y-2.5">
            {playersList.map((p) => {
              const isMe = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-3 border flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                      : 'bg-slate-950/70 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 font-mono text-xs font-bold flex items-center justify-center text-white shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-xs sm:text-sm">
                        {p.name} {isMe && '(Vous)'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.isHost ? 'Hôte du salon' : 'Prêt'}
                      </div>
                    </div>
                  </div>
                  {p.isHost && (
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" title="Hôte" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Competitors & Settings */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-serif-display flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              <span>Adversaires IA ({room.aiCount})</span>
            </h3>
          </div>

          <div className="space-y-2.5">
            {room.aiCount > 0 ? (
              <>
                {(room.aiCount >= 1) && (
                  <div className="rounded-2xl p-3 bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 font-mono text-xs font-bold flex items-center justify-center text-emerald-400 shrink-0">
                      RS
                    </div>
                    <div>
                      <div className="font-semibold">Le Rusé</div>
                      <div className="text-[10px] text-slate-400">60% vote juste · Hyper-crédible</div>
                    </div>
                  </div>
                )}
                {(room.aiCount >= 2) && (
                  <div className="rounded-2xl p-3 bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 font-mono text-xs font-bold flex items-center justify-center text-amber-400 shrink-0">
                      MN
                    </div>
                    <div>
                      <div className="font-semibold">Le Manipulateur</div>
                      <div className="text-[10px] text-slate-400">40% vote juste · Piège psychologique</div>
                    </div>
                  </div>
                )}
                {(room.aiCount >= 3) && (
                  <div className="rounded-2xl p-3 bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-200">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 font-mono text-xs font-bold flex items-center justify-center text-slate-300 shrink-0">
                      FF
                    </div>
                    <div>
                      <div className="font-semibold">Le Farfelu</div>
                      <div className="text-[10px] text-slate-400">20% vote juste · Encyclopédiste loufoque</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Aucune IA activée dans ce salon.</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Chrono : {room.timerSeconds} secondes par étape</span>
          </div>
        </div>
      </div>

      {/* Host Controls */}
      {isHost ? (
        <button
          type="button"
          onClick={handleStartGame}
          className="w-full min-h-[56px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/15 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current shrink-0" />
          <span>Lancer la partie pour tous les joueurs</span>
        </button>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center text-xs text-slate-400">
          En attente que l'hôte lance la partie...
        </div>
      )}
    </div>
  );
};
