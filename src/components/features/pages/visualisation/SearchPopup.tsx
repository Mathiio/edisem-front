import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch } from 'react-icons/fi';
import { LongCarrouselFilter } from '@/components/ui/Carrousels';
import { Button } from '@heroui/react';

interface SearchPopupProps {
  itemsDataviz: any[];
  onSearch: (selectedItems: any[]) => void;
  onItemSelect: (item: any) => void;
}

const SearchPopup: React.FC<SearchPopupProps> = ({ itemsDataviz, onSearch, onItemSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(['Tout']));

  const performSearch = useCallback(
    (term: string) => {
      if (!term) {
        const allFilteredItems = itemsDataviz.filter(
          (item) => selectedFilters.has('Tout') || selectedFilters.has(item.type.toLowerCase()),
        );
        setSearchResults(allFilteredItems);
        return;
      }

      const filteredItems = itemsDataviz.filter((item) => {
        const matchesSearchTerm = item.title.toLowerCase().includes(term.toLowerCase());
        const matchesFilters = selectedFilters.has('Tout') || selectedFilters.has(item.type.toLowerCase());
        return matchesSearchTerm && matchesFilters;
      });

      setSearchResults(filteredItems);
    },
    [itemsDataviz, selectedFilters],
  );

  useEffect(() => {
    performSearch(searchTerm);
  }, [performSearch, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  const handleItemSelect = (item: any) => {
    onItemSelect(item);
    onSearch([item]);
  };

  const toggleFilter = (filter: string) => {
    const newFilters = new Set(selectedFilters);

    if (filter === 'Tout') {
      if (newFilters.has('Tout')) return;
      newFilters.clear();
      newFilters.add('Tout');
    } else {
      if (newFilters.has('Tout')) {
        newFilters.delete('Tout');
      }

      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }

      if (newFilters.size === 0) {
        newFilters.add('Tout');
      }
    }

    setSelectedFilters(newFilters);
  };

  const availableFilters = [
    'Tout',
    'keyword',
    'conf',
    'actant',
    'citation',
    'bibliography',
    'mediagraphie',
    'university',
    'laboratory',
    'school',
  ];

  const filterLabels: Record<string, string> = {
    Tout: 'Tout',
    conf: 'Conférence',
    keyword: 'Mot clé',
    actant: 'Actant',
    university: 'Université',
    laboratory: 'Laboratoire',
    school: 'École doctoral',
    citation: 'Citation',
    bibliography: 'Bibliographie',
    mediagraphie: 'Médiagraphie',
  };

  return (
    <div className='rounded-lg h-full overflow-hidden'>
      <div className='flex flex-col items-start'>
        <div className='flex items-center bg-c3 rounded-lg p-2.5 w-full mb-4'>
          <FiSearch className='text-gray-400' size={20} />
          <input
            type='text'
            placeholder='Rechercher...'
            value={searchTerm}
            onChange={handleInputChange}
            className='ml-2 bg-transparent border-none text-sm w-full placeholder-gray-500 focus:outline-none'
          />
        </div>

        <LongCarrouselFilter
          perPage={3}
          perMove={1}
          autowidth={true}
          data={availableFilters}
          renderSlide={(filter) => (
            <Button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={`rounded-lg py-1.5 px-2
              ${selectedFilters.has(filter) ? 'bg-action text-white' : 'bg-c3 text-black'}
              hover:bg-hover transition-all`}>
              {filterLabels[filter] || filter}
            </Button>
          )}
        />
      </div>

      <div className='mt-5 h-full overflow-y-auto'>
        {searchTerm.trim() === '' ? (
          <p className='text-gray-400 text-start'>Tapez quelque chose pour commencer</p>
        ) : searchResults.length > 0 ? (
          <ul className='flex flex-col gap-1.5'>
            {searchResults.map((item, index) => (
              <li
                key={index}
                className='w-full flex justify-between gap-2.5 items-center rounded-lg hover:bg-c4 cursor-pointer p-1.5'
                onClick={() => handleItemSelect(item)}>
                <span className='text-sm'>{truncateText(item.title, 2, 40)}</span>
                <span className='text-[10px]'>{item.type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-gray-400 text-center'>Aucun résultat</p>
        )}
      </div>
    </div>
  );
};

const truncateText = (text: string, maxLines: number, maxLength: number) => {
  const lines = text.split(' ').reduce(
    (acc, word) => {
      const currentLine = acc[acc.length - 1];
      if ((currentLine + word).length > maxLength) {
        acc.push(word);
      } else {
        acc[acc.length - 1] = `${currentLine} ${word}`.trim();
      }
      return acc;
    },
    [''],
  );

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join(' ') + '...';
  }
  return text;
};

export default SearchPopup;
