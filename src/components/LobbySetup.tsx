import React, { useState } from 'react';
import { Users, Plus, LogIn, ArrowLeft, Loader2, Sparkles, Clock, Bot } from 'lucide-react';
import { createRoom, joinRoom } from '../services/roomService';
import { Room } from '../types/multi';
import { audioManager } from '../utils/audioManager';

interface LobbySetupProps {
  onBackToModeSelect: () => void;
  onRoomJoined: (roomCode: string, playerId: string, room: Room) => void;
}

export const LobbySetup: React.FC<LobbySetupProps> = ({
  onBackToModeSelect,
  onRoomJoined,
}) => {
  const [actionType, setActionType] = useState<'CHOICE' | 'CREATE' | 'JOIN'>('CHOICE');
  const [playerName, setPlayerName] = useState('Joueur');
  const [aiCount, setAiCount] = useState<number>(3);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg('Veuillez entrer un pseudo.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { roomCode, playerId } = await createRoom(playerName, timerSeconds, aiCount);
      audioManager.playSFX('question_pop');
      onRoomJoined(roomCode, playerId, {
        code: roomCode,
        hostId: playerId,
        state: 'LOBBY',
        timerSeconds,
        aiCount,
        currentRound: 1,
        totalRounds: 4,
        players: {
          [playerId]: { id: playerId, name: playerName, isHost: true, score: 0, isReady: true }
        },
        currentQuestionIndex: 0,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Erreur lors de la création du salon.');
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg('Veuillez entrer un pseudo.');
      return;
    }
    if (!roomCodeInput.trim() || roomCodeInput.trim().length !== 4) {
      setErrorMsg('Veuillez entrer un code à 4 lettres valide.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await joinRoom(roomCodeInput, playerName);
      if ('error' in result) {
        setErrorMsg(result.error);
        setLoading(false);
      } else {
        audioManager.playSFX('question_pop');
        onRoomJoined(roomCodeInput.trim().toUpperCase(), result.playerId, result.room);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Impossible de rejoindre le salon.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (actionType === 'CHOICE') {
              onBackToModeSelect();
            } else {
              setActionType('CHOICE');
              setErrorMsg(null);
            }
          }}
          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
        <span className="text-xs font-mono text-amber-400">Mode Soirée (Multijoueur)</span>
      </div>

      {actionType === 'CHOICE' && (
        <div className="space-y-5 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-serif-display">
              Rejoindre ou Créer un Salon
            </h2>
            <p className="text-sm text-slate-400">
              Affrontez vos amis en temps réel sur le même plateau de bluff !
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setActionType('CREATE')}
              className="w-full min-h-[64px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-3 shadow-lg shadow-amber-500/15 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Créer un nouveau salon</span>
            </button>

            <button
              type="button"
              onClick={() => setActionType('JOIN')}
              className="w-full min-h-[64px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-3 border border-slate-700 cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-amber-400" />
              <span>Rejoindre avec un code</span>
            </button>
          </div>
        </div>
      )}

      {actionType === 'CREATE' && (
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-serif-display">Créer un salon</h2>
            <p className="text-xs text-slate-400">Configurez votre partie avant de partager le code.</p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Votre Pseudo d'Hôte
              </label>
              <input
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: MaîtreDuJeu"
                className="w-full min-h-[46px] rounded-xl bg-slate-950 border border-slate-700 px-4 text-base text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-amber-400" />
                <span>Nombre d'IA sur le plateau ({aiCount})</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAiCount(num)}
                    className={`min-h-[42px] rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      aiCount === num
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {num} {num === 0 ? 'Aucune' : num === 1 ? 'IA' : 'IA'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Chrono par étape ({timerSeconds}s)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 45, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTimerSeconds(sec)}
                    className={`min-h-[42px] rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      timerSeconds === sec
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {sec} secondes
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/15"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>Générer le salon</span>
          </button>
        </form>
      )}

      {actionType === 'JOIN' && (
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-serif-display">Rejoindre un salon</h2>
            <p className="text-xs text-slate-400">Entrez le code à 4 lettres fourni par votre hôte.</p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Votre Pseudo
              </label>
              <input
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: Blufmeister"
                className="w-full min-h-[46px] rounded-xl bg-slate-950 border border-slate-700 px-4 text-base text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Code du salon (4 lettres)
              </label>
              <input
                type="text"
                maxLength={4}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Ex: X7BK"
                className="w-full min-h-[52px] rounded-xl bg-slate-950 border border-slate-700 px-4 font-mono text-xl tracking-widest text-center uppercase text-amber-400 font-bold focus:border-amber-400 focus:outline-none placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/15"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            <span>Entrer dans le salon</span>
          </button>
        </form>
      )}
    </div>
  );
};
