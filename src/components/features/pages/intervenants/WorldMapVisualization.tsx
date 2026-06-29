import React, { useCallback } from 'react';
import { ComposableMap, Geographies } from 'react-simple-maps';
import { MapGeography } from './MapGeography';



// URL to the TopoJSON file containing the world map data
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Exclude Antarctica from the map display
const EXCLUDED_COUNTRIES = new Set(['Antarctica']);

// Set some parameters for the final map
const MAP_CONFIG = {
  projection: "geoMercator" as const,
  projectionConfig: { scale: 100, center: [0, 40] as [number, number] },
  width: 980,
  height: 450,
  style: { width: '100%', height: 'auto' }
};

// Set of country names to be highlighted on the map
type WorldMapVisualizationProps = {
  highlightedCountries: Set<string>;
  onCountryClick?: (countryName: string) => void;
  loading: boolean;
};



// React component to render a world map with edisem intervenants countries highlighted
export const WorldMapVisualization: React.FC<WorldMapVisualizationProps> = ({ 
  highlightedCountries,
  onCountryClick,
  loading
}) => {
  // Memoized function to render the geographies (countries) on the map
  const renderGeographies = useCallback((geographies: any[]) => {
    // Exclude countries from the EXCLUDED_COUNTRIES tab
    const filteredGeos = geographies.filter(
      geo => !EXCLUDED_COUNTRIES.has(geo.properties.name)
    );
    
    // Map over the remaining geographies and determine if each one should be highlighted
    return filteredGeos.map(geo => {
      const isHighlighted = loading ? false : highlightedCountries.has(geo.properties.name);
      return (
        <MapGeography
          key={geo.rsmKey}
          geography={geo}
          isHighlighted={isHighlighted}
          onClick={onCountryClick}
          loading={loading}
        />
      );
    });
  }, [highlightedCountries, onCountryClick, loading]);

  return (
    <div className="w-full h-auto">
      <ComposableMap
        projection={MAP_CONFIG.projection}
        projectionConfig={MAP_CONFIG.projectionConfig}
        width={MAP_CONFIG.width}
        height={MAP_CONFIG.height}
        style={MAP_CONFIG.style}
      >
        {/* Render the geographies using the render function */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) => renderGeographies(geographies)}
        </Geographies>
      </ComposableMap>
    </div>
  );
};