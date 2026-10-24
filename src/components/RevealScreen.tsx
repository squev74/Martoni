import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Award,
  ArrowRight,
  BookOpen,
  Sparkles,
  UserCheck,
  Drama,
  FastForward,
} from 'lucide-react';
import {
  AnswerCard,
  Player,
  Question,
  RoundScoreBreakdown,
  RoundStep,
} from '../types/game';
import { soundEngine } from '../utils/sound';

export type RevealSubPhase = 'A' | 'B' | 'C' | 'D';

interface RevealScreenProps {
  question: Question;
  cards: AnswerCard[];
  players: Player[];
  scoreBreakdowns: RoundScoreBreakdown[];
  currentStep: RoundStep;
  currentRound: number;
  totalRounds: number;
  onProceedToStep7: () => void;
  onNextRoundOrFinish: () => void;
}

const SUB_PHASES: { id: RevealSubPhase; label: string; subtitle: string }[] = [
  { id: 'A', label: 'A. Cartes', subtitle: 'Propositions anonymes sur table' },
  { id: 'B', label: 'B. Votes', subtitle: 'Révélation des choix de chaque joueur' },
  { id: 'C', label: 'C. Auteurs', subtitle: 'Démasquage des auteurs de bluffs' },
  { id: 'D', label: 'D. Vérité', subtitle: 'Flash sur la vraie réponse & explication' },
];

const PHASE_ORDER: Record<RevealSubPhase, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
};

