import React, { useEffect } from 'react';
import { Trophy, Eye, Drama, RotateCcw, Mic, Award, Loader2, Volume2 } from 'lucide-react';
import { EndGameComment, GameStats, Player, RoundHistory } from '../types/game';
import { speak } from '../utils/audioManager';

interface ScoreBoardProps {
  players: Player[];
  stats: GameStats;
  history: RoundHistory[];
  endGameComment: EndGameComment | null;
  isGeneratingEndComment: boolean;
  onPlayAgain: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  stats,
  history,
  endGameComment,
  isGeneratingEndComment,
  onPlayAgain,
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topScore = sortedPlayers[0]?.score ?? 0;
  const winners = sortedPlayers.filter((p) => p.score === topScore);

  useEffect(() => {
    if (endGameComment?.summary) {
      speak(endGameComment.summary);
    }
  }, [endGameComment?.summary]);

  return (
    <section aria-label="Bilan de fin de partie" className="space-y-6">
      {/* Victory Hero Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
          <Trophy className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-amber-400">
          Partie terminée · 4 manches disputées
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-display">
          {winners.length > 1
            ? `Égalité au sommet entre ${winners.map((w) => w.name).join(' et ')} !`
            : `Victoire de ${winners[0]?.name} avec ${topScore} points !`}
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Découvrez l'analyse mordante de notre présentateur TV ainsi que les badges décernés aux 4 participants.
        </p>
      </div>

      {/* Cynical TV Host Commentary & Custom Badges (Gemini End-Game Service) */}
      <div className="rounded-3xl bg-slate-900/95 border border-amber-500/30 p-5 sm:p-7 space-y-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif-display">
                Le Verdict du Présentateur TV
              </h3>
              <p className="text-xs text-slate-400">
                Chronique cynique de fin de plateau & remise des distinctions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {endGameComment?.summary && (
              <button
                type="button"
                onClick={() => speak(endGameComment.summary)}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="Réécouter le verdict du présentateur"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Réécouter</span>
              </button>
            )}
            {endGameComment?.source && (
              <span className="hidden sm:inline text-[11px] font-mono text-slate-400">
                {endGameComment.source === 'gemini' ? 'Analyse Gemini Flash' : 'Analyse plateau'}
              </span>
            )}
          </div>
        </div>

        {isGeneratingEndComment && !endGameComment ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2.5">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium">
              Le présentateur prépare son commentaire mordant et les badges...
            </p>
          </div>
        ) : endGameComment ? (
          <div className="space-y-5">
            {/* 2-sentence witty summary */}
            <blockquote className="rounded-2xl bg-slate-950/80 border border-slate-800/90 p-4 sm:p-5 text-sm sm:text-base text-slate-100 leading-relaxed italic font-serif-display">
              « {endGameComment.summary} »
            </blockquote>

            {/* Badges Grid */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Badges honorifiques décernés par la régie :</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {endGameComment.badges.map((item, idx) => (
                  <div
                    key={`${item.player}-${idx}`}
                    className="rounded-2xl bg-slate-950/70 border border-slate-800/90 p-4 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-300">{item.player}</span>
                      <span className="text-amber-400 font-semibold">{item.badge}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Distinctions: Meilleur bluffeur & Meilleur détecteur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
            <Drama className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Statistique · Meilleur bluffeur</div>
            <div className="text-lg font-bold text-white truncate mt-0.5">
              {stats.bestBluffer.player?.name}
            </div>
            <div className="text-xs font-mono tabular-nums text-amber-400 mt-1">
              {stats.bestBluffer.bluffCount} vote{stats.bestBluffer.bluffCount > 1 ? 's' : ''} adverse
              {stats.bestBluffer.bluffCount > 1 ? 's' : ''} attiré
              {stats.bestBluffer.bluffCount > 1 ? 's' : ''} (+{stats.bestBluffer.bluffCount} pts)
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Statistique · Meilleur détecteur</div>
            <div className="text-lg font-bold text-white truncate mt-0.5">
              {stats.bestDetector.player?.name}
            </div>
            <div className="text-xs font-mono tabular-nums text-emerald-400 mt-1">
              {stats.bestDetector.truthCount} vérité{stats.bestDetector.truthCount > 1 ? 's' : ''}{' '}
              trouvée{stats.bestDetector.truthCount > 1 ? 's' : ''} sur 4 (+
              {stats.bestDetector.truthCount * 2} pts)
            </div>
          </div>
        </div>
      </div>

      {/* Final Standings of the 4 Participants */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white font-serif-display">
            Classement final des participants
          </h3>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Vérités · Bluffs · Total
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold truncate ${
                        !player.isAI ? 'text-amber-400' : 'text-white'
                      }`}
                    >
                      {player.name}
                    </span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-400 truncate">{player.tagline}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                    {player.truthsFound} vérité{player.truthsFound > 1 ? 's' : ''} ({player.truthsFound * 2} pts)
                    {' · '}
                    {player.bluffsSucceeded} bluff{player.bluffsSucceeded > 1 ? 's' : ''} ({player.bluffPoints} pts)
                  </div>
                </div>
              </div>

              <div className="shrink-0 font-mono tabular-nums text-right">
                <span className="text-lg font-bold text-white">{player.score}</span>
                <span className="text-xs text-slate-400 ml-1">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary of the 4 rounds */}
      {history.length > 0 && (
        <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-white font-serif-display">
            Vérités des 4 manches
          </h3>
          <div className="space-y-3">
            {history.map((round) => (
              <div
                key={round.roundNumber}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1"
              >
                <div className="text-xs font-mono text-amber-400">
                  Manche {round.roundNumber} · {round.question.category}
                </div>
                <div className="text-sm font-medium text-slate-200">
                  {round.question.question}
                </div>
                <div className="text-xs text-emerald-400 font-semibold pt-1">
                  Réponse exacte : {round.question.correctAnswer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejouer Button */}
      <button
        type="button"
        onClick={onPlayAgain}
        className="w-full min-h-[54px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/15 cursor-pointer"
      >
        <RotateCcw className="w-4 h-4 shrink-0" />
        <span>Rejouer (4 nouvelles questions)</span>
      </button>
    </section>
  );
};
