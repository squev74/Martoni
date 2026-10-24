import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'VOTRE_CLE_API_GEMINI_ICI') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Correcteur orthographique et grammatical français de secours (via l'API publique LanguageTool)
 * utilisé si le quota Gemini est atteint afin que la réponse du joueur soit toujours corrigée.
 */
async function spellcheckFrenchFallback(rawText: string): Promise<string> {
  if (!rawText || !rawText.trim()) return rawText;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const params = new URLSearchParams();
    params.set('language', 'fr');
    params.set('text', rawText.trim());

    const resp = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!resp.ok) return rawText;

    const data = (await resp.json()) as {
      matches?: Array<{
        offset: number;
        length: number;
        replacements?: Array<{ value: string }>;
      }>;
    };

    if (!Array.isArray(data.matches) || data.matches.length === 0) {
      return rawText;
    }

    // Appliquer les corrections de droite à gauche pour ne pas décaler les offsets
    let corrected = rawText.trim();
    const sortedMatches = [...data.matches]
      .filter((m) => Array.isArray(m.replacements) && m.replacements.length > 0)
      .sort((a, b) => b.offset - a.offset);

    for (const match of sortedMatches) {
      const replacement = match.replacements?.[0]?.value;
      if (replacement) {
        corrected =
          corrected.slice(0, match.offset) +
          replacement +
          corrected.slice(match.offset + match.length);
      }
    }

    return corrected;
  } catch {
    clearTimeout(timeout);
    return rawText;
  }
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<typeof ai.models.generateContent>[0], 'model'>
) {
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: modelName,
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Appel unique structuré pour corriger la réponse du joueur ET générer les 3 bluffs d'IA
  app.post('/api/gemini/generate-bluffs', async (req, res) => {
    const { question, truth, rawUserAnswer, userAnswer } = req.body as {
      question?: string;
      truth?: string;
      rawUserAnswer?: string;
      userAnswer?: string;
    };

    const playerRawText = (rawUserAnswer ?? userAnswer ?? '').trim();

    if (!question || !truth) {
      res.status(400).json({ error: 'Paramètres question et truth requis.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      if (!ai) {
        throw new Error('Clé API Gemini absente');
      }

      const systemInstruction = `Tu es le moteur d'un jeu de bluff en français.
Tu dois remplir 4 missions en un seul objet JSON structuré :
1. Corriger la réponse brute du joueur humain ('userCorrected') : corrige toutes les fautes d'orthographe (ex: "crotes" -> "crottes"), les accords pluriels ("des crottes cubique" -> "des crottes cubiques"), la grammaire, la syntaxe, les apostrophes et les majuscules sans JAMAIS changer le sens, afin que la phrase soit écrite en français impeccable.
2. Générer la réponse de LE FARFELU ('farfelu', température créative ~0.9 - 1.0) : totalement absurde, loufoque ou surprenante, mais rédigée avec un sérieux imperturbable comme une vraie encyclopédie (max 15 mots).
3. Générer la réponse de LE RUSÉ ('ruse', température analytique ~0.3 - 0.4) : hyper-crédible, scientifiquement ou historiquement plausible, ressemblant à une vraie réponse de culture générale (max 15 mots).
4. Générer la réponse de LE MANIPULATEUR ('manipulateur', température tactique ~0.7) : tend un piège psychologique avec un chiffre très précis, un nom propre inventé ou une fausse idée reçue (max 15 mots).

Les 3 réponses IA ne doivent PAS révéler la vraie réponse officielle et ne doivent PAS copier la réponse du joueur.`;

      const prompt = `Tu es le moteur d'un jeu de bluff en français.
Question : '${question}'
Vraie réponse officielle : '${truth}'
Réponse brute du joueur humain : '${playerRawText}'

Remplis les 4 champs JSON :
1. 'userCorrected' : Réécris la réponse du joueur humain en corrigeant l'orthographe, les accords au pluriel, la grammaire, la ponctuation et les majuscules. Garde EXACTEMENT le même sens.
2. 'farfelu' : Fausse réponse absurde/décalée mais rédigée sérieusement (max 15 mots).
3. 'ruse' : Fausse réponse très crédible et scientifiquement/historiquement plausible (max 15 mots).
4. 'manipulateur' : Fausse réponse trompeuse avec un piège ou un détail précis (max 15 mots).`;

      const response = await generateWithModelFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.75,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              userCorrected: {
                type: Type.STRING,
                description:
                  "Réponse du joueur humain corrigée (orthographe, accords, grammaire, ponctuation et majuscules) en gardant EXACTEMENT le même sens.",
              },
              farfelu: {
                type: Type.STRING,
                description:
                  'Fausse réponse absurde/décalée mais rédigée sérieusement (max 15 mots).',
              },
              ruse: {
                type: Type.STRING,
                description:
                  'Fausse réponse très crédible et scientifiquement/historiquement plausible (max 15 mots).',
              },
              manipulateur: {
                type: Type.STRING,
                description:
                  'Fausse réponse trompeuse avec un piège ou un détail précis (max 15 mots).',
              },
            },
            required: ['userCorrected', 'farfelu', 'ruse', 'manipulateur'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Réponse vide reçue de Gemini');
      }

      const parsed = JSON.parse(rawText.trim());
      if (
        typeof parsed.userCorrected !== 'string' ||
        typeof parsed.farfelu !== 'string' ||
        typeof parsed.ruse !== 'string' ||
        typeof parsed.manipulateur !== 'string'
      ) {
        throw new Error('Structure JSON invalide');
      }

      res.json({
        userCorrected: parsed.userCorrected.trim() || playerRawText,
        farfelu: parsed.farfelu.trim(),
        ruse: parsed.ruse.trim(),
        manipulateur: parsed.manipulateur.trim(),
      });
    } catch {
      // Si Gemini est hors-quota (429), on corrige quand même la phrase du joueur via le correcteur grammatical
      const spellcheckedUser = await spellcheckFrenchFallback(playerRawText);
      res.status(200).json({
        userCorrected: spellcheckedUser,
        fallbackOnlyUserCorrected: true,
      });
    }
  });

  // 2. Appel de fin de partie : Commentaire humoristique du présentateur TV + Badges personnalisés
  app.post('/api/gemini/end-game-comment', async (req, res) => {
    try {
      const { players, stats } = req.body;

      if (!Array.isArray(players)) {
        res.status(400).json({ error: 'Liste des joueurs requise.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({ error: 'Clé API Gemini absente ou non configurée.' });
        return;
      }

      const formattedStats = JSON.stringify({ players, stats }, null, 2);

      const prompt = `Tu es le présentateur cynique et humoristique d'un jeu TV de bluff.
Voici le bilan de la partie : ${formattedStats}.
Génère un objet JSON structuré :
{
  "summary": "2 phrases d'analyse mordante et humoristique sur le déroulement de la partie.",
  "badges": [
    {"player": "Nom", "badge": "Titre du badge (ex: Le Roi du Pipo, L'Infiltré, Le Pigeon)", "reason": "Courte explication"}
  ]
}`;

      const response = await generateWithModelFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            "Tu es le présentateur cynique, spirituel et piquant d'un grand jeu télévisé de bluff en français. Attribue exactement 1 badge savoureux à chacun des 4 participants en fonction de leurs performances réelles.",
          temperature: 0.85,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  '2 phrases d’analyse mordante et humoristique sur le déroulement de la partie et les scores.',
              },
              badges: {
                type: Type.ARRAY,
                description: 'Liste des badges attribués aux 4 participants.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    player: {
                      type: Type.STRING,
                      description: 'Nom exact du participant.',
                    },
                    badge: {
                      type: Type.STRING,
                      description: 'Titre humoristique du badge (ex: Le Roi du Pipo, L’Infiltré, Le Pigeon).',
                    },
                    reason: {
                      type: Type.STRING,
                      description: 'Courte explication mordante en 1 phrase.',
                    },
                  },
                  required: ['player', 'badge', 'reason'],
                },
              },
            },
            required: ['summary', 'badges'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({ error: 'Réponse vide reçue de Gemini.' });
        return;
      }

      const parsed = JSON.parse(rawText.trim());
      if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.badges)) {
        res.status(502).json({ error: 'Structure JSON invalide pour le bilan de fin de partie.' });
        return;
      }

      res.json({
        summary: parsed.summary.trim(),
        badges: parsed.badges,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur serveur Gemini';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
