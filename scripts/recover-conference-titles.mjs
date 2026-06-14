#!/usr/bin/env node
/**
 * Récupération partielle après la migration défaillante.
 * Restaure uniquement dcterms:title (+ conserve dcterms:type).
 * Les autres propriétés (abstract, agent, date, concepts) nécessitent une restauration DB.
 *
 * Usage : VITE_API_KEY=... node scripts/recover-conference-titles.mjs
 *         node scripts/recover-conference-titles.mjs --dry-run
 */

import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const API_BASE = process.env.OMEKA_API_BASE || 'https://tests.arcanes.ca/omk/api/';
const API_IDENT = process.env.OMEKA_API_IDENTITY || 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
const API_KEY = process.env.VITE_API_KEY || process.env.OMEKA_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Données récupérées depuis la sortie du script de migration ──────────────
// Ces titres étaient affichés AVANT que le PATCH ne les efface.

const ITEMS = [
  // Template 121 → journée d'études
  { id: 16115, type: "journée d'études", title: "The Computational Turn in Visual Political Communication Research" },
  { id: 16123, type: "journée d'études", title: "Artful Intrusions—A Hacker's Guide to Generative AI" },
  { id: 16129, type: "journée d'études", title: "Table ronde - Terence Broad, Kazushi Mukaiya, Gaëtan Robillard" },
  { id: 16143, type: "journée d'études", title: "Table ronde - Vincent Nozick, Nicolas Obin, Gaëtan Robillard" },
  { id: 16144, type: "journée d'études", title: "Table ronde - Fabien Richert, Constantine Boussalis, Gaëtan Robillard" },
  { id: 16145, type: "journée d'études", title: "Mesonet : Détecter la falsification de vidéos deepfakes" },
  { id: 16146, type: "journée d'études", title: "Converser avec l'IA : entre feintise ludique, stratégie de tromperie" },
  { id: 16147, type: "journée d'études", title: "Introduction - Gaëtan Robillard et Renée Bourassa" },
  { id: 16148, type: "journée d'études", title: "Deepfakes ou synthèse vocale" },
  { id: 16152, type: "journée d'études", title: "De l'intelligence en essaim à l'intelligence artificielle" },
  { id: 16159, type: "journée d'études", title: "Après l'intelligence artificielle, l'éthique, les tics, l'esthétique" },
  { id: 16160, type: "journée d'études", title: "Table ronde - Olga Kisseleva, Frank Madlener, Gaëtan Robillard" },
  { id: 16162, type: "journée d'études", title: "My lines drawn by AI" },

  // Template 122 → colloque
  { id: 14960, type: "colloque", title: "Infrastructures of post-truth" },
  { id: 14961, type: "colloque", title: "Désinformer en ligne : entre travail affectif et instrumentalisation des plateformes" },
  { id: 14962, type: "colloque", title: "Figures de la tromperie, du faux, du mensonge et de la manipulation dans les médiations numériques" },
  { id: 14963, type: "colloque", title: "Être ou ne pas être trompé : interpréter les pouvoirs des IA génératives" },
  { id: 14964, type: "colloque", title: "Dialectique de l'authenticité et de la feintise au sein des cadrages énonciatifs de la Docu-réalité « Si on s'aimait »" },
  { id: 14967, type: "colloque", title: "Modélisations de l'argumentation pour l'éducation\nà l'esprit critique" },
  { id: 14968, type: "colloque", title: "Tromper au nom de Dieu, les stratégies de tromperies religieuses\nd'Alger à Damas" },
  { id: 14969, type: "colloque", title: "Puissances du faux, faiblesses du vrai : illusion,\ntromperie et intelligence artificielle" },
  { id: 14970, type: "colloque", title: "La mécanique du faux à l'œuvre\ndans le spectacle d'illusionnisme, l'art magique et sa réception spectatorielle" },
  { id: 14977, type: "colloque", title: "Comment reconstituer les images d'archives ? – étude de cas" },
  { id: 14978, type: "colloque", title: "Anatomy as art of dis-deception" },
  { id: 14979, type: "colloque", title: "« La grotte ornée la plus visitée du\nmonde » est un facsimilé et ne s'en cache pas !" },
  { id: 14980, type: "colloque", title: "Ekphratic Deceptions" },
  { id: 14981, type: "colloque", title: "Chom5ky vs Chomsky : des biais algorithmiques en\nquestion" },
  { id: 14983, type: "colloque", title: "Modèles d'intelligence\narcificielle et régimes d'authenticité" },

  // Template 71 → séminaire
  { id: 14911, type: "séminaire", title: "De la tromperie au canular : le mélange des réalités en arts vivants" },
  { id: 14912, type: "séminaire", title: "L'illusion est un objet. Perspectives néomatérialistes sur les arts trompeurs" },
  { id: 14913, type: "séminaire", title: "L'étude des controverses : littéracie des fake news et formation à l'esprit critique" },
  { id: 14914, type: "séminaire", title: "Humanisme numérique pour manipuler des connaissances entre confiances intimes et numériques" },
  { id: 14915, type: "séminaire", title: "Faits, perspectives, orientations : La (post) vérité n'existe pas" },
  { id: 14916, type: "séminaire", title: "Hyperstition, spéculation et complot : schizoanalyse des imaginaires conspirationnistes" },
  { id: 14917, type: "séminaire", title: "Gouvernementalité algorithmique" },
  { id: 14918, type: "séminaire", title: "Les contenus journalistiques comme révélateurs de la complexité des rapports au vrai et au faux" },
  { id: 14919, type: "séminaire", title: "Les arcanes du vrai à l'heure des deep fakes : authenticité et dispositifs de véridiction" },
  { id: 14920, type: "séminaire", title: "Les arcanes du vrai à l'heure des deep fakes : authenticité et dispositifs de véridiction" },
  { id: 14921, type: "séminaire", title: "Figures de l'automate : des simulacres aux deepfakes" },
  { id: 14922, type: "séminaire", title: "Comment les jeunes contrebalancent-ils la désinformation en ligne ?" },
  { id: 14923, type: "séminaire", title: "Y a truc, ça se voit !" },
  { id: 14924, type: "séminaire", title: "Le réel « performé » des dispositifs ludiques de téléréalité" },
  { id: 14925, type: "séminaire", title: "Les dynamiques de l'autorité : construire la légitimité dans les environnements numériques" },
  { id: 14926, type: "séminaire", title: "Les fake news au cœur de l'écosystème socionumérique de l'information" },
  { id: 14927, type: "séminaire", title: "Quels régimes de création dans le médium algorithmique surveillé ?" },
  { id: 14928, type: "séminaire", title: "De SMEL (Du spectacle magique au numérique : espaces liminaires de l'authenticité) aux Arcanes" },
  { id: 14929, type: "séminaire", title: "Faire entendre l'inouï : étude d'une création radiophonique de science-fiction" },
  { id: 14930, type: "séminaire", title: "Introduction à la 2e édition du séminaire ARCANES : Puissances du faux dans les arts trompeurs et l'écosystème socionumérique" },
  { id: 14931, type: "séminaire", title: "Dévoilement du site Web ARCANES + Lancement de la version numérique de l'ouvrage « Le livre en contexte numérique. Un défi de design » sous la direction de Renée Bourassa." },
  { id: 14932, type: "séminaire", title: "Conférence d'ouverture du Colloque international H2PTM 2021 - Information : Enjeux et technologie" },
  { id: 14933, type: "séminaire", title: "Les paradoxes du documentaire dans les « arts trompeurs »" },
  { id: 14934, type: "séminaire", title: "When fact is fiction, Documentary art in the post-truth era" },
  { id: 14935, type: "séminaire", title: "Deepfake : De la désinformation à l'hyper-personnalisation" },
  { id: 14936, type: "séminaire", title: "La méthode morellienne à l'épreuve du numérique" },
  { id: 14937, type: "séminaire", title: "Pister, dépister: détourner (l'économie de) l'attention en culture numérique (prise 2)" },
  { id: 14938, type: "séminaire", title: "Images et séries culturelles de l'ivresse. Frictions diégétiques et musicalités circulaires" },
  { id: 14940, type: "séminaire", title: "Histoire du \"fact checking\", les racines américaines" },
  { id: 14941, type: "séminaire", title: "La mécanique du faux à l'œuvre dans l'art magique construction et déconstruction d'un regard distancié" },
  { id: 14942, type: "séminaire", title: "Introduction à la 3e édition du séminaire ARCANES: Puissances du faux dans les arts trompeurs et l'écosystème socionumérique" },
  { id: 14943, type: "séminaire", title: "Illusion et manipulation des sens : effets de présence et interpellation des personnages virtuels" },
  { id: 14944, type: "séminaire", title: "Illusion et manipulation des sens : effets de présence et interpellation des personnages virtuels" },
  { id: 14945, type: "séminaire", title: "Pour des environnements numériques contre-intuitifs, complexes et hétérogènes. La littératie numérique à l'épreuve des GAFAM" },
  { id: 14946, type: "séminaire", title: "Fabriques en commun et protocoles ouverts : vers une réappropriation de l'écosystème des connaissances" },
  { id: 14947, type: "séminaire", title: "Accès, exploitation et réutilisation des données patrimoniales de la BNF" },
  { id: 14948, type: "séminaire", title: "Chaoticum Seminario : stimulations aléatoires de discussions scientifiques" },
  { id: 14949, type: "séminaire", title: "Montrer l'impossible : le truc entre scène et écran" },
  { id: 14950, type: "séminaire", title: "Le remploi de témoignages filmés dans des films documentaires historiques. Le cas de The U.S. and the Holocaust (Ken Burns, Lynn Novick et Sarah Botstein, 2022)." },
  { id: 14951, type: "séminaire", title: "Stratégies du faux et nostalgie réactionnaire : la vidéo de la campagne électorale d'Éric Zemmour" },
  { id: 14952, type: "séminaire", title: "Stratégies du faux et nostalgie réactionnaire : la vidéo de la campagne électorale d'Éric Zemmour" },
  { id: 14953, type: "séminaire", title: "La dramaturgie des problèmes sociaux" },
  { id: 14954, type: "séminaire", title: "Se parler malgré la mort. Les illusions spectrales" },
  { id: 14955, type: "séminaire", title: "De la rhétorique transhumaniste à une réflexion sur les limites de l'IA" },
  { id: 14956, type: "séminaire", title: "La création au-delà de l'humain" },
  { id: 14957, type: "séminaire", title: "Carnet de controverses en temps de Covid : pour une autre communication de crise en santé" },
  { id: 14958, type: "séminaire", title: "Information, désinformation et militantisme : la « querelle du joual » au théâtre au Québec et ses suites" },
  { id: 14959, type: "séminaire", title: "Dénoncer les abus des GAFA pour encourager la réflexivité ou pour réhabiliter la théorie des effets puissants des médias ? Analyse du docudrama The Social Dilemma et de sa réception par des lycéens." },
  { id: 15604, type: "séminaire", title: "Atelier Thèse Post-Numérique – Rédiger une thèse à l'ère de l'IA" },
  { id: 15609, type: "séminaire", title: "Médias génératifs et régimes d'authenticité. Retours sur une étude de cas" },
  { id: 15610, type: "séminaire", title: "Puissances du faux et hallucination machinique" },
  { id: 15613, type: "séminaire", title: "Fooling Ourselves to Death: pour une approche expérimentale et créative des IA" },
  { id: 15614, type: "séminaire", title: "Introduction à la 4e édition du séminaire ARCANES « Des arts trompeurs à l'écosystème socionumérique – Intelligence artificielle et puissances du faux dans les pratiques artistiques et la médiation culturelle : créativité, enjeux sociaux »" },
  { id: 15682, type: "séminaire", title: "Récits numériques et intelligence artificielle" },
  { id: 15693, type: "séminaire", title: "Dimensions narratives de l'IA générative : entre créativité, auctorialité et nouveaux matérialisme" },
  { id: 15741, type: "séminaire", title: "La narration générative entre IA symbolique et connexionniste : une expérience transnationale" },
  { id: 15748, type: "séminaire", title: "IA et IA : intelligence artificielle et invention architectonique" },
  { id: 15750, type: "séminaire", title: "Quelques intuitions autour des I.A. en architecture. Ce que nous disent les images générées" },
  { id: 16355, type: "séminaire", title: "Une vie intelligente :  les défis d'une création qui explore l'IA" },
  { id: 16356, type: "séminaire", title: "Du cinéma de réemploi à l'intelligence artificielle : enjeux éthiques des usages des archives" },
  { id: 16462, type: "séminaire", title: "Artificial Intelligence and deception after the Turing Test" },
  { id: 16463, type: "séminaire", title: "Le capital algorithmique et le concept de « temps de loisir »" },
  { id: 16469, type: "séminaire", title: "La rhétorique de la « science »" },
  { id: 16470, type: "séminaire", title: "L'intelligence est forcément artificielle: peurs déplacées et dangers ignorés" },
  { id: 16740, type: "séminaire", title: "Considérations juridico-éthiques liées à l'IA générative dans les domaines judiciaire et culturel : perspectives européennes" },
  { id: 16741, type: "séminaire", title: "Revoir le droit d'auteur à la lumière de l'IA générative" },
  { id: 19652, type: "séminaire", title: "Les arcanes du vrai à l'heure des deep fakes : authenticité et dispositifs de véridiction" },
  { id: 21220, type: "séminaire", title: "L'intelligence artificielle générale, une théorie du complot ?" },
  { id: 21231, type: "séminaire", title: "Gouverner par les récits: l'IA comme dispositif narratif" },
  { id: 21287, type: "séminaire", title: "Storying algorithmic ecosystems" },
  { id: 21288, type: "séminaire", title: "Les techniques d'écriture de scénario, du livre à l'IA" },
  { id: 21374, type: "séminaire", title: "Je est un ... ?" },
  { id: 21575, type: "séminaire", title: "L'intelligence artificielle comme milieu narratif et esthétique" },
  { id: 21579, type: "séminaire", title: "IA et créativité dans les arts numériques" },
  { id: 21750, type: "séminaire", title: "Énonciation et modélisation dans l'IA générative, l'approche 3D (dire, dit, désigné)" },
  { id: 21751, type: "séminaire", title: "La créativité et la distribution de probabilités" },
  { id: 21920, type: "séminaire", title: "Mettre en scène l'IA : récits, idéologies et pratiques artistiques" },
  { id: 21921, type: "séminaire", title: "Les barrières à l'emploi de l'IA générative dans le cinéma indépendant" },
  { id: 22886, type: "séminaire", title: "IA générative et pipelines en recomposition : enjeux pédagogiques en situation de production" },
  { id: 22889, type: "séminaire", title: "Les IA en partenaires : créer de nouveaux narratifs sur nos relations avec la technologie via la scène" },
  { id: 23103, type: "séminaire", title: "Lire les rues du Québec par l'I.A." },
  { id: 23116, type: "séminaire", title: "Le bien-être au travail en environnement hybride comme phénomène situé" },
];

