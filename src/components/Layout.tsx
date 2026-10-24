import React, { useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { Header } from './Header';
import { useGame } from '../context/GameContext';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const STEP_DESCRIPTIONS = [
  { step: 1, title: 'Question ouverte', detail: 'La vraie réponse est cachée.' },
  { step: 2, title: 'Saisie du joueur', detail: 'Réponse sincère ou bluff.' },
  { step: 3, title: 'Bluffs des 3 IA', detail: '3 fausses réponses générées.' },
  { step: 4, title: 'Mélange & fusion', detail: 'Doublons regroupés sur une carte.' },
  { step: 5, title: 'Vote secret', detail: 'Interdit de voter pour soi.' },
  { step: 6, title: 'Révélation animée', detail: 'Séquence A → B → C → D.' },
  { step: 7, title: 'Calcul des points', detail: 'Vérité +2 pts · Bluff +1 pt/vote.' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    players,
    gamePhase,
    currentRound,
    totalRounds,
    currentStep,
    questionBankStatus,
    handleResetQuestionHistory,
  } = useGame();
  const isOnline = useOnlineStatus();
  const [activeModal, setActiveModal] = useState<'NONE' | 'RULES' | 'STANDINGS'>('NONE');

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-[#0f172a] text-slate-100">
      <Header activeModal={activeModal} setActiveModal={setActiveModal} />

      {/* Mobile Party-Game Live Score Strip (visible on mobile during active game, zero horizontal overflow) */}
      {gamePhase === 'PLAYING' && (
        <div className="lg:hidden bg-slate-900/90 border-b border-slate-800/80 px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums mb-1.5">
            <span className="text-amber-400 font-semibold">
              Manche {currentRound}/{totalRounds}
            </span>
            <span>Étape {currentStep}/7</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {players.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl px-2 py-1.5 border text-center min-w-0 ${
                  !p.isAI
                    ? 'bg-amber-400/10 border-amber-400/35 text-amber-300'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[11px] font-medium truncate">{p.name}</div>
                <div className="text-xs font-mono tabular-nums font-bold text-white">
                  {p.score} <span className="text-[10px] font-normal text-slate-400">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8">
        {children}
      </main>

      {/* Bottom Sheet / Modal for Rules & Live Standings */}
      {activeModal !== 'NONE' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-1 sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-serif-display">
                {activeModal === 'RULES' ? 'Règles du Jeu de Bluff' : 'Classement en direct'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('NONE')}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModal === 'RULES' ? (
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  Une partie se déroule en <strong>4 manches</strong> opposant 1 joueur humain à 3 IA aux profils distincts : <strong>Le Rusé</strong> (60 % de vote exact), <strong>Le Manipulateur</strong> (40 %) et <strong>Le Farfelu</strong> (20 %).
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="font-semibold text-white">Déroulement d'une manche (7 étapes) :</div>
                  {STEP_DESCRIPTIONS.map((s) => (
                    <div key={s.step} className="text-xs">
                      <span className="font-mono text-amber-400">Étape {s.step} :</span>{' '}
                      <span className="font-medium text-white">{s.title}</span> — {s.detail}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                  <div className="font-semibold text-white">Calcul des points :</div>
                  <p>• +2 points pour avoir voté pour la vraie réponse officielle.</p>
                  <p>
                    • +1 point de bluff par adversaire ayant voté pour votre réponse. Si plusieurs joueurs ont soumis la même réponse, leur carte est regroupée et chaque co-auteur reçoit +1 point par votant sur cette carte.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-white">Banque de questions (sans remise)</div>
                    <div className="text-slate-400 font-mono tabular-nums mt-0.5">
                      {questionBankStatus.remainingCount} / {questionBankStatus.totalCount} questions inédites restantes
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetQuestionHistory}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {sortedPlayers.map((p, idx) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-amber-400 mr-2">#{idx + 1}</span>
                      <span className="font-semibold text-white">{p.name}</span>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                        {p.truthsFound} vérité{p.truthsFound > 1 ? 's' : ''} · {p.bluffsSucceeded}{' '}
                        bluff{p.bluffsSucceeded > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-white">{p.score} pts</div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveModal('NONE')}
              className="w-full min-h-[48px] rounded-xl bg-amber-400 text-slate-950 font-semibold text-sm hover:bg-amber-300 transition-colors cursor-pointer"
            >
              Retour au plateau
            </button>
          </div>
        </div>
      )}

      {/* Offline PWA Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Mode hors-ligne actif — Partie locale disponible</span>
        </div>
      )}
    </div>
  );
};
