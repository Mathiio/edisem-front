import { useState, useEffect, useMemo, useCallback } from 'react';
import countries from 'i18n-iso-countries';
import frLocale from 'i18n-iso-countries/langs/fr.json';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { Actant, University } from '@/types/ui';



export interface UniversityWithIntervenants {
  university: University;
  intervenants: Actant[];
}

// ============================================================================ //
//                                  UTILITIES                                   //
// ============================================================================ //

// Initialize locales
countries.registerLocale(frLocale);
countries.registerLocale(enLocale);

// Normalize country names for comparison
const normalizeCountryName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Create country mapping with common variants
const createCountryMapping = (): Map<string, string> => {
  const mapping = new Map<string, string>();

  const countryVariants = {
    "États-Unis d'Amérique": ['usa', 'united states', 'etats unis d amerique', 'amerique', 'États-Unis', 'etats unis', 'etats-unis'],
    'Royaume-Uni': ['uk', 'grande bretagne', 'angleterre'],
    'coree du sud': ['coree', 'republique de coree'],
    iran: ['republique islamique d iran'],
    france: ['republique francaise'],
  };

  Object.entries(countryVariants).forEach(([canonical, variants]) => {
    variants.forEach((variant) => {
      mapping.set(normalizeCountryName(variant), canonical);
    });
  });

  return mapping;
};

// ============================================================================ //
//                     COUNTRY TRANSLATION FUNCTIONS                            //
// ============================================================================ //

// Translate countries from French to English
export const translateCountries = (frCountries: string[]): string[] => {
  const countryMapping = createCountryMapping();

  return frCountries
    .map((name) => {
      const normalizedName = normalizeCountryName(name);

      // Try direct translation
      let isoCode = countries.getAlpha3Code(name, 'fr');
      if (isoCode) {
        return countries.getName(isoCode, 'en');
      }

      // Try with variant mapping
      const mappedName = countryMapping.get(normalizedName);
      if (mappedName) {
        isoCode = countries.getAlpha3Code(mappedName, 'fr');
        if (isoCode) {
          return countries.getName(isoCode, 'en');
        }
      }

      return null;
    })
    .filter(Boolean) as string[];
};

// Get original French country name from English names
export const getOriginalCountryName = (englishCountryName: string, originalFrenchCountries: string[]): string[] => {
  const countryMapping = createCountryMapping();
  const isoCode = countries.getAlpha3Code(englishCountryName, 'en');

  if (!isoCode) return [];

  const standardFrenchName = countries.getName(isoCode, 'fr');
  if (!standardFrenchName) return [];

  const standardNormalized = normalizeCountryName(standardFrenchName);

  const matchingNames = originalFrenchCountries.filter((originalName) => {
    const normalizedOriginal = normalizeCountryName(originalName);

    // Direct match ou mapped variant match
    if (normalizedOriginal === standardNormalized || countryMapping.get(normalizedOriginal) === standardFrenchName) {
      return true;
    }

    // ISO code match
    const originalIsoCode = countries.getAlpha3Code(originalName, 'fr') || countries.getAlpha3Code(countryMapping.get(normalizedOriginal) || '', 'fr');

    return originalIsoCode === isoCode;
  });

  return matchingNames.length > 0 ? matchingNames : [standardFrenchName];
};

// Get French country name for display from English name
export const getFrCountryName = (englishCountryName: string): string => {
  const isoCode = countries.getAlpha3Code(englishCountryName, 'en');

  if (isoCode) {
    const frenchName = countries.getName(isoCode, 'fr');
    return frenchName || englishCountryName;
  }

  return englishCountryName;
};

// ============================================================================ //
//                                CUSTOM HOOK                                   //
// ============================================================================ //

// Custom hook to manage country data and translations
export const useCountryData = (universities: any[], intervenants: any[]) => {
  const [translatedCountries, setTranslatedCountries] = useState<string[]>([]);

  const highlightedCountries = useMemo(() => {
    if (!universities) return [];
    return Array.from(new Set(universities.map((u) => u.country)));
  }, [universities]);

  const translatedCountriesSet = useMemo(() => new Set(translatedCountries), [translatedCountries]);

  useEffect(() => {
    setTranslatedCountries(translateCountries(highlightedCountries));
  }, [highlightedCountries]);

  const getIntervenantsByUniv = useCallback(
    (englishCountryName: string): UniversityWithIntervenants[] => {
      const possibleFrenchNames = getOriginalCountryName(englishCountryName, highlightedCountries);

      const matchedUniversities = universities.filter((u) => possibleFrenchNames.some((frenchName) => u.country.toLowerCase() === frenchName.toLowerCase()));

      return matchedUniversities
        .map((university) => ({
          university,
          intervenants: intervenants.filter((a) => a.universities.some((u: any) => u.id === university.id)),
        }))
        .filter((group) => group.intervenants.length > 0);
    },
    [universities, intervenants, highlightedCountries],
  );

  return {
    translatedCountriesSet,
    getIntervenantsByUniv,
  };
};