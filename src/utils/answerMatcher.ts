import questionsData from '../data/questions.json';

/**
 * Dictionnaire enrichi de corrections orthographiques, doubles consonnes et accents courants en français
 * pour garantir une correction instantanée dès la frappe et hors-ligne.
 */
const FRENCH_WORD_CORRECTIONS: Record<string, string> = {
  a: 'à',
  abattu: 'abattu',
  abattus: 'abattus',
  absorbeur: 'absorbeur',
  accord: 'accord',
  alcool: 'alcool',
  amande: 'amande',
  amende: 'amende',
  amiral: 'amiral',
  animal: 'animal',
  animaux: 'animaux',
  appareil: 'appareil',
  apesanteur: 'apesanteur',
  arbitre: 'arbitre',
  arbitres: 'arbitres',
  armee: 'armée',
  armees: 'armées',
  arrete: 'arrêté',
  astronaute: 'astronaute',
  atterrissage: 'atterrissage',
  atterrir: 'atterrir',
  australie: 'Australie',
  balle: 'balle',
  balles: 'balles',
  banquise: 'banquise',
  bataille: 'bataille',
  batailles: 'batailles',
  bille: 'bille',
  billes: 'billes',
  boite: 'boîte',
  boites: 'boîtes',
  bordeaux: 'Bordeaux',
  botte: 'botte',
  bottes: 'bottes',
  boule: 'boule',
  boules: 'boules',
  bouteile: 'bouteille',
  bouteiles: 'bouteilles',
  bouteille: 'bouteille',
  bouteilles: 'bouteilles',
  buffle: 'buffle',
  buffles: 'buffles',
  cacatoes: 'cacatoès',
  caillou: 'caillou',
  cailloux: 'cailloux',
  caisse: 'caisses',
  canada: 'Canada',
  canadien: 'canadien',
  canon: 'canon',
  canons: 'canons',
  capitaine: 'capitaine',
  capsule: 'capsule',
  capsules: 'capsules',
  carabine: 'carabine',
  carre: 'carré',
  carree: 'carrée',
  carrees: 'carrées',
  carres: 'carrés',
  chambre: 'chambre',
  chambres: 'chambres',
  chapeau: 'chapeau',
  chapeaux: 'chapeaux',
  chateau: 'château',
  chateaux: 'châteaux',
  chaussette: 'chaussette',
  chaussettes: 'chaussettes',
  cheval: 'cheval',
  chevaux: 'chevaux',
  colle: 'colle',
  colonel: 'colonel',
  colonie: 'colonie',
  commandant: 'commandant',
  concours: 'concours',
  cote: 'côté',
  cotes: 'côtés',
  cotiere: 'côtière',
  cotiers: 'côtiers',
  coussin: 'coussin',
  coussinet: 'coussinet',
  coussinets: 'coussinets',
  crapaud: 'crapaud',
  crapauds: 'crapauds',
  creer: 'créer',
  cree: 'créé',
  criquet: 'criquet',
  criquets: 'criquets',
  crote: 'crotte',
  crotes: 'crottes',
  crotte: 'crotte',
  crottes: 'crottes',
  cube: 'cube',
  cubes: 'cubes',
  cubik: 'cubique',
  cubiks: 'cubiques',
  cubique: 'cubique',
  cubiques: 'cubiques',
  danemark: 'Danemark',
  danois: 'danois',
  decret: 'décret',
  decrets: 'décrets',
  dentaire: 'dentaire',
  dentier: 'dentier',
  dentiers: 'dentiers',
  desert: 'désert',
  detacher: 'détacher',
  diplomatique: 'diplomatique',
  diplomatiques: 'diplomatiques',
  division: 'division',
  dromadaire: 'dromadaire',
  dromadaires: 'dromadaires',
  ecole: 'école',
  ecoles: 'écoles',
  ecosse: 'Écosse',
  ecossais: 'écossais',
  ecossaise: 'écossaise',
  edimbourg: 'Édimbourg',
  elephant: 'éléphant',
  elephants: 'éléphants',
  elite: 'élite',
  emeu: 'émeu',
  emeus: 'émeus',
  emues: 'émeus',
  empreinte: 'empreinte',
  empreintes: 'empreintes',
  epreuve: 'épreuve',
  epreuves: 'épreuves',
  erable: 'érable',
  escargot: 'escargot',
  escargots: 'escargots',
  espece: 'espèce',
  especes: 'espèces',
  essaim: 'essaim',
  etancheite: 'étanchéité',
  etat: 'état',
  etats: 'états',
  ete: 'été',
  etait: 'était',
  etaient: 'étaient',
  eternue: 'éternue',
  etranger: 'étranger',
  etude: 'étude',
  europe: 'Europe',
  excrement: 'excrément',
  excrements: 'excréments',
  facteur: 'facteur',
  facteurs: 'facteurs',
  fete: 'fête',
  fetes: 'fêtes',
  fenetre: 'fenêtre',
  fenetres: 'fenêtres',
  flotte: 'flotte',
  foret: 'forêt',
  forets: 'forêts',
  fourrure: 'fourrure',
  francais: 'français',
  francaise: 'française',
  france: 'France',
  fromage: 'fromage',
  fromages: 'fromages',
  fume: 'fumé',
  geant: 'géant',
  geante: 'géante',
  geants: 'géants',
  geantes: 'géantes',
  gendarme: 'gendarme',
  gendarmes: 'gendarmes',
  general: 'général',
  generaux: 'généraux',
  geodesique: 'géodésique',
  geodesiques: 'géodésiques',
  geometrique: 'géométrique',
  geometriques: 'géométriques',
  glace: 'glace',
  glande: 'glande',
  gout: 'goût',
  grace: 'grâce',
  guerre: 'guerre',
  hareng: 'hareng',
  harengs: 'harengs',
  harmonica: 'harmonica',
  heros: 'héros',
  hermetique: 'hermétique',
  homologue: 'homologué',
  homologuee: 'homologuée',
  homologues: 'homologués',
  honoraire: 'honoraire',
  hopital: 'hôpital',
  horde: 'horde',
  hotel: 'hôtel',
  humidite: 'humidité',
  hypnotise: 'hypnotisé',
  hypnotises: 'hypnotisés',
  iceberg: 'iceberg',
  icebergs: 'icebergs',
  idee: 'idée',
  idees: 'idées',
  ile: 'île',
  iles: 'îles',
  impot: 'impôt',
  impots: 'impôts',
  interdiction: 'interdiction',
  interet: 'intérêt',
  kangourou: 'kangourou',
  kangourous: 'kangourous',
  lapin: 'lapin',
  lapins: 'lapins',
  lettre: 'lettre',
  lettres: 'lettres',
  macoire: 'mâchoire',
  machoire: 'mâchoire',
  manchot: 'manchot',
  manchots: 'manchots',
  mannequin: 'mannequin',
  mannequins: 'mannequins',
  mastic: 'mastic',
  mecanique: 'mécanique',
  mecaniques: 'mécaniques',
  medicale: 'médicale',
  medicales: 'médicales',
  meme: 'même',
  memes: 'mêmes',
  merinos: 'mérinos',
  metal: 'métal',
  metaux: 'métaux',
  etre: 'être',
  metre: 'mètre',
  metres: 'mètres',
  millesime: 'millésimé',
  millesimee: 'millésimée',
  millesimees: 'millésimées',
  ministre: 'ministre',
  modelage: 'modelage',
  modeler: 'modeler',
  montgolfiere: 'montgolfière',
  mouton: 'mouton',
  moutons: 'moutons',
  mousse: 'mousse',
  munition: 'munition',
  munitions: 'munitions',
  museau: 'museau',
  nasa: 'NASA',
  nettoyant: 'nettoyant',
  nettoyer: 'nettoyer',
  neige: 'neige',
  norvege: 'Norvège',
  norvegien: 'norvégien',
  norvegienne: 'norvégienne',
  norvegiens: 'norvégiens',
  numero: 'numéro',
  officiel: 'officiel',
  officielle: 'officielle',
  oiseau: 'oiseau',
  oiseaux: 'oiseaux',
  onu: 'ONU',
  opera: 'opéra',
  oreille: 'oreille',
  oreilles: 'oreilles',
  ou: 'où',
  ovni: 'OVNI',
  ovnis: 'OVNI',
   pantoufle: 'pantoufle',
  pantoufles: 'pantoufles',
  papier: 'papier',
  papiers: 'papiers',
  parfume: 'parfumé',
  parfumee: 'parfumée',
  parfumees: 'parfumées',
  parfumes: 'parfumés',
  paris: 'Paris',
  pate: 'pâte',
  pates: 'pâtes',
  peche: 'pêche',
  peint: 'peint',
  pelerin: 'pèlerin',
  pelerins: 'pèlerins',
  perle: 'perle',
  perles: 'perles',
  perroquet: 'perroquet',
  perroquets: 'perroquets',
  petrole: 'pétrole',
  phoque: 'phoque',
  phoques: 'phoques',
  piece: 'pièce',
  pieces: 'pièces',
  piege: 'piège',
  pieges: 'pièges',
  pigeon: 'pigeon',
  pigeons: 'pigeons',
  pistolet: 'pistolet',
  plutot: 'plutôt',
  poele: 'poêle',
  poeles: 'poêles',
  poisson: 'poisson',
  poissons: 'poissons',
  polaire: 'polaire',
  pomme: 'pomme',
  pommes: 'pommes',
  posterieur: 'postérieur',
  premiere: 'première',
  president: 'président',
  presidents: 'présidents',
  pret: 'prêt',
  prete: 'prête',
  probleme: 'problème',
  problemes: 'problèmes',
  produit: 'produit',
  proliferation: 'prolifération',
  prothese: 'prothèse',
  protheses: 'prothèses',
  proteger: 'protéger',
  queue: 'queue',
  regiment: 'régiment',
  regle: 'règle',
  regles: 'règles',
  reine: 'reine',
  reponse: 'réponse',
  reponses: 'réponses',
  reseau: 'réseau',
  reserve: 'réserve',
  resine: 'résine',
  reveil: 'réveil',
  revolte: 'révolte',
  rocher: 'rocher',
  rochers: 'rochers',
  role: 'rôle',
  royal: 'royal',
  royale: 'royale',
  sandwich: 'sandwich',
  sandwichs: 'sandwichs',
  saumon: 'saumon',
  schnaps: 'schnaps',
  scelle: 'scellé',
  scellee: 'scellée',
  scellees: 'scellées',
  scelles: 'scellés',
  secrete: 'sécrète',
  securite: 'sécurité',
  seigle: 'seigle',
  sergent: 'sergent',
  serrurier: 'serrurier',
  serruriers: 'serruriers',
  siecle: 'siècle',
  siecles: 'siècles',
  sillon: 'sillon',
  sillons: 'sillons',
  sirop: 'sirop',
  soucoupe: 'soucoupe',
  soucoupes: 'soucoupes',
  sousmarin: 'sous-marin',
  sousmarins: 'sous-marins',
  syndique: 'syndiqué',
  syndiques: 'syndiqués',
  systeme: 'système',
  telephone: 'téléphone',
  temporelle: 'temporelle',
  temporelles: 'temporelles',
  termitiere: 'termitière',
  termitieres: 'termitières',
  terrier: 'terrier',
  tete: 'tête',
  tetes: 'têtes',
  theorie: 'théorie',
  theories: 'théories',
  tonneau: 'tonneau',
  tonneaux: 'tonneaux',
  tres: 'très',
  tresor: 'trésor',
  troisieme: 'troisième',
  vapeur: 'vapeur',
  vehicule: 'véhicule',
  verite: 'vérité',
  verre: 'verre',
  verres: 'verres',
  vivant: 'vivant',
  vivante: 'vivante',
  vivantes: 'vivantes',
  vivants: 'vivants',
  volant: 'volant',
  volante: 'volante',
  volantes: 'volantes',
  volants: 'volants',
  whisky: 'whisky',
  wisky: 'whisky',
  wombat: 'wombat',
  wombats: 'wombats',
};

