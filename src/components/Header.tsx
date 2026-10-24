import React from 'react';
import { useGame } from '../context/GameContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeModal: 'NONE' | 'RULES' | 'STANDINGS';
  setActiveModal: (modal: 'NONE' | 'RULES' | 'STANDINGS') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeModal, setActiveModal }) => {
  const {
    startNewGame,
    gamePhase,
    currentRound,
    totalRounds,
    players,
    soundEnabled,
    toggleSound,
  } = useGame();

  const humanPlayer = players.find((p) => !p.isAI);

  return (
    <header className="sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 sm:gap-8 px-3.5 sm:px-6 h-14">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => setActiveModal('NONE')}
          className="text-base sm:text-lg font-bold tracking-tight text-white font-serif-display whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          Jeu de Bluff
        </button>

        {/* Zone 2: Clean single-line navigation links + live round/score indicator */}
        <nav className="flex items-center gap-3.5 sm:gap-6 text-xs sm:text-sm font-medium text-slate-300 overflow-hidden">
          {gamePhase === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setActiveModal('NONE')}
              className={`font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                activeModal === 'NONE' ? 'text-amber-400 font-semibold' : 'hover:text-white'
              }`}
            >
              Manche {currentRound}/{totalRounds} · {humanPlayer?.score ?? 0} pts
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'STANDINGS' ? 'NONE' : 'STANDINGS')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              activeModal === 'STANDINGS' ? 'text-amber-400 underline underline-offset-4' : ''
            }`}
          >
            Scores
          </button>
          <button
            type="button"
            onClick={() => setActiveModal(activeModal === 'RULES' ? 'NONE' : 'RULES')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
              activeModal === 'RULES' ? 'text-amber-400 underline underline-offset-4' : ''
            }`}
          >
            Règles
          </button>
        </nav>

        {/* Zone 3: Audio Mute/Unmute Control + Primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Désactiver le son et la voix' : 'Activer le son et la voix'}
            title={
              soundEnabled
                ? 'Présentateur & effets sonores actifs (cliquer pour couper)'
                : 'Mode muet actif (cliquer pour activer la voix)'
            }
            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-amber-300'
                : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400'
            }`}
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {soundEnabled ? '🔊' : '🔇'}
            </span>
            <span className="hidden sm:inline">
              {soundEnabled ? 'Voix TV' : 'Muet'}
            </span>
          </button>
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => startNewGame()}
            className="min-h-[38px] px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {gamePhase === 'WELCOME' ? 'Jouer' : 'Relancer'}
          </button>
        </div>
      </div>
    </header>
  );
};
