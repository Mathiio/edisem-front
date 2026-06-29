import { PredefinedFilter } from "@/components/features/pages/visualisation/OverlaySelector";
import { ITEM_TYPES } from "@/components/features/pages/visualisation/FilterPopup";  

// ----------------------
// 1. Dictionnaire des types
// ----------------------
const typeMap: Record<string, string> = {
  "conférence": "conference",
  "conférences": "conference",
  "conference": "conference",
  "conferences": "conference",

  "citation": "citation",
  "citations": "citation",

  "mot clé": "keyword",
  "mot-clé": "keyword",
  "mots clés": "keyword",
  "mots-clés": "keyword",
  "keyword": "keyword",

  "bibliographie": "bibliographie",
  "bibliographies": "bibliographie",

  "actant": "actant",
  "actants": "actant",

  "item": "item",
  "items": "item",
};

// ----------------------
// 2. Relations
// ----------------------
const relationMap: Record<string, string> = {
  "lié à": "contains",
  "liés à": "contains",
  "sur": "contains",
  "concernant": "contains",
  "à propos de": "contains",
};

// ----------------------
// 3. Détection du type
// ----------------------
function detectType(text: string): string | null {
  text = text.toLowerCase();

  for (const word in typeMap) {
    if (text.includes(word)) return typeMap[word];
  }

  return null;
}

// ----------------------
// 4. Détection relation
// ----------------------
function detectRelation(text: string): string {
  text = text.toLowerCase();

  for (const key in relationMap) {
    if (text.includes(key)) return relationMap[key];
  }

  return "contains";
}

// ----------------------
// 5. Extraction du concept
// ----------------------
function extractConcept(text: string): string {
  const match = text.match(/(lié à|liés à|sur|concernant|à propos de)\s+(.*)/i);
  if (!match) return "";
  return match[2].trim();
}

// ----------------------
// 6. Propriété selon type
// ----------------------
function propertyForType(type: string): string {
  switch (type) {
    case "keyword":
      return "title";
    case "citation":
    case "conference":
    case "bibliographie":
      return "mot-clé";
    default:
      return "lié à";
  }
}

// ----------------------
// 7. Construction du filtre
// ----------------------
export function chatToFilter(message: string): PredefinedFilter {
  const type = detectType(message) ?? "item";
  const relation = detectRelation(message);
  const concept = extractConcept(message);

  const property = propertyForType(type);

  const label = `Recherche : ${message}`;

  return {
    label,
    groups: [
      {
        name: `${type} liés à "${concept}"`,
        isExpanded: false,
        itemType: type,
        conditions: [
          {
            property,
            operator: relation,
            value: concept,
          },
        ],
        visibleTypes: Object.values(ITEM_TYPES),
      },
    ],
  };
}