const PROPER_NOUNS: Record<string, string> = {
  paris: 'Paris',
  france: 'France',
  australie: 'Australie',
  canada: 'Canada',
  danemark: 'Danemark',
  ecosse: 'Écosse',
  écosse: 'Écosse',
  norvege: 'Norvège',
  norvège: 'Norvège',
  edimbourg: 'Édimbourg',
  édimbourg: 'Édimbourg',
  bordeaux: 'Bordeaux',
  geneve: 'Genève',
  genève: 'Genève',
  arctique: 'Arctique',
  outback: 'Outback',
  seine: 'Seine',
  nasa: 'NASA',
  onu: 'ONU',
  ovni: 'OVNI',
};

/**
 * Mots invariables ou verbes/déterminants très fréquents qu'il ne faut jamais altérer par proximité floue.
 */
const PROTECTED_COMMON_WORDS = new Set([
  'il', 'ils', 'elle', 'elles', 'on', 'nous', 'vous',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'leur', 'leurs',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'qui', 'quoi', 'dont',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'vers', 'chez', 'entre', 'contre', 'avant', 'apres', 'après', 'depuis', 'pendant',
  'fait', 'faire', 'font', 'est', 'sont', 'ont', 'avoir', 'avait', 'peut', 'doit', 'veut', 'va', 'vont', 'met', 'mis', 'prit', 'pris',
  'plus', 'moins', 'tout', 'tous', 'toute', 'toutes', 'autre', 'autres', 'meme', 'même',
  'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'cent', 'mille',
]);

