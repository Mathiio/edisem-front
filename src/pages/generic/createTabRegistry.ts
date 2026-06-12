import { splitBibliographyMediagraphyTemplateIds } from '@/config/resourceConfig';
import { GenericDetailPageConfig } from './config';
import { toolConfig, toolStudentConfig } from './config/toolConfig';
import { feedbackStudentConfig } from './config/feedbackStudentConfig';
import { experimentationStudentConfig } from './config/experimentationStudentConfig';
import { bibliographyConfig } from './config/bibliographyConfig';
import { mediagraphyConfig } from './config/mediagraphyConfig';
import { feedbackConfig } from './config/feedbackConfig';
import { experimentationConfig } from './config/experimentationConfig';
import { conferenceConfig } from './config/conferenceConfig';
import { analyseCritiqueConfig } from './config/analyseCritiqueConfig';
import { elementEsthetiqueConfig } from './config/elementEsthetiqueConfig';
import { elementNarratifConfig } from './config/elementNarratifConfig';
import { recitScientifiqueConfig } from './config/recitScientifiqueConfig';
import { recitArtitstiqueConfig } from './config/recitArtitstiqueConfig';
import { recitTechnoConfig } from './config/recitTechnoConfig';
import { recitCitoyenConfig } from './config/recitcitoyenConfig';
import { recitMediatiqueConfig } from './config/recitmediatiqueConfig';
import { motCleConfig } from './config/motCleConfig';
import { intervenantConfig } from './config/intervenantConfig';
import { personneConfig } from './config/personneConfig';
import { organisationConfig } from './config/organisationConfig';
import { universiteConfig } from './config/universiteConfig';
import { ecoleDoctoraleConfig } from './config/ecoleDoctoraleConfig';
import { laboratoireConfig } from './config/laboratoireConfig';

const ALL_CONFIGS: GenericDetailPageConfig[] = [
  toolStudentConfig,
  feedbackStudentConfig,
  experimentationStudentConfig,
  bibliographyConfig,
  mediagraphyConfig,
  toolConfig,
  feedbackConfig,
  experimentationConfig,
  conferenceConfig,
  analyseCritiqueConfig,
  elementEsthetiqueConfig,
  elementNarratifConfig,
  recitScientifiqueConfig,
  recitArtitstiqueConfig,
  recitTechnoConfig,
  recitCitoyenConfig,
  recitMediatiqueConfig,
  motCleConfig,
  intervenantConfig,
  personneConfig,
  organisationConfig,
  universiteConfig,
  ecoleDoctoraleConfig,
  laboratoireConfig,
];

const TEMPLATE_ID_TO_CONFIG: Record<number, GenericDetailPageConfig> = {};

for (const config of ALL_CONFIGS) {
  if (config.resourceTemplateId) {
    TEMPLATE_ID_TO_CONFIG[config.resourceTemplateId] = config;
  }
}

const { bibliographies, mediagraphies } = splitBibliographyMediagraphyTemplateIds([81, 99, 98, 83]);
for (const id of bibliographies) {
  TEMPLATE_ID_TO_CONFIG[id] ??= bibliographyConfig;
}
for (const id of mediagraphies) {
  TEMPLATE_ID_TO_CONFIG[id] ??= mediagraphyConfig;
}

const LEGACY_VIEW_KEY_MAP: Record<string, GenericDetailPageConfig> = {
  keywords: motCleConfig,
  'jdc:hasConcept': motCleConfig,
  'theatre:credit': toolStudentConfig,
  'schema:description': feedbackStudentConfig,
  'dcterms:references': bibliographyConfig,
  'dcterms:bibliographicCitation': bibliographyConfig,
  Bibliographie: bibliographyConfig,
  Mediagraphie: mediagraphyConfig,
  outils: toolStudentConfig,
  Outils: toolStudentConfig,
  'schema:tool': toolStudentConfig,
  projets: experimentationStudentConfig,
  'dcterms:isPartOf': experimentationStudentConfig,
  AnalyseCritique: analyseCritiqueConfig,
  Feedbacks: feedbackConfig,
  ElementsNarratifs: elementNarratifConfig,
  ElementsEsthetiques: elementEsthetiqueConfig,
  Documentation: bibliographyConfig,
  ContentScient: bibliographyConfig,
  ContentCultu: bibliographyConfig,
  personnes: intervenantConfig,
  actants: intervenantConfig,
  'schema:agent': intervenantConfig,
  'schema:contributor': intervenantConfig,
  'dcterms:creator': intervenantConfig,
};

export const resolveCreateTabConfig = (
  viewKey: string,
  templateId?: number,
): GenericDetailPageConfig | undefined => {
  if (templateId != null && TEMPLATE_ID_TO_CONFIG[templateId]) {
    return TEMPLATE_ID_TO_CONFIG[templateId];
  }
  return LEGACY_VIEW_KEY_MAP[viewKey];
};

export const canCreateInInternalTab = (templateId: number): boolean =>
  resolveCreateTabConfig('', templateId) != null;
