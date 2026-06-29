import React from 'react';
import { Geography } from 'react-simple-maps';

type MapGeographyProps = {
  geography: any;
  isHighlighted: boolean;
  onClick?: (countryName: string) => void;
  loading: boolean;
};

export const MapGeography = React.memo<MapGeographyProps>(
  ({ geography, isHighlighted, onClick, loading }) => {
    return (
      <Geography
        key={geography.rsmKey}
        geography={geography}
        onClick={() => onClick?.(geography.properties.name)}
        className={`
          ${!isHighlighted ? (loading ? 'animate-pulse fill-c3' : 'fill-c3') : 'fill-action2'} 
          stroke-c1 cursor-pointer
        `}
        strokeWidth={0.5}
        style={{
          default: { outline: 'none' },
          hover: { outline: 'none' },
          pressed: { outline: 'none' },
        }}
      />
    );
  }
);