/**
 * Construit au démarrage un lexique de référence à partir du dictionnaire et de toutes les questions/réponses de `questions.json`
 * pour corriger automatiquement les fautes d'orthographe à distance de Levenshtein 1.
 */
const REFERENCE_VOCABULARY: string[] = (() => {
  const words = new Set<string>(Object.values(FRENCH_WORD_CORRECTIONS));
  const rawJson = JSON.stringify(questionsData);
  const matches = rawJson.match(/[a-zA-ZÀ-ÿ]{4,}/g) || [];
  for (const w of matches) {
    if (w === w.toLowerCase()) {
      words.add(w);
    }
  }
  return Array.from(words);
})();

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcule la distance d'édition de Levenshtein entre deux chaînes de caractères.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // suppression
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Cherche si un mot mal orthographié (ex: "crotes", "soucoups", "emues") est à distance 1
 * d'un mot connu du lexique français du jeu.
 */
function findClosestKnownWord(word: string): string {
  const lower = word.toLowerCase();
  if (PROTECTED_COMMON_WORDS.has(lower)) return word;
  if (PROPER_NOUNS[lower]) return PROPER_NOUNS[lower];
  if (FRENCH_WORD_CORRECTIONS[lower]) return FRENCH_WORD_CORRECTIONS[lower];

  const strippedInput = stripAccents(lower);
  if (FRENCH_WORD_CORRECTIONS[strippedInput]) {
    return FRENCH_WORD_CORRECTIONS[strippedInput];
  }

  // Si le mot existe déjà exactement dans le vocabulaire de référence, on le garde
  if (REFERENCE_VOCABULARY.includes(lower)) {
    return word;
  }

  // Recherche d'un mot du vocabulaire à distance de Levenshtein == 1 commençant par la même lettre
  if (lower.length >= 4) {
    const firstChar = strippedInput[0];
    const endsWithS = strippedInput.endsWith('s');
    let bestCandidate: string | null = null;

    for (const candidate of REFERENCE_VOCABULARY) {
      const strippedCand = stripAccents(candidate.toLowerCase());
      if (strippedCand[0] !== firstChar) continue;
      if (Math.abs(strippedCand.length - strippedInput.length) > 1) continue;

      // Préserver le nombre (singulier/pluriel en 's') si possible
      const candEndsWithS = strippedCand.endsWith('s');
      if (endsWithS !== candEndsWithS) continue;

      if (levenshteinDistance(strippedInput, strippedCand) === 1) {
        bestCandidate = candidate;
        break;
      }
    }

    if (bestCandidate) {
      return bestCandidate;
    }
  }

  return word;
}

