import { Question } from '../types/game';

export const SEEN_QUESTIONS_STORAGE_KEY = 'bluff_seen_questions';

/**
 * Récupère la liste des IDs de questions déjà jouées depuis le localStorage (`bluff_seen_questions`).
 */
export function getSeenQuestionIds(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SEEN_QUESTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Ajoute un ID de question (ou plusieurs IDs) à la liste des questions déjà vues dans le localStorage.
 */
export function markQuestionAsSeen(id: string | string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const currentIds = new Set(getSeenQuestionIds());
    if (Array.isArray(id)) {
      id.forEach((item) => {
        if (item) currentIds.add(item);
      });
    } else if (id) {
      currentIds.add(id);
    }
    window.localStorage.setItem(
      SEEN_QUESTIONS_STORAGE_KEY,
      JSON.stringify(Array.from(currentIds))
    );
  } catch {
    // Ignore localStorage quota / private browsing errors
  }
}

/**
 * Réinitialise manuellement ou automatiquement l'historique des questions vues dans le localStorage.
 */
export function resetQuestionHistory(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(SEEN_QUESTIONS_STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Mélange un tableau de manière aléatoire (algorithme de Fisher-Yates).
 */
function shuffleQuestions<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Normalise une entrée de `questions.json` pour garantir la présence de `truth` et `correctAnswer`.
 */
function normalizeQuestionRecord(q: Question): Question {
  const officialTruth = (q.truth || q.correctAnswer || '').trim();
  return {
    ...q,
    truth: officialTruth,
    correctAnswer: officialTruth,
  };
}

/**
 * Tire `count` questions aléatoires sans remise en s'appuyant sur `localStorage` (`bluff_seen_questions`) :
 * 1. Filtre `allQuestions` pour exclure les ID déjà vus.
 * 2. Si le nombre de questions restantes est inférieur à `count` (ex: moins de 4),
 *    réinitialise `bluff_seen_questions` pour recommencer un cycle complet.
 * 3. Mélange, enregistre les nouveaux IDs comme vus et renvoie les `count` questions.
 */
export function getRandomQuestions(
  count: number,
  allQuestions: Question[]
): Question[] {
  const normalizedAll = allQuestions.map(normalizeQuestionRecord);
  const seenIds = new Set(getSeenQuestionIds());

  let unseenPool = normalizedAll.filter((q) => !seenIds.has(q.id));

  // Si moins de `count` questions disponibles, on réinitialise l'historique pour un nouveau cycle complet
  if (unseenPool.length < count) {
    resetQuestionHistory();
    unseenPool = normalizedAll;
  }

  const selected = shuffleQuestions(unseenPool).slice(0, count);

  // Marquer immédiatement les questions tirées comme vues
  markQuestionAsSeen(selected.map((q) => q.id));

  return selected;
}

/**
 * Retourne l'état actuel de la banque de questions (nombre de questions vues vs restantes).
 */
export function getQuestionBankStatus(allQuestions: Question[]): {
  seenCount: number;
  remainingCount: number;
  totalCount: number;
} {
  const totalCount = allQuestions.length;
  const validIds = new Set(allQuestions.map((q) => q.id));
  const seenCount = getSeenQuestionIds().filter((id) => validIds.has(id)).length;
  return {
    seenCount,
    remainingCount: Math.max(0, totalCount - seenCount),
    totalCount,
  };
}