export const RevealScreen: React.FC<RevealScreenProps> = ({
  question,
  cards,
  players,
  scoreBreakdowns,
  currentStep,
  currentRound,
  totalRounds,
  onProceedToStep7,
  onNextRoundOrFinish,
}) => {
  const [subPhase, setSubPhase] = useState<RevealSubPhase>(
    currentStep === 7 ? 'D' : 'A'
  );

  // Automatic progressive reveal sequence (A -> B -> C -> D) during Step 6
  useEffect(() => {
    if (currentStep === 7) {
      setSubPhase('D');
      return;
    }

    setSubPhase('A');

    const timerB = setTimeout(() => {
      setSubPhase((prev) => {
        if (PHASE_ORDER[prev] < 2) {
          soundEngine.playPop(520);
          return 'B';
        }
        return prev;
      });
    }, 1000);

    const timerC = setTimeout(() => {
      setSubPhase((prev) => {
        if (PHASE_ORDER[prev] < 3) {
          soundEngine.playPop(620);
          return 'C';
        }
        return prev;
      });
    }, 2200);

    const timerD = setTimeout(() => {
      setSubPhase((prev) => {
        if (PHASE_ORDER[prev] < 4) {
          soundEngine.playReveal();
          return 'D';
        }
        return prev;
      });
    }, 3400);

    return () => {
      clearTimeout(timerB);
      clearTimeout(timerC);
      clearTimeout(timerD);
    };
  }, [currentStep, question.id]);

  const currentPhaseRank = PHASE_ORDER[subPhase];
  const showVotes = currentPhaseRank >= 2;
  const showBluffAuthors = currentPhaseRank >= 3;
  const showTruthSpotlight = currentPhaseRank >= 4;

  const getPlayer = (playerId: string) => players.find((p) => p.id === playerId);
  const getPlayerName = (playerId: string) => getPlayer(playerId)?.name || playerId;

  const getInitials = (name: string) => {
    const cleaned = name.replace(/^Le\s+/i, '').trim();
    return cleaned.slice(0, 2).toUpperCase();
  };

  const activePhaseMeta =
    SUB_PHASES.find((p) => p.id === subPhase) ?? SUB_PHASES[3];

  const officialTruth = question.truth || question.correctAnswer;
  const truthCard = cards.find((c) => c.isTruth);
  const truthAuthors = (truthCard?.authorIds ?? []).map(getPlayerName);

  return (
    <section aria-label="Révélation animée et scores de la manche" className="space-y-4">
      {/* Compact Progressive Sequence Controller Bar (A -> B -> C -> D) in Step 6 */}
      {currentStep === 6 && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono text-amber-400">
                Étape 6 · Séquence télévisée en direct
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">
                {activePhaseMeta.subtitle}
              </div>
            </div>

            {subPhase !== 'D' && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playReveal();
                  setSubPhase('D');
                }}
                className="min-h-[34px] px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Tout révéler</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
            {SUB_PHASES.map((phase) => {
              const isCurrent = subPhase === phase.id;
              const isReached = PHASE_ORDER[subPhase] >= PHASE_ORDER[phase.id];
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setSubPhase(phase.id)}
                  className={`min-h-[34px] px-2 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap truncate cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : isReached
                      ? 'text-slate-200 hover:text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {phase.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Column Grid: Left = Answer Cards, Right = Official Explanation & Round Scores */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Column 1 (7 cols on md+): Compact Revealed Answer Cards */}
        <div className="md:col-span-7 space-y-2.5">
          {cards.map((card, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const authorNames = card.authorIds.map(getPlayerName);
            const isTruthHighlighted = card.isTruth && showTruthSpotlight;
            const isBluffRevealed = !card.isTruth && showBluffAuthors;

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity:
                    showTruthSpotlight && !card.isTruth && card.voterIds.length === 0
                      ? 0.75
                      : 1,
                  y: 0,
                  scale: isTruthHighlighted ? 1.01 : 1,
                }}
                transition={{ duration: 0.18, delay: idx * 0.04 }}
                className={`rounded-2xl p-3.5 sm:p-4 border transition-colors duration-300 ${
                  isTruthHighlighted
                    ? 'bg-emerald-950/60 border-emerald-400 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-400/50'
                    : isBluffRevealed && card.voterIds.length > 0
                    ? 'bg-slate-900 border-amber-400/50 shadow-md shadow-amber-500/5'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Header row: Letter + Author / Truth status + Points pill */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                        isTruthHighlighted
                          ? 'bg-emerald-400 text-slate-950'
                          : isBluffRevealed
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>

                    <AnimatePresence mode="wait">
                      {isTruthHighlighted ? (
                        <motion.div
                          key="truth-badge"
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-300"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            VRAIE RÉPONSE
                            {authorNames.length > 0 && ` · Écrite par ${authorNames.join(', ')}`}
                          </span>
                        </motion.div>
                      ) : isBluffRevealed ? (
                        <motion.div
                          key="bluff-author"
                          initial={{ opacity: 0, y: -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-300"
                        >
                          <Drama className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Bluff de : <strong className="text-white">{authorNames.join(' & ')}</strong>
                            {authorNames.length > 1 && ' (Regroupée)'}
                          </span>
                        </motion.div>
                      ) : showBluffAuthors && card.isTruth ? (
                        <motion.span
                          key="suspense-truth"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs font-mono text-emerald-400/90"
                        >
                          Suspense... Aucun bluffeur !
                        </motion.span>
                      ) : (
                        <motion.span
                          key="anonymous-card"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-slate-400"
                        >
                          Auteur masqué
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {isTruthHighlighted && card.voterIds.length > 0 && (
                    <span className="text-[11px] font-mono tabular-nums font-bold text-emerald-300">
                      +2 pts / votant
                    </span>
                  )}
                  {isBluffRevealed && card.voterIds.length > 0 && (
                    <span className="text-[11px] font-mono tabular-nums font-bold text-amber-400">
                      +{card.voterIds.length} pt{card.voterIds.length > 1 ? 's' : ''} bluff
                    </span>
                  )}
                </div>

                {/* Card Text */}
                <p
                  className={`text-sm sm:text-base font-semibold leading-snug ${
                    isTruthHighlighted ? 'text-white' : 'text-slate-100'
                  }`}
                >
                  {card.text}
                </p>

                {/* Step B: Voters list */}
                <AnimatePresence>
                  {showVotes && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5"
                    >
                      {card.voterIds.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Votes :</span>
                          </span>
                          {card.voterIds.map((voterId, vIdx) => {
                            const voter = getPlayer(voterId);
                            const isHumanVoter = voter && !voter.isAI;
                            return (
                              <motion.div
                                key={voterId}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.14, delay: vIdx * 0.06 }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${
                                  isHumanVoter
                                    ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                                    : 'bg-slate-950 border-slate-700 text-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded font-mono text-[9px] font-bold flex items-center justify-center ${
                                    isHumanVoter
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {getInitials(voter?.name || voterId)}
                                </span>
                                <span>{voter?.name || voterId}</span>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Aucun vote reçu</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Column 2 (5 cols on md+): Side Panel with Official Explanation & Compact Round Score Summary */}
        <div className="md:col-span-5 space-y-3.5 md:sticky md:top-20">
          {/* Official Explanation Box */}
          <div
            className={`rounded-2xl p-4 border transition-colors ${
              showTruthSpotlight
                ? 'bg-emerald-950/45 border-emerald-400/60 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Explication officielle</span>
            </div>

            {showTruthSpotlight ? (
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-white">
                  {officialTruth}
                  {truthAuthors.length > 0 && (
                    <span className="text-xs font-normal text-emerald-300 ml-1.5">
                      (trouvée par {truthAuthors.join(', ')})
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                L'explication vérifiée s'affiche dès la révélation de la vraie réponse (étape D).
              </p>
            )}
          </div>

          {/* Round Score Details & Action CTA */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif-display">
                    Points de la manche {currentRound}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Vérité +2 pts · Bluff +1 pt/vote
                  </p>
                </div>
              </div>
            </div>

            {/* Compact 2x2 Grid on mobile, clean list on tablet/desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-1 gap-2">
              {players.map((player) => {
                const bd = scoreBreakdowns.find((b) => b.playerId === player.id);
                const truthPts = bd?.truthPoints ?? 0;
                const bluffPts = bd?.bluffPoints ?? 0;
                const roundTotal = bd?.totalRoundPoints ?? 0;
                const fooledNames = (bd?.fooledPlayerIds ?? []).map(getPlayerName);

                return (
                  <div
                    key={player.id}
                    className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                      !player.isAI
                        ? 'bg-amber-400/10 border-amber-400/30'
                        : 'bg-slate-950/70 border-slate-800/90'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            !player.isAI ? 'text-amber-300' : 'text-white'
                          }`}
                        >
                          {player.name}
                        </span>
                        {currentStep === 7 && (
                          <span className="text-[11px] font-mono tabular-nums text-slate-400">
                            ({player.score} pts)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {truthPts > 0 ? 'Vérité +2' : 'Vérité 0'}
                        {' · '}
                        {bluffPts > 0
                          ? `Bluff +${bluffPts} (${fooledNames.join(', ')})`
                          : 'Bluff 0'}
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-mono tabular-nums">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          roundTotal > 0 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        +{roundTotal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {currentStep === 6 ? (
              <button
                type="button"
                onClick={onProceedToStep7}
                className="w-full min-h-[48px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-transform active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 cursor-pointer"
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>Valider et comptabiliser les points</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onNextRoundOrFinish}
                className="w-full min-h-[48px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-transform active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 cursor-pointer"
              >
                <span>
                  {currentRound < totalRounds
                    ? `Manche suivante (${currentRound + 1}/${totalRounds})`
                    : 'Voir le classement final'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
