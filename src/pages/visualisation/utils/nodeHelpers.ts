import { images } from '@/components/features/pages/visualisation/images';

// Fonction de mapping des types de noeud aux configurations
export const getConfigKey = (nodeType: string): string | null => {
  const typeMap: Record<string, string> = {
    conference: 'conferences',
    journee_etudes: 'conferences',
    colloque: 'conferences',
    seminaire: 'conferences',
    citation: 'citations',
    actant: 'conferenciers',
    bibliography: 'bibliography',
    mediagraphie: 'mediagraphie',
    pays: 'pays',
    laboratory: 'laboratoire',
    school: 'ecolesdoctorales',
    university: 'universites',
    keyword: 'motcles',
    collection: 'collection',
  };
  return typeMap[nodeType] || null;
};

export const getImageForType = (type: string) => {
  return images[type] || images['conf'];
};

export const getRadiusForType = (type: string) => {
  const radii: { [key: string]: number } = {
    conf: 250,
    colloque: 250,
    seminaire: 250,
    journee_etudes: 250,
    bibliography: 200,
    actant: 250,
    mediagraphie: 200,
    citation: 200,
    keyword: 150,
    university: 150,
    school: 150,
    laboratory: 150,
    collection: 250,
  };
  return radii[type] || 250;
};

export const getSizeForType = (type: string) => {
  const sizes: { [key: string]: string } = {
    conf: '18px',
    colloque: '18px',
    seminaire: '18px',
    journee_etudes: '18px',
    bibliography: '16px',
    actant: '18px',
    mediagraphie: '16px',
    citation: '16px',
    keyword: '14px',
    university: '14px',
    school: '14px',
    laboratory: '14px',
    collection: '18px',
  };
  return sizes[type] || '16px';
};
