import { CONFERENCE_TEMPLATE_ID } from './conferenceTypeConfig';
import type { SmartRecommendationsStrategy } from '@/pages/generic/config';

/** Templates autorisés pour schema:isRelatedTo (récits, expérimentation chercheur, conférences). */
export const RELATED_RESOURCE_TEMPLATE_IDS: number[] = [
  CONFERENCE_TEMPLATE_ID,
  103, // Récit artistique
  117, // Récit techno-industriel
  119, // Récit citoyen
  120, // Récit médiatique
  124, // Récit scientifique
  108, // Expérimentation (pas 127 étudiant)
];

/** Champ éditable « Contenus associés » (sous le cadre titre/description en édition). */
export const RELATED_RESOURCES_FIELD = {
  property: 'schema:isRelatedTo',
  type: 'resource' as const,
  label: 'Contenus associés',
  resourceTemplateIds: RELATED_RESOURCE_TEMPLATE_IDS,
  multiSelect: true,
  zone: 'details' as const,
  pickerVariant: 'related' as const,
};

export function createRelatedResourcesSmartRecommendations(options?: {
  maxRecommendations?: number;
}): SmartRecommendationsStrategy {
  return {
    maxRecommendations: options?.maxRecommendations ?? 8,
    getRelatedItems: (itemDetails: { relatedResources?: unknown[] }) => itemDetails.relatedResources ?? [],
  };
}
