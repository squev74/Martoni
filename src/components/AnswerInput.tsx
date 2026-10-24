import React, { useState } from 'react';
import {
  Send,
  Lightbulb,
  Users,
  ArrowRight,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Question, RoundStep } from '../types/game';
import { normalizeDisplayAnswer } from '../utils/answerMatcher';

interface AnswerInputProps {
  question: Question;
  currentStep: RoundStep;
  onSubmitAnswer: (text: string, forceDuplicateWithAI?: boolean) => void;
  onSkipAIWait: () => void;
}

const BLUFF_TIPS = [
  {
    title: 'Invente un chiffre précis',
    example: 'Ex : « 14 tonnes », « en 1924 », « à 50 mètres » donnent une illusion de vérité.',
  },
  {
    title: 'Utilise un mot technique',
    example: 'Ex : cite un décret municipal, un alliage de laiton ou un procédé scientifique.',
  },
  {
    title: 'Sois absurde',
    example: 'Ex : formule une idée totalement saugrenue avec le ton sérieux d’une encyclopédie.',
  },
];

export const AnswerInput: React.FC<AnswerInputProps> = ({
  question,
  currentStep,
  onSubmitAnswer,
  onSkipAIWait,
}) => {
  const [text, setText] = useState('');
  const [showInspiration, setShowInspiration] = useState(false);
  const [simulateDuplicate, setSimulateDuplicate] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmitAnswer(text, simulateDuplicate);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
    setShowInspiration(false);
  };

  if (currentStep === 3) {
    return (
      <div className="rounded-3xl bg-slate-900/75 border border-slate-800 p-6 sm:p-8 text-center space-y-5">
        <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-mono text-amber-400">
            Appel Gemini Flash (JSON structuré)
          </p>
          <h3 className="text-lg sm:text-xl font-bold text-white font-serif-display">
            Les IA rédigent leurs réponses...
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Correction orthographique de votre réponse et génération simultanée des bluffs du Rusé, du Manipulateur et du Farfelu.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/90 p-3.5">
            <div className="text-xs font-semibold text-white">Le Rusé</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Formule une piste historique plausible...</div>
          </div>
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/90 p-3.5">
            <div className="text-xs font-semibold text-white">Le Manipulateur</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Prépare un détail trompeur précis...</div>
          </div>
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/90 p-3.5">
            <div className="text-xs font-semibold text-white">Le Farfelu</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Invente une théorie décalée...</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSkipAIWait}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Passer l'attente (utiliser les réponses de secours)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-900/75 border border-slate-800 p-5 sm:p-6 space-y-4">
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor="bluff-answer-input"
              className="block text-sm font-semibold text-slate-200"
            >
              Votre réponse (sincère ou bluff)
            </label>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {text.trim().length} car.
            </span>
          </div>

          <textarea
            id="bluff-answer-input"
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrivez votre bluff ou la vraie réponse ici..."
            className="w-full rounded-2xl bg-slate-950 border border-slate-700/90 focus:border-amber-400 focus:outline-none px-4 py-3 text-base text-white placeholder:text-slate-500 transition-colors resize-none"
          />

          {/* Live normalized preview */}
          {text.trim().length > 0 && (
            <div className="mt-2 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex items-start gap-2 text-xs">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-slate-400">Aperçu corrigé sur la carte : </span>
                <span className="text-emerald-300 font-semibold break-words">
                  {normalizeDisplayAnswer(text)}
                </span>
              </div>
            </div>
          )}

          {/* Discreet Inspiration Toggle Button below text field */}
          <div className="mt-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowInspiration((prev) => !prev)}
              aria-expanded={showInspiration}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-amber-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>💡 Besoin d'inspiration ?</span>
              {showInspiration ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Collapsible Inspiration Panel */}
          {showInspiration && (
            <div className="mt-2.5 rounded-2xl bg-slate-950/95 border border-slate-800 p-4 space-y-3.5 text-xs">
              <div className="space-y-2">
                <div className="font-semibold text-amber-300">
                  3 pistes pour rédiger un bluff redoutable :
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {BLUFF_TIPS.map((tip, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-slate-900/90 border border-slate-800/80 p-2.5 space-y-1"
                    >
                      <div className="font-semibold text-white">{tip.title}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{tip.example}</p>
                    </div>
                  ))}
                </div>
              </div>

              {question.samplePlayerSuggestions && question.samplePlayerSuggestions.length > 0 && (
                <div className="space-y-1.5 pt-2.5 border-t border-slate-800/80">
                  <div className="text-slate-400">
                    Ou cliquez sur une idée prête à l'emploi :
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {question.samplePlayerSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="min-h-[34px] text-left text-xs px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 pt-2.5 border-t border-slate-800/80 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateDuplicate}
                  onChange={(e) => setSimulateDuplicate(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                />
                <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Tester le regroupement de carte : Le Manipulateur soumettra la même réponse que vous
                </span>
              </label>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!text.trim()}
          className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/10 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 shrink-0" />
          <span>Valider ma réponse</span>
        </button>
      </form>
    </div>
  );
};
