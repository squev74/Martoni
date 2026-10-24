import React from 'react';
import { Play, Users, Bot } from 'lucide-react';

interface HomeProps {
  onStartSolo: () => void;
  onStartMulti: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStartSolo, onStartMulti }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left column: Game Modes */}
      <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl">
        <div className="space-y-4">
          <div className="text-xs font-mono text-amber-400">
            Jeu de Bluff · Version Solo & Mode Soirée
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-serif-display leading-tight">
            Démêlez l'imposture de la vérité historique.
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Face à des questions insolites vérifiées, rédigez un bluff crédible pour tromper vos adversaires et débusquer la véritable réponse officielle.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onStartSolo}
            className="w-full min-h-[58px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-3 shadow-lg shadow-amber-500/15 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current shrink-0" />
            <span>Jouer Solo (Contre les 3 IA)</span>
          </button>

          <button
            type="button"
            onClick={onStartMulti}
            className="w-full min-h-[58px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-3 border border-slate-700 cursor-pointer"
          >
            <Users className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Mode Soirée (Multijoueur en ligne)</span>
          </button>
        </div>
      </div>

      {/* Right column: AI Profiles & Scoring */}
      <div className="lg:col-span-5 rounded-3xl bg-slate-900/75 border border-slate-800 p-6 sm:p-7 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white font-serif-display flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-400" />
            <span>Personnalités des IA</span>
          </h2>
          <div className="divide-y divide-slate-800/90">
            <div className="py-3 first:pt-0">
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                <span>Le Rusé</span>
                <span className="font-mono tabular-nums text-xs text-emerald-400">
                  60 % vote juste
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Érudit et méthodique, il rédige des bluffs historiques ou scientifiques plus vrais que nature.
              </p>
            </div>
            <div className="py-3">
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                <span>Le Manipulateur</span>
                <span className="font-mono tabular-nums text-xs text-amber-400">
                  40 % vote juste
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Spécialiste des pièges psychologiques, des chiffres précis et des fausses évidences.
              </p>
            </div>
            <div className="py-3 last:pb-0">
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                <span>Le Farfelu</span>
                <span className="font-mono tabular-nums text-xs text-slate-400">
                  20 % vote juste
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formule des théories complètement saugrenues avec un sérieux encyclopédique imperturbable.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="font-semibold text-white">Barème officiel des points :</div>
          <p>
            <span className="font-mono tabular-nums text-emerald-400 font-semibold">+2 pts</span>{' '}
            pour avoir trouvé la vraie réponse officielle.
          </p>
          <p>
            <span className="font-mono tabular-nums text-amber-400 font-semibold">+1 pt</span>{' '}
            de bluff par adversaire ayant voté pour votre réponse.
          </p>
        </div>
      </div>
    </div>
  );
};