/**
 * Met un nom ou un adjectif au pluriel selon les règles françaises standard.
 */
function pluralizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (/[sxz]$/.test(lower)) return word;
  if (
    [
      'whisky', 'schnaps', 'corned-beef', 'play-doh', 'bordeaux',
      'orange', 'marron', 'bleu', 'blanc', 'rouge', 'vert', 'jaune',
      'sur', 'dans', 'avec', 'sans', 'pour', 'par', 'en', 'de', 'du', 'et', 'ou',
      'qui', 'que', 'dont', 'son', 'sa', 'leur', 'leurs',
    ].includes(lower)
  ) {
    return word;
  }
  if (lower.endsWith('eau') || lower.endsWith('eu')) {
    return `${word}x`;
  }
  if (lower.endsWith('al') && !['bal', 'carnaval', 'festival', 'chacal', 'récital'].includes(lower)) {
    return `${word.slice(0, -2)}aux`;
  }
  return `${word}s`;
}

/**
 * Normalise et corrige une réponse pour l'affichage sur les cartes de vote :
 * - Supprime les espaces multiples, les espaces avant/après apostrophe et autour de la ponctuation
 * - Corrige les apostrophes manquantes ("l armee" -> "l'armée", "d un" -> "d'un", "c est" -> "c'est", "qu il" -> "qu'il")
 * - Corrige les élisions devant voyelle ("le oiseau" -> "l'oiseau", "la ecole" -> "l'école", "de eau" -> "d'eau")
 * - Corrige les fautes d'orthographe et d'accents ("crotes" -> "crottes", "emeus" -> "émeus", "pate" -> "pâte")
 * - Accorde au pluriel le nom ET l'adjectif qui suit un déterminant pluriel ("des crottes cubique" -> "des crottes cubiques")
 * - Harmonise la casse (Majuscule en début de phrase + noms propres) et retire le point final
 */