const DCTERMS_TITLE_PROPERTY_ID = 1; // standard Omeka S
const CONFERENCE_TYPE_PROPERTY_ID = 8;
const CONFERENCE_TYPE_VOCAB_ID = 57;

function apiUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
  const url = new URL(path.replace(/^\//, ''), base);
  if (API_KEY) {
    url.searchParams.set('key_identity', API_IDENT);
    url.searchParams.set('key_credential', API_KEY);
  }
  return url.toString();
}

async function recoverItem(item) {
  const { id, title, type } = item;

  // 1. Récupérer l'état actuel (pour ne pas écraser les métadonnées Omeka non-RDF)
  const getResp = await fetch(apiUrl(`items/${id}`));
  if (!getResp.ok) {
    console.error(`  ✗ GET #${id} failed: ${getResp.status}`);
    return { ok: false, id };
  }
  const current = await getResp.json();

  console.log(`  Restoring #${id} — ${title.slice(0, 60)}`);

  if (DRY_RUN) return { ok: true, id };

  // 2. Construire le payload complet avec dcterms:title + dcterms:type existant
  const payload = {
    ...current,
    'dcterms:title': [
      {
        type: 'literal',
        property_id: DCTERMS_TITLE_PROPERTY_ID,
        '@value': title,
        is_public: true,
      },
    ],
    'dcterms:type': [
      {
        type: `customvocab:${CONFERENCE_TYPE_VOCAB_ID}`,
        property_id: CONFERENCE_TYPE_PROPERTY_ID,
        '@value': type,
        is_public: true,
      },
    ],
  };

  // 3. PUT complet (pas PATCH) pour ne pas effacer d'autres champs
  const putResp = await fetch(apiUrl(`items/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!putResp.ok) {
    const err = await putResp.text();
    console.error(`  ✗ PUT #${id} failed: ${putResp.status} ${err.slice(0, 200)}`);
    return { ok: false, id };
  }

  return { ok: true, id };
}

async function main() {
  if (!API_KEY) {
    console.error('VITE_API_KEY requis dans .env ou en variable d\'environnement.');
    process.exit(1);
  }

  console.log(`Récupération partielle des titres (${ITEMS.length} items)${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('⚠  Seul dcterms:title est restauré. Les autres propriétés (abstract, agent, date, mots-clés) nécessitent une restauration de la base de données.\n');

  let ok = 0;
  let fail = 0;

  for (const item of ITEMS) {
    const result = await recoverItem(item);
    if (result.ok) ok += 1;
    else fail += 1;
  }

  console.log(`\n✓ Terminé : ${ok} ok, ${fail} échec(s)${DRY_RUN ? ' (simulation)' : ''}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
