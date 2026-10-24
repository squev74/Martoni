import React from 'react';
import { Lock } from 'lucide-react';
import { Question, RoundStep } from '../types/game';

interface QuestionCardProps {
  question: Question;
  roundNumber: number;
  totalRounds: number;
  currentStep: RoundStep;
}

const STEP_LABELS: Record<RoundStep, string> = {
  1: 'Phase 1 · Lecture & Saisie de votre bluff',
  2: 'Phase 1 · Lecture & Saisie de votre bluff',
  3: 'Phase 2 · Génération des bluffs IA',
  4: 'Phase 3 · Mélange des réponses',
  5: 'Phase 3 · Vote secret',
  6: 'Phase 4 · Révélation des auteurs',
  7: 'Phase 5 · Explication & Points',
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  roundNumber,
  totalRounds,
  currentStep,
}) => {
  const isTruthRevealed = currentStep >= 6;
  const officialTruth = question.truth || question.correctAnswer;

  return (
    <section
      aria-label="Question de la manche"
      className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-xl"
    >
      {/* Clean unboxed metadata with typographic separators */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-3">
        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="text-amber-400 font-semibold">
            Manche {roundNumber} / {totalRounds}
          </span>
          <span aria-hidden="true">·</span>
          <span>{question.category}</span>
        </div>
        <div className="font-mono tabular-nums text-slate-400">
          {STEP_LABELS[currentStep]}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="grid grid-cols-6 gap-1.5 mb-4"
        role="progressbar"
        aria-valuenow={Math.max(1, currentStep - 1)}
        aria-valuemin={1}
        aria-valuemax={6}
      >
        {([2, 3, 4, 5, 6, 7] as RoundStep[]).map((step) => (
          <div
            key={step}
            className={`h-1 rounded-full transition-colors duration-200 ${
              step <= Math.max(2, currentStep) ? 'bg-amber-400' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Main Question Headline */}
      <h2 className="text-lg sm:text-2xl font-bold text-white font-serif-display leading-snug mb-3">
        {question.question}
      </h2>

      {/* Hidden or Revealed official answer indicator */}
      {!isTruthRevealed ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2.5 border-t border-slate-800/80">
          <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
          <span>
            Réponse exacte scellée · Rédigez directement votre réponse ci-dessous
          </span>
        </div>
      ) : (
        <div className="pt-2.5 border-t border-emerald-500/30 text-xs text-emerald-300 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Vérité officielle :</span>
          <span className="text-white font-medium">{officialTruth}</span>
        </div>
      )}
    </section>
  );
};
