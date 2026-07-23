import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Input, Select, SelectItem } from '@/theme/components';
import { InputConfig } from '@/components/features/forms/fields/editModalTypes';
import { AddIcon } from '@/components/ui/icons';
import { formatEditAddButtonLabel } from '@/lib/editModeLabels';

interface SelectionInputProps {
  col: InputConfig;
  actualData?: any;
  handleInputChange: (path: string, value: any) => void;
}

type InputValue = {
  values: string;
  language?: string; // Make language optional
};

const MultipleInputs: React.FC<SelectionInputProps> = ({ col, actualData, handleInputChange }) => {
  const [inputValues, setInputValues] = useState<InputValue[]>([]);
  const isLanguageField = col.options && col.options[0] === 'language';

  useEffect(() => {
    if (actualData && actualData[0] && actualData[0][col.key] && actualData[0][col.key].length > 0) {
      let initialValues: InputValue[] = [];
      if (isLanguageField) {
        initialValues = actualData[0][col.key].map((data: any) => ({
          values: data['@value'] || '',
          language: data['@language'] || 'fr', // Assuming default language is 'fr'
        }));
      } else {
        initialValues = actualData[0][col.key].map((data: any) => ({
          values: data['@value'] || '',
        }));
      }

      setInputValues(initialValues);
    }
  }, [actualData, col.key, isLanguageField]);

  const handleChange = (index: number, newValue: string) => {
    const updatedValues = [...inputValues];
    updatedValues[index].values = newValue;
    setInputValues(updatedValues);
    if (isLanguageField) {
      handleInputChange(col.dataPath, updatedValues);
    } else {
      handleInputChange(
        col.dataPath,
        updatedValues.map((value) => value.values),
      );
    }
  };

  const handleLanguageChange = (index: number, newLanguage: string) => {
    const updatedValues = [...inputValues];
    updatedValues[index].language = newLanguage;
    setInputValues(updatedValues);
    handleInputChange(col.dataPath, updatedValues);
  };

  const handleAddInput = () => {
    setInputValues([...inputValues, { values: '', language: 'fr' }]);
  };

  const canAddMoreInputs = !isLanguageField || inputValues.length < 2;

  return (
    <div className='flex flex-col gap-2.5 w-full'>
      {inputValues.map((value, index) => (
        <div key={`${col.key}-${index}`} className='w-full flex flex-row gap-2.5 items-end'>
          <Input
            label={index === 0 ? col.label : undefined}
            aria-label={index === 0 ? undefined : `${col.label} ${index + 1}`}
            classNames={{
              ...(index === 0 ? { label: 'text-semibold text-c6 text-2xl' } : {}),
              base: 'w-full flex-1 min-w-0',
              mainWrapper: 'w-full',
            }}
            type='text'
            labelPlacement='outside-top'
            placeholder={`Entrez ${col.label}`}
            defaultValue={value.values || ''}
            onChange={(e) => handleChange(index, e.target.value)}
          />
          {isLanguageField && (
            <div className='flex flex-row gap-2.5 mb-4 items-end'>
              <Select
                aria-label='Langue'
                disallowEmptySelection
                selectionMode='single'
                selectedKeys={[value.language || 'fr']}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys)[0] as string;
                  if (k === 'fr' || k === 'en') handleLanguageChange(index, k);
                }}
                classNames={{
                  base: 'w-[100px] shrink-0',
                  trigger: '!min-h-[50px]',
                  value: 'text-c6',
                }}>
                <SelectItem key='fr'>Fr</SelectItem>
                <SelectItem key='en'>En</SelectItem>
              </Select>
            </div>
          )}
        </div>
      ))}
      {canAddMoreInputs && (
        <Button
          startContent={<AddIcon size={16} />}
          className='px-[15px] py-2.5 min-h-[50px] flex gap-2.5 bg-c3 border-none rounded-lg w-full hover:text-action text-c6 font-medium'
          onClick={handleAddInput}>
          {formatEditAddButtonLabel(col.label)}
        </Button>
      )}
    </div>
  );
};

export default MultipleInputs;
