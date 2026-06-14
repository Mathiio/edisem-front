#!/usr/bin/env node
/**
 * Migration Omeka S : regroupe les templates conférence 121 et 122 sous le template 71
 * et renseigne dcterms:type (custom vocab 57 — Type de conférence).
 *
 * Usage :
 *   VITE_API_KEY=... node scripts/migrate-conference-templates.mjs
 *   node scripts/migrate-conference-templates.mjs --dry-run
 *
 * Ordre :
 *   1. Template 121 → 71 + « journée d'études »
 *   2. Template 122 → 71 + « colloque »
 *   3. Template 71 sans dcterms:type → « séminaire »
 */

import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const API_BASE = process.env.OMEKA_API_BASE || 'https://tests.arcanes.ca/omk/api/';
const API_IDENT = process.env.OMEKA_API_IDENTITY || 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
const API_KEY = process.env.VITE_API_KEY || process.env.OMEKA_API_KEY;

const CONFERENCE_TEMPLATE_ID = 71;
const CONFERENCE_TYPE_PROPERTY = 'dcterms:type';
const CONFERENCE_TYPE_PROPERTY_ID = 8;
const CONFERENCE_TYPE_VOCAB_ID = 57;

const TERMS = {
  seminaire: 'séminaire',
  journee_etudes: "journée d'études",
  colloque: 'colloque',
};

const DRY_RUN = process.argv.includes('--dry-run');

function apiUrl(path) {
  const base = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
  const url = new URL(path.replace(/^\//, ''), base);
  if (API_KEY) {
    url.searchParams.set('key_identity', API_IDENT);
    url.searchParams.set('key_credential', API_KEY);
  }
  return url.toString();
}

function buildTypeValue(term) {
  return {
    type: `customvocab:${CONFERENCE_TYPE_VOCAB_ID}`,
    property_id: CONFERENCE_TYPE_PROPERTY_ID,
    '@value': term,
    is_public: true,
  };
}

function hasConferenceType(item) {
  const values = item[CONFERENCE_TYPE_PROPERTY];
  return Array.isArray(values) && values.length > 0 && values[0]?.['@value'];
}

async function fetchAllItems(templateId) {
  const perPage = 100;
  const items = [];
  let page = 1;

  while (true) {
    const url = apiUrl(`items?resource_template_id=${templateId}&per_page=${perPage}&page=${page}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur API (${response.status}) template ${templateId} page ${page}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }

  return items;
}

/**
 * Récupère l'item complet, modifie uniquement template + type, puis PUT.
 * NE PAS utiliser PATCH partiel : Omeka S efface toutes les propriétés absentes du body.
 */
async function fetchFullItem(id) {
  const response = await fetch(apiUrl(`items/${id}`));
  if (!response.ok) throw new Error(`GET #${id} failed: ${response.status}`);
  return response.json();
}

async function putItem(id, payload) {
  const response = await fetch(apiUrl(`items/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
}

async function migrateItem(item, { targetTemplateId, typeTerm, label }) {
  const id = item['o:id'];
  const title = item['o:title'] || item['dcterms:title']?.[0]?.['@value'] || `#${id}`;

  console.log(`  [${label}] #${id} — ${title}`);

  if (DRY_RUN) return { ok: true, id };

  let fullItem;
  try {
    fullItem = await fetchFullItem(id);
  } catch (err) {
    console.error(`    ✗ GET #${id}: ${err.message}`);
    return { ok: false, id };
  }

  // Modifier uniquement template et type — tout le reste est conservé
  const payload = {
    ...fullItem,
    'o:resource_template': { 'o:id': targetTemplateId },
    [CONFERENCE_TYPE_PROPERTY]: [buildTypeValue(typeTerm)],
  };

  const response = await putItem(id, payload);
  if (!response.ok) {
    const err = await response.text();
    console.error(`    ✗ PUT #${id}: ${response.status} ${err.slice(0, 200)}`);
    return { ok: false, id };
  }

  return { ok: true, id };
}

async function setSeminaireType(item) {
  const id = item['o:id'];
  const title = item['o:title'] || item['dcterms:title']?.[0]?.['@value'] || `#${id}`;

  console.log(`  [séminaire] #${id} — ${title}`);

  if (DRY_RUN) return { ok: true, id };

  let fullItem;
  try {
    fullItem = await fetchFullItem(id);
  } catch (err) {
    console.error(`    ✗ GET #${id}: ${err.message}`);
    return { ok: false, id };
  }

  // Ajouter dcterms:type sans toucher aux autres propriétés
  const payload = {
    ...fullItem,
    [CONFERENCE_TYPE_PROPERTY]: [buildTypeValue(TERMS.seminaire)],
  };

  const response = await putItem(id, payload);
  if (!response.ok) {
    const err = await response.text();
    console.error(`    ✗ PUT #${id}: ${response.status} ${err.slice(0, 200)}`);
    return { ok: false, id };
  }

  return { ok: true, id };
}

async function runBatch(label, items, migrateFn) {
  console.log(`\n── ${label} (${items.length} items) ──`);
  let ok = 0;
  let fail = 0;

  for (const item of items) {
    const result = await migrateFn(item);
    if (result.ok) ok += 1;
    else fail += 1;
  }

  console.log(`   → ${ok} ok, ${fail} échec(s)`);
  return { ok, fail };
}

async function main() {
  if (!API_KEY) {
    console.error('VITE_API_KEY (ou OMEKA_API_KEY) requis dans .env ou en variable d\'environnement.');
    process.exit(1);
  }

  console.log(`Migration conférences → template ${CONFERENCE_TEMPLATE_ID}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`API: ${API_BASE}`);

  const items121 = await fetchAllItems(121);
  const items122 = await fetchAllItems(122);
  const items71 = await fetchAllItems(CONFERENCE_TEMPLATE_ID);
  const items71WithoutType = items71.filter((item) => !hasConferenceType(item));

  console.log(`\nItems trouvés : 121=${items121.length}, 122=${items122.length}, 71=${items71.length} (${items71WithoutType.length} sans type)`);

  const totals = { ok: 0, fail: 0 };

  const results = [
    await runBatch('121 → 71 + journée d\'études', items121, (item) =>
      migrateItem(item, {
        targetTemplateId: CONFERENCE_TEMPLATE_ID,
        typeTerm: TERMS.journee_etudes,
        label: "journée d'études",
      }),
    ),
    await runBatch('122 → 71 + colloque', items122, (item) =>
      migrateItem(item, {
        targetTemplateId: CONFERENCE_TEMPLATE_ID,
        typeTerm: TERMS.colloque,
        label: 'colloque',
      }),
    ),
    await runBatch('71 sans type → séminaire', items71WithoutType, setSeminaireType),
  ];

  for (const result of results) {
    totals.ok += result.ok;
    totals.fail += result.fail;
  }

  console.log(`\n✓ Terminé : ${totals.ok} ok, ${totals.fail} échec(s)${DRY_RUN ? ' (simulation)' : ''}`);
  if (totals.fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
