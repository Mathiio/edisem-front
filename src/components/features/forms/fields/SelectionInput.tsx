import React, { useState, useEffect } from 'react';
import { InputConfig } from '@/components/features/forms/fields/editModalTypes';
import { useGetDataByClass } from '@/hooks/useFetchData';
import { Button, Spinner } from '@heroui/react';
import { Input, Select, SelectItem } from '@/theme/components';
import { CrossIcon, SearchIcon } from '@/components/ui/icons';

import AutoResizingField from './AutoResizingTextarea';

interface SelectionInputProps {
  col: InputConfig;
  actualData?: any;
  handleInputChange: (dataPath: string, value: string[]) => void;
  justView?: boolean;
}

// Reducer function to slice the result and append '...'
const reducer = (text: any, maxLength = 70) => {
  const str = String(text); // Convert text to a string
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};

export const SelectionInput: React.FC<SelectionInputProps> = ({ col, actualData, handleInputChange, justView }) => {
  if (col.dataPath === 'cito:AuthorSelfCitation') {
    col.dataPath = 'cito:hasCitedEntity';
  }

  const initialValues = actualData?.[0]?.[col.dataPath] || [];

  const [selectedValues, setSelectedValues] = useState<string[]>(
    initialValues.map((item: any) => item.value_resource_id),
  );

  const [idToDisplayNameMap, setIdToDisplayNameMap] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [nonSelectedValues, setNonSelectedValues] = useState<string[]>([]);

  const selectionId = col.selectionId?.[0] ?? null;

  const { data: speakersData, loading } = useGetDataByClass(selectionId);

  useEffect(() => {
    if (speakersData) {
      let filteredData = speakersData;

      // Apply filtering based on selectionId and item_set
      if (selectionId === 34 && col.options?.[1]) {
        filteredData = speakersData.filter((item: any) => item['o:item_set'][0]?.['o:id'] === col.options?.[1]);
      }

      const map: { [key: string]: string } = {};
      if (filteredData[0]?.['@type']?.[1] === 'cito:AuthorSelfCitation') {
        filteredData.forEach((item: any) => {
          if (item['o:id'] && item['cito:hasCitedEntity']?.[0]?.['@value']) {
            map[item['o:id']] = item['cito:hasCitedEntity'][0]['@value'];
          }
        });
      } else {
        filteredData.forEach((item: any) => {
          if (item['o:id'] && item['dcterms:title'] && item['dcterms:title'][0]) {
            map[item['o:id']] = item['dcterms:title'][0]['@value'];
          }
        });
      }

      setIdToDisplayNameMap(map);

      // En mode justView, on ne calcule pas les valeurs non sélectionnées
      if (!justView) {
        const allValues = filteredData.map((item: any) => item['o:id']);
        const nonSelectedValues = allValues.filter((value) => !selectedValues.includes(value));
        setNonSelectedValues(nonSelectedValues);
      }
    }
  }, [speakersData, selectionId, selectedValues, justView, col]);

  if (loading) {
    return (
      <div className='flex items-center flex-col w-full'>
        <Spinner label={`Chargement des ${col.label}`} color='current' className='text-c6' size='md' />
      </div>
    );
  }

  if (!speakersData || !Array.isArray(speakersData) || speakersData.length === 0) {
    return <div>Données non disponibles pour {col.label}</div>;
  }

  // Si justView est true, afficher seulement les valeurs sélectionnées
  if (justView) {
    return selectedValues.length > 0 ? (
      <div className='flex flex-col gap-2.5 w-full' key={col.key}>
        <label className='text-semibold text-c6 text-xl'>{col.label}</label>
        <div className='flex flex-col w-full'>
          <ul className='flex items-center gap-2.5 pt-2.5 pb-5 flex-wrap'>
            {selectedValues.map((id) => (
              <AutoResizingField
                key={id}
                value={idToDisplayNameMap[id]}
                textareaProps={{ minRows: 1, classNames: { input: 'resize-none' } }}
                inputProps={{ size: 'md', classNames: { inputWrapper: '!min-h-12' } }}
              />
            ))}
          </ul>
        </div>
      </div>
    ) : null;
  }
  // Function to handle sorting based on sortOrder
  const sortedValues = [...nonSelectedValues].sort((id1, id2) => {
    const displayName1 = idToDisplayNameMap[id1] || '';
    const displayName2 = idToDisplayNameMap[id2] || '';
    if (sortOrder === 'asc') {
      return displayName1.localeCompare(displayName2);
    } else {
      return displayName2.localeCompare(displayName1);
    }
  });

  // Function to handle select action
  const handleSelect = (id: string) => {
    const newSelectedValues = [...selectedValues, id];
    setSelectedValues(newSelectedValues);
    handleInputChange(col.dataPath, newSelectedValues);
  };

  // Function to handle deselect action
  const handleDeselect = (id: string) => {
    const newSelectedValues = selectedValues.filter((item) => item !== id);
    setSelectedValues(newSelectedValues);
    handleInputChange(col.dataPath, newSelectedValues);
  };

  // Function to handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Function to filter nonSelectedValues based on searchTerm
  const filteredNonSelectedValues = sortedValues.filter((id) => {
    const displayName = idToDisplayNameMap[id] || '';
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Mode édition (justView = false)
  return (
    <div className='flex flex-col gap-2.5 w-full' key={col.key}>
      <label className='text-semibold text-c6 text-xl'>{col.label}</label>
      <div className='flex flex-row gap-2.5 items-center w-full'>
        <Input
          classNames={{
            base: 'w-full flex-1 min-w-0',
            mainWrapper: 'w-full',
            inputWrapper:
              '!min-h-10 !h-10 max-h-10 !py-0 !px-3 group-data-[focus=true]:!bg-c3 data-[hover=true]:!bg-c3',
            input: '!text-c6 text-sm !min-h-10 h-10 py-0',
          }}
          placeholder='Recherche avancée...'
          startContent={<SearchIcon size={16} className='text-c4 shrink-0' />}
          value={searchTerm}
          onChange={handleSearchChange}
          type='search'
        />

        <Select
          aria-label='Ordre de tri'
          disallowEmptySelection
          selectionMode='single'
          selectedKeys={[sortOrder]}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;
            if (selectedKey === 'asc') setSortOrder('asc');
            else if (selectedKey === 'desc') setSortOrder('desc');
          }}
          classNames={{
            base: 'w-auto min-w-28 shrink-0',
            trigger:
              '!min-h-10 !h-10 max-h-10 !py-0 !px-3 group-data-[focus=true]:!bg-c3 data-[hover=true]:!bg-c3',
            value: 'text-c6 text-sm',
          }}>
          <SelectItem key='asc'>A-Z</SelectItem>
          <SelectItem key='desc'>Z-A</SelectItem>
        </Select>
      </div>
      <div className='flex flex-col w-full'>
        <ul className='flex items-center gap-2.5 pt-2.5 pb-5 flex-wrap'>
          <p className='text-c5'>Selection :</p>
          {selectedValues.map((id, index) => (
            <Button
              key={index}
              onClick={() => handleDeselect(id)}
              radius='none'
              className={`py-2.5 h-full px-2.5 gap-2.5 text-sm rounded-lg bg-action text-selected transition-all ease-in-out duration-200 navfilter flex items-center`}
              endContent={<CrossIcon size={18} />}>
              {reducer(idToDisplayNameMap[id], 30)}
            </Button>
          ))}
        </ul>
        <ul className='flex items-center gap-3 py-2.5 flex-wrap max-h-[150px] overflow-y-auto'>
          {filteredNonSelectedValues.map((id, index) => (
            <Button
              key={index}
              onClick={() => handleSelect(id)}
              radius='none'
              className={`py-2.5 h-full px-2.5 text-sm rounded-xl text-c6 bg-c2 border-2 border-c3 hover:text-selected hover:bg-c3 transition-all ease-in-out duration-200 flex items-center`}>
              {reducer(idToDisplayNameMap[id])}
            </Button>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SelectionInput;
