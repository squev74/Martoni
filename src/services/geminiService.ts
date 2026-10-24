import questionsData from '../data/questions.json';
import {
  EndGameBadge,
  EndGameComment,
  EndGameStatsPayload,
  Player,
  Question,
} from '../types/game';
import {
  areAnswersSimilar,
  normalizeDisplayAnswer,
  polishFallbackUserAnswer,
} from '../utils/answerMatcher';

/**
 * Structure exacte des 4 champs JSON retournés par Gemini :
 * 1. userCorrected : Réponse du joueur corrigée (orthographe, grammaire, ponctuation, majuscules) en gardant exactement le même sens.
 * 2. farfelu : Fausse réponse absurde/décalée mais rédigée sérieusement (max 15 mots).
 * 3. ruse : Fausse réponse très crédible et scientifiquement/historiquement plausible (max 15 mots).
 * 4. manipulateur : Fausse réponse trompeuse avec un piège ou un détail précis (max 15 mots).
 */
export interface GeneratedAiBluffs {
  userCorrected: string;
  farfelu: string;
  ruse: string;
  manipulateur: string;
}

export interface GenerateAiAnswersResult extends GeneratedAiBluffs {
  source: 'gemini' | 'fallback';
}

export const AI_PERSONA_GUIDELINES = {
  farfelu: {
    recommendedTemperature: 0.95,
    instruction:
      "Génère une réponse totalement absurde, loufoque ou surprenante, mais rédigée avec un sérieux imperturbable comme s'il s'agissait d'une vraie encyclopédie.",
  },
  ruse: {
    recommendedTemperature: 0.35,
    instruction:
      'Génère une réponse hyper-crédible, scientifiquement ou historiquement plausible. Elle doit ressembler à une vraie réponse de culture générale et sembler plus vraie que la vérité elle-même.',
  },
  manipulateur: {
    recommendedTemperature: 0.7,
    instruction:
      'Génère une réponse qui tend un piège psychologique (ex: un chiffre très précis, un nom propre inventé, une explication logique qui confirme une fausse idée reçue).',
  },
} as const;

const DEFAULT_FALLBACK_POOL = {
  farfelu: [
    'Une brigade secrète de pigeons facteurs décorés par décret ministériel',
    'L’obligation légale de saluer les statues municipales avec un chapeau melon',
    'Une horloge astronomique alimentée au fromage fermenté d’alpage',
  ],
  ruse: [
    'Un dispositif expérimental conçu par les ingénieurs militaires en 1924',
    'Une convention maritime signée à Genève après la Première Guerre mondiale',
    'Un procédé chimique breveté à l’origine pour l’industrie textile',
  ],
  manipulateur: [
    'Une ordonnance préfectorale instaurée suite aux 14 jours de gel de 1956',
    'Le protocole du professeur Lindqvist adopté par 17 académies en 1898',
    'Une réserve diplomatique de 450 caisses scellées à la Banque centrale',
  ],
};

function pickDistinctRandom(pool: string[], avoidText: string): string {
  const candidates = pool.filter((item) => !areAnswersSimilar(item, avoidText));
  const source = candidates.length > 0 ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)];
}

/**
 * Récupère les réponses de secours dans `questions.json` et applique un nettoyage
 * orthographique de base sur la réponse du joueur.
 */
function getFallbackAnswers(questionText: string, rawUserAnswer: string): GenerateAiAnswersResult {
  const questions = questionsData as Question[];
  const matched = questions.find(
    (q) => q.question.trim().toLowerCase() === questionText.trim().toLowerCase()
  );

  const pool = matched?.aiBluffs ?? DEFAULT_FALLBACK_POOL;
  const userCorrected = polishFallbackUserAnswer(rawUserAnswer);

  return {
    userCorrected,
    farfelu: pickDistinctRandom(pool.farfelu, userCorrected),
    ruse: pickDistinctRandom(pool.ruse, userCorrected),
    manipulateur: pickDistinctRandom(pool.manipulateur, userCorrected),
    source: 'fallback',
  };
}

