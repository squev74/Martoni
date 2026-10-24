import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, Shuffle } from 'lucide-react';
import { AnswerCard, RoundStep } from '../types/game';

interface VoteScreenProps {
  cards: AnswerCard[];
  currentStep: RoundStep;
  onSubmitVote: (cardId: string) => void;
}

export const VoteScreen: React.FC<VoteScreenProps> = ({
  cards,
  currentStep,
  onSubmitVote,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Count if any responses were merged (5 total items: 4 players + 1 truth -> if < 5 cards, at least one merge occurred)
  const mergedCount = Math.max(0, 5 - cards.length);

  const handleConfirmVote = () => {
    if (!selectedCardId) return;
    onSubmitVote(selectedCardId);
  };

  return (
    <section aria-label="Cartes de réponses et vote secret" className="space-y-4">
      {/* Header banner for Step 4 & Step 5 */}
      <div className="rounded-2xl bg-slate-900/75 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <Shuffle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {currentStep === 4
                ? 'Étape 4 : Mélange des propositions anonymes...'
                : 'Étape 5 : Vote secret — Trouvez la vraie réponse officielle'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Les auteurs sont masqués. Vous ne pouvez pas voter pour votre propre proposition.
            {mergedCount > 0 &&
              ` (${mergedCount} réponse${mergedCount > 1 ? 's' : ''} identique${
                mergedCount > 1 ? 's' : ''
              } regroupée${mergedCount > 1 ? 's' : ''} sur une même carte)`}
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
          {cards.length} cartes en lice
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {cards.map((card, index) => {
          const isOwnCard = card.authorIds.includes('human');
          const isSelected = selectedCardId === card.id;
          const letter = String.fromCharCode(65 + index);

          return (
            <button
              key={card.id}
              type="button"
              disabled={isOwnCard}
              onClick={() => setSelectedCardId(card.id)}
              className={`w-full text-left rounded-2xl p-4 sm:p-5 border transition-all min-h-[72px] flex items-start justify-between gap-4 ${
                isOwnCard
                  ? 'bg-slate-900/40 border-slate-800/70 opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'bg-[#FAF8F5] text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 cursor-pointer'
                  : 'bg-slate-900 hover:bg-slate-800/90 text-slate-100 border-slate-800 hover:border-slate-700 cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                    isOwnCard
                      ? 'bg-slate-800 text-slate-500'
                      : isSelected
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  {letter}
                </span>
                <div className="space-y-1">
                  <p
                    className={`text-base sm:text-lg font-medium leading-snug ${
                      isSelected ? 'text-slate-950 font-semibold' : 'text-white'
                    }`}
                  >
                    {card.text}
                  </p>
                  {isOwnCard && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/90">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Votre réponse corrigée
                        {card.authorIds.length > 1
                          ? ` (regroupée avec ${card.authorIds.length - 1} autre réponse similaire)`
                          : ''}{' '}
                        · Vote interdit
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!isOwnCard && (
                <div className="shrink-0 self-center">
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-slate-950 bg-slate-950 text-amber-400'
                        : 'border-slate-700 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm Secret Vote Button */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!selectedCardId}
          onClick={handleConfirmVote}
          className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Confirmer mon vote secret</span>
        </button>
      </div>
    </section>
  );
};