export function normalizeDisplayAnswer(rawText: string): string {
  if (!rawText) return '';

  // 1. Nettoyage des espaces et unification des apostrophes
  let text = rawText
    .trim()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ');

  // 2. Suppression des espaces autour des apostrophes (ex: "l ' armée" -> "l'armée")
  text = text.replace(/\b([cdjlmnstCDJLMNST]|[qQ]u|[jJ]usqu|[lL]orsqu|[pP]uisqu)\s*'\s*/g, "$1'");

  // 3. Si toute la phrase est en MAJUSCULES (> 4 lettres), on la repasse en minuscules avant traitement
  const lettersOnly = text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (lettersOnly.length > 4 && lettersOnly === lettersOnly.toUpperCase()) {
    text = text.toLowerCase();
  }

  // 4. Ajout des apostrophes oubliées (ex: "l armee", "d un", "d une", "c est", "s est", "n est", "qu il", "j ai")
  text = text.replace(
    /\b([cdjlmnstCDJLMNST]|[qQ]u)\s+([aàâäeéèêëiîïoôöuùûüyhAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜYH])/g,
    (_match, prefix: string, nextChar: string) => `${prefix.toLowerCase()}'${nextChar}`
  );

  // 5. Correction orthographique mot à mot (dictionnaire + proximité de Levenshtein 1)
  const tokens = text.split(' ');
  const correctedTokens = tokens.map((token, index) => {
    const elisionMatch = token.match(/^([cdjlmnst]|qu)'(.+)$/i);
    const prefix = elisionMatch ? `${elisionMatch[1].toLowerCase()}'` : '';
    const coreToken = elisionMatch ? elisionMatch[2] : token;

    const punctMatch = coreToken.match(/^([a-zA-ZÀ-ÿ0-9-]+)([,;:])?$/);
    if (!punctMatch) return token;

    const word = punctMatch[1];
    const trailingPunct = punctMatch[2] || '';
    const lowerWord = word.toLowerCase();

    // "a" vs "à"
    if (lowerWord === 'a' && !prefix) {
      const prevToken = index > 0 ? tokens[index - 1].toLowerCase().replace(/^.*'/, '') : '';
      const isAuxiliaryVerb = ['il', 'elle', 'on', 'qui', 'y', 'n'].includes(prevToken);
      return (isAuxiliaryVerb ? 'a' : 'à') + trailingPunct;
    }

    if (lowerWord === 'ou' && !prefix) {
      return 'ou' + trailingPunct;
    }

    const correctedWord = findClosestKnownWord(word);
    return prefix + correctedWord + trailingPunct;
  });

  text = correctedTokens.join(' ');

  // 6. Correction des élisions manquées ("le oiseau" -> "l'oiseau", "la école" -> "l'école", "de eau" -> "d'eau")
  text = text.replace(
    /\b(le|la)\s+([aàâäeéèêëiîïoôöuùûüyAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜY])/gi,
    "l'$2"
  );
  text = text.replace(
    /\b(de)\s+([aàâäeéèêëiîïoôöuùûüyAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜY])/gi,
    "d'$2"
  );

  // 7. Accords au pluriel après un déterminant pluriel ("des", "les", "ces", "ses", "mes", "leurs", "deux", "trois", "quatre", "plusieurs")
  // Gère à la fois <déterminant> <nom> ET <déterminant> <nom> <adjectif> (ex: "des crottes cubique" -> "des crottes cubiques")
  const pluralDetSet = new Set([
    'des', 'les', 'ces', 'ses', 'mes', 'tes', 'nos', 'vos', 'leurs',
    'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    'plusieurs', 'quelques', 'certains', 'certaines',
  ]);
  const stopWordsAfterNoun = new Set([
    'de', 'du', 'des', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'sous', 'avec', 'sans',
    'pour', 'par', 'contre', 'vers', 'chez', 'et', 'ou', 'qui', 'que', 'dont',
  ]);

  const wordsAfterElision = text.split(' ');
  for (let i = 0; i < wordsAfterElision.length - 1; i++) {
    const currentLower = wordsAfterElision[i].toLowerCase();
    if (pluralDetSet.has(currentLower)) {
      const nounToken = wordsAfterElision[i + 1];
      if (/^[a-zA-ZÀ-ÿ]{3,}$/.test(nounToken) && !stopWordsAfterNoun.has(nounToken.toLowerCase())) {
        wordsAfterElision[i + 1] = pluralizeWord(nounToken);

        // Si un adjectif suit immédiatement le nom pluriel (ex: "des crottes cubique"), on l'accorde aussi au pluriel
        if (i + 2 < wordsAfterElision.length) {
          const adjToken = wordsAfterElision[i + 2];
          const adjLower = adjToken.toLowerCase();
          if (
            /^[a-zA-ZÀ-ÿ]{4,}$/.test(adjToken) &&
            !stopWordsAfterNoun.has(adjLower) &&
            !pluralDetSet.has(adjLower) &&
            !PROTECTED_COMMON_WORDS.has(adjLower)
          ) {
            wordsAfterElision[i + 2] = pluralizeWord(adjToken);
          }
        }
      }
    }
  }
  text = wordsAfterElision.join(' ');

  // 8. Normalisation des espaces autour de la ponctuation
  text = text
    .replace(/\s+([,.)\]])/g, '$1')
    .replace(/([,(])\s+/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();

  // 9. Suppression de la ponctuation finale superflue (., !, ?)
  text = text.replace(/[.!?]+$/g, '').trim();

  // 10. Majuscule impérative sur le tout premier caractère
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

/**
 * Alias de compatibilité utilisé pour le nettoyage de secours.
 */
export function polishFallbackUserAnswer(rawText: string): string {
  return normalizeDisplayAnswer(rawText);
}

/**
 * Normalise une réponse pour la comparaison tolérante (insensible à la casse, aux accents,
 * à la ponctuation et aux articles en début de phrase).
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let cleaned = normalizeDisplayAnswer(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  cleaned = cleaned.replace(/[’‘`]/g, "'");
  cleaned = cleaned.replace(/[.,/#!$%^&*;:{}=\-_~()?"«»!¿¡]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  const leadingArticlesRegex = /^(?:l\s*'|d\s*'|le\s+|la\s+|les\s+|un\s+|une\s+|des\s+|du\s+|de\s+)+/i;
  cleaned = cleaned.replace(leadingArticlesRegex, '');

  cleaned = cleaned
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Vérifie si deux réponses sont similaires :
 * - Renvoie `true` si elles sont identiques après normalisation (`normalizeText`)
 * - OU si leur distance de Levenshtein après normalisation est <= 2 (pour les chaînes d'au moins 4 lettres).
 */
export function areAnswersSimilar(ans1: string, ans2: string): boolean {
  const norm1 = normalizeText(ans1);
  const norm2 = normalizeText(ans2);

  if (!norm1 || !norm2) {
    return false;
  }

  if (norm1 === norm2) {
    return true;
  }

  if (norm1.length >= 4 && norm2.length >= 4) {
    const distance = levenshteinDistance(norm1, norm2);
    return distance <= 2;
  }

  return false;
}
