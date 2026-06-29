import React, { useState, useMemo } from 'react';
import { WorldMapVisualization } from '@/components/features/pages/intervenants/WorldMapVisualization';
import { translateCountries, getOriginalCountryName, getFrCountryName } from '@/components/features/pages/intervenants/CountryUtils';
import { CountryModal } from '@/components/features/pages/intervenants/CountryModal';
import { Actant, University } from '@/types/ui';

interface CountryData {
    name: string;
    count: number;
    universities: {
        id: string;
        name: string;
        logo: string | null;
        actants: {
            id: string;
            name: string;
            picture: string | null;
            interventions: number;
        }[];
    }[];
}

interface IntervenantsWorldMapProps {
  countriesData: CountryData[] | null;
  loading: boolean;
}

export const IntervenantsWorldMap: React.FC<IntervenantsWorldMapProps> = ({
  countriesData,
  loading
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null); // Country selected by user (English Name)

  // Extract French names and Translate to English for Map
  const { translatedCountriesSet, frenchNamesMap } = useMemo(() => {
      if (!countriesData) return { translatedCountriesSet: new Set<string>(), frenchNamesMap: [] };
      
      const frenchNames = countriesData.map(c => c.name);
      return {
          translatedCountriesSet: new Set(translateCountries(frenchNames)),
          frenchNamesMap: frenchNames
      };
  }, [countriesData]);

  const handleCloseModal = () => setSelectedCountry(null);

  // Get data for selected country
  const universityGroups = useMemo(() => {
      if (!selectedCountry || !countriesData) return [];

      // Resolve English selection back to French name(s)
      const possibleFrenchNames = getOriginalCountryName(selectedCountry, frenchNamesMap);
      
      // Find the matching country entry
      const countryEntry = countriesData.find(c => possibleFrenchNames.includes(c.name));
      
      if (!countryEntry) return [];

      // Map to CountryModal expected format
      return countryEntry.universities.map(uni => {
          const uniObj = {
              id: uni.id,
              name: uni.name,
              shortName: uni.name, // Use full name as shortname fallback
              logo: uni.logo || '',
              url: '', // Not in stats payload
              country: countryEntry.name
          } as University;

          return {
              university: uniObj,
              intervenants: uni.actants.map(act => ({
                  id: act.id,
                  firstname: act.name ? act.name.split(' ')[0] : '',
                  lastname: act.name ? act.name.split(' ').slice(1).join(' ') : '',
                  picture: act.picture || '',
                  interventions: act.interventions || 0,
                  universities: [uniObj], // Pass the current university context
                  doctoralSchools: [],
                  laboratories: [],
                  mail: '',
                  url: ''
              } as Actant))
          };
      });
  }, [selectedCountry, countriesData, frenchNamesMap]);

  return (
    <div className='flex flex-col gap-12'>
      {/* Title Section */}
      <div className='flex flex-col items-center justify-center gap-5'>
        <p className='text-c5 text-base z-[12] text-center'>Un réseau mondial</p>
        <h2 className='text-2xl font-medium text-c6 text-center leading-[120%]'>
          Le réseau EdiSem rassemble une constellation de penseurs,<br />
          chercheur·es, artistes et praticien·nes du monde entier.
        </h2>
      </div>

      {/* Interactive world map with clickable countries */}
      <WorldMapVisualization
        highlightedCountries={translatedCountriesSet}
        onCountryClick={setSelectedCountry}
        loading={loading}
      />

      {/* Modal showing intervenants grouped by university for selected country */}
      <CountryModal
        selectedCountry={selectedCountry ? getFrCountryName(selectedCountry) : null}
        universityGroups={universityGroups}
        onClose={handleCloseModal}
      />
    </div>
  );
};