/**
 * Appelle Gemini en un seul appel JSON structuré pour :
 * 1. Corriger l'orthographe, la syntaxe et les majuscules de la réponse du joueur ('userCorrected').
 * 2. Générer les 3 fausses réponses des IA ('farfelu', 'ruse', 'manipulateur').
 *
 * @param question La question insolite posée
 * @param truth La vraie réponse officielle
 * @param rawUserAnswer La réponse brute saisie par le joueur humain
 */
export async function generateAiAnswers(
  question: string,
  truth: string,
  rawUserAnswer: string
): Promise<GenerateAiAnswersResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8500);

  try {
    const response = await fetch('/api/gemini/generate-bluffs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        truth,
        rawUserAnswer,
        personaGuidelines: AI_PERSONA_GUIDELINES,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Statut HTTP ${response.status}`);
    }

    const data = (await response.json()) as Partial<GeneratedAiBluffs> & {
      fallbackOnlyUserCorrected?: boolean;
    };

    if (
      typeof data.userCorrected === 'string' &&
      data.userCorrected.trim().length > 0 &&
      typeof data.farfelu === 'string' &&
      data.farfelu.trim().length > 0 &&
      typeof data.ruse === 'string' &&
      data.ruse.trim().length > 0 &&
      typeof data.manipulateur === 'string' &&
      data.manipulateur.trim().length > 0
    ) {
      return {
        userCorrected: normalizeDisplayAnswer(data.userCorrected),
        farfelu: normalizeDisplayAnswer(data.farfelu),
        ruse: normalizeDisplayAnswer(data.ruse),
        manipulateur: normalizeDisplayAnswer(data.manipulateur),
        source: 'gemini',
      };
    }

    if (data.fallbackOnlyUserCorrected && typeof data.userCorrected === 'string') {
      return getFallbackAnswers(question, data.userCorrected);
    }

    throw new Error('Réponse JSON incomplète');
  } catch {
    clearTimeout(timeoutId);
    return getFallbackAnswers(question, rawUserAnswer);
  }
}

/**
 * Génère un commentaire cynique et humoristique de secours basé sur les vraies statistiques
 * de la partie si l'appel API Gemini échoue ou n'est pas configuré.
 */
function buildFallbackEndGameComment(
  players: Player[],
  stats: EndGameStatsPayload
): EndGameComment {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const human = players.find((p) => !p.isAI) ?? sorted[0];

  const firstSentence =
    winner && !winner.isAI
      ? `Incroyable mais vrai : ${human.name} vient d'humilier trois algorithmes surentraînés avec ${human.score} points au compteur et un aplomb digne d'un vendeur d'encyclopédies !`
      : `Triste soirée pour l'espèce humaine : ${winner?.name} rafle la mise avec ${winner?.score} points pendant que ${human.name} révisait visiblement ses classiques sur des boîtes de céréales.`;

  const secondSentence =
    stats.humanBluffsSucceeded >= 2
      ? `Avec ${stats.humanBluffsSucceeded} IA tombées dans vos filets et ${stats.humanTruthsFound} vérité(s) débusquée(s), même ${stats.topAiBlufferName} (${stats.topAiBlufferCount} bluff(s)) a failli demander une mise à jour de son pare-feu.`
      : `Entre vos ${stats.humanTruthsFound} vérité(s) trouvée(s) sur 4 et les ${stats.topAiBlufferCount} intox magistrales de ${stats.topAiBlufferName}, le détecteur de mensonges du plateau vient officiellement de démissionner.`;

  const badges: EndGameBadge[] = players.map((p) => {
    if (!p.isAI) {
      if (p.bluffsSucceeded >= 3) {
        return {
          player: p.name,
          badge: 'Le Roi du Pipo',
          reason: `A fait avaler ${p.bluffsSucceeded} salades monumentales aux IA sans cligner des yeux.`,
        };
      }
      if (p.truthsFound >= 3) {
        return {
          player: p.name,
          badge: 'L’Œil de Lynx',
          reason: `A flairé la vraie réponse ${p.truthsFound} fois sur 4 malgré un océan de mensonges.`,
        };
      }
      if (p.score === 0) {
        return {
          player: p.name,
          badge: 'Le Pigeon d’Or',
          reason: 'A plongé tête la première dans tous les pièges tendus sur le plateau.',
        };
      }
      return {
        player: p.name,
        badge: 'L’Apprenti Mytho',
        reason: `${p.score} points glanés à la sueur du front entre intuition honnête et demi-mensonges.`,
      };
    }

    if (p.personality === 'ruse') {
      return {
        player: p.name,
        badge: p.bluffsSucceeded >= 2 ? 'L’Infiltré Académique' : 'Le Premier de la Classe',
        reason: `${p.truthsFound} vérité(s) trouvée(s) et ${p.bluffsSucceeded} adversaire(s) berné(s) avec un sérieux professoral.`,
      };
    }

    if (p.personality === 'manipulateur') {
      return {
        player: p.name,
        badge: p.bluffsSucceeded >= 2 ? 'Le Maître Chanteur' : 'Le Stratège de l’Ombre',
        reason: `A glissé des détails si précis qu'il a récolté ${p.score} points au total.`,
      };
    }

    return {
      player: p.name,
      badge: p.bluffsSucceeded >= 1 ? 'Le Génie Incompris' : 'Le Poète Lunaire',
      reason:
        p.bluffsSucceeded >= 1
          ? `A réussi l'exploit de faire voter ${p.bluffsSucceeded} personne(s) pour une théorie complètement loufoque.`
          : 'Ses théories absurdes ont fait rire la régie, à défaut de convaincre le jury.',
    };
  });

  return {
    summary: `${firstSentence} ${secondSentence}`,
    badges,
    source: 'fallback',
  };
}

/**
 * Génère le commentaire cynique du présentateur TV et les badges personnalisés de fin de partie
 * à l'issue de la manche 4.
 */
export async function generateEndGameComment(
  players: Player[],
  stats?: EndGameStatsPayload
): Promise<EndGameComment> {
  const human = players.find((p) => !p.isAI);
  const aiPlayers = players.filter((p) => p.isAI);
  const topAi = [...aiPlayers].sort(
    (a, b) => b.bluffsSucceeded - a.bluffsSucceeded || b.score - a.score
  )[0];

  const computedStats: EndGameStatsPayload = stats ?? {
    humanName: human?.name ?? 'Vous',
    humanTruthsFound: human?.truthsFound ?? 0,
    humanBluffsSucceeded: human?.bluffsSucceeded ?? 0,
    topAiBlufferName: topAi?.name ?? 'Le Rusé',
    topAiBlufferCount: topAi?.bluffsSucceeded ?? 0,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch('/api/gemini/end-game-comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        players: players.map((p) => ({
          name: p.name,
          isAI: p.isAI,
          score: p.score,
          truthsFound: p.truthsFound,
          bluffsSucceeded: p.bluffsSucceeded,
        })),
        stats: computedStats,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Statut HTTP ${response.status}`);
    }

    const data = (await response.json()) as Partial<EndGameComment>;

    if (
      typeof data.summary === 'string' &&
      data.summary.trim().length > 0 &&
      Array.isArray(data.badges) &&
      data.badges.length > 0
    ) {
      return {
        summary: data.summary.trim(),
        badges: data.badges,
        source: 'gemini',
      };
    }

    throw new Error('Format JSON incomplet');
  } catch {
    clearTimeout(timeoutId);
    return buildFallbackEndGameComment(players, computedStats);
  }
}
