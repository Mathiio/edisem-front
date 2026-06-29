import React, { useState, useEffect } from 'react';
import { Input, Spinner, Button, ModalBody, ModalFooter, ModalContent, Modal, ModalHeader, LinkIcon } from '@heroui/react';
import { addToast } from '@/theme/components';
import { modalCloseButtonClasses } from '@/theme/components/modal';
import { useGetDataByClassDetails } from '@/hooks/useFetchData';
import { SelectionInput } from '@/components/features/forms/SelectionInput';
import { Textarea } from '@heroui/react';

import { TimecodeInput, DatePicker } from '@/components/features/forms/TimecodeInput';
import { ModalTitle } from '@/components/ui/ModalTitle';
import { EditIcon, EyeIcon } from '@/components/ui/icons';
import MultipleInputs from '@/components/features/forms/MultipleInputs';
import type { InputConfig } from '@/components/features/forms/editModalTypes';

import Omk from '@/services/Omk';

function getValueByPath<T>(object: T[], path: string): any {
  if (!path) return undefined;
  if (!Array.isArray(object) || object.length === 0) return undefined;

  const keys = path.split('.');
  let value: any = object[0];

  for (const key of keys) {
    if (Array.isArray(value)) {
      value = value[parseInt(key)];
    } else if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

export type { InputConfig } from '@/components/features/forms/editModalTypes';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemUrl: string;
  activeConfig: string | null; // Modifiez ce type en fonction de votre besoin
  itemPropertiesData: any; // Ajoutez le type approprié
  propertiesLoading: boolean;
  justView?: boolean;
}

export const inputConfigs: { [key: string]: InputConfig[] } = {
  conferences: [
    { key: 'titre', label: 'Titre', dataPath: 'dcterms:title.0.@value', type: 'input' },
    {
      key: 'conferencier',
      label: 'Conférencier',
      dataPath: 'schema:agent',
      type: 'selection',
      options: ['display_title'],
      selectionId: [72],
    },
    { key: 'dcterms:abstract', label: 'Résumé', dataPath: 'dcterms:abstract.0.@value', type: 'textarea' },
    { key: 'schema:abstract', label: 'Résumé ChatGPT', dataPath: 'schema:abstract.0.@value', type: 'textarea' },
    {
      key: 'schema:citation',
      label: 'Citations',
      dataPath: 'schema:citation',
      type: 'selection',
      options: ['display_title'],
      selectionId: [80],
    },
    {
      key: 'schema:isRelatedTo',
      label: 'Conférence associés',
      dataPath: 'schema:isRelatedTo',
      type: 'selection',
      options: ['display_title'],
      selectionId: [71],
    },
    { key: 'url', label: 'Url de la vidéo', dataPath: 'schema:url.0.@id', type: 'input' },
    {
      key: 'schema:contentUrl',
      label: 'URL de la séance',
      dataPath: 'schema:contentUrl.0.@id',
      type: 'input',
    },
    {
      key: 'dcterms:date',
      label: 'Date',
      dataPath: 'dcterms:date.0.@value',
      type: 'date',
    },
    {
      key: 'jdc:hasConcept',
      label: 'Concept associé',
      dataPath: 'jdc:hasConcept',
      type: 'selection',
      options: ['display_title'],
      selectionId: [34],
    },
  ],
  citations: [
    { key: 'schema:citation', label: 'Citations', dataPath: 'cito:hasCitedEntity.0.@value', type: 'textarea' },
    {
      key: 'conferencier',
      label: 'Conférencier',
      dataPath: 'cito:isCitedBy',
      type: 'selection',
      options: ['display_title'],
      selectionId: [72],
    },

    {
      key: 'starttime',
      label: 'Timecode de début',
      dataPath: 'schema:startTime.0.@value',
      type: 'time',
    },
    {
      key: 'endtime',
      label: 'Timecode de fin',
      dataPath: 'schema:endTime.0.@value',
      type: 'time',
    },
    { key: 'Conférence', label: 'Conférence associé', dataPath: '@reverse.schema:citation.0.@id', type: 'lien' },
  ],
  conferenciers: [
    { key: 'titre', label: 'Nom et Prénom*', dataPath: 'dcterms:title.0.@value', type: 'input' },
    { key: 'prenom', label: 'Prénom', dataPath: 'foaf:firstName.0.@value', type: 'input' },
    { key: 'nom', label: 'Nom', dataPath: 'foaf:lastName.0.@value', type: 'input' },
    { key: 'schema:url', label: 'URL cv en ligne', dataPath: 'schema:url.0.@id', type: 'input' },
    {
      key: 'jdc:hasUniversity',
      label: 'Université',
      dataPath: 'jdc:hasUniversity',
      type: 'selection',
      options: ['display_title'],
      selectionId: [73],
    },
    {
      key: 'jdc:hasEcoleDoctorale',
      label: 'École doctorale',
      dataPath: 'jdc:hasEcoleDoctorale',
      type: 'selection',
      options: ['display_title'],
      selectionId: [74],
    },
    {
      key: 'jdc:hasLaboratoire',
      label: 'Laboratoire',
      dataPath: 'jdc:hasLaboratoire',
      type: 'selection',
      options: ['display_title'],
      selectionId: [91],
    },
    { key: 'schema:email', label: 'Email', dataPath: 'schema:email.0.@value', type: 'input' },
  ],
  pays: [{ key: 'Pays', label: 'Nom du pays', dataPath: 'dcterms:title.0.@value', type: 'input' }],
  laboratoire: [
    { key: 'nom', label: 'Nom du laboratoire', dataPath: 'dcterms:title.0.@value', type: 'input' },
    { key: 'url', label: 'Url', dataPath: 'schema:url.0.@id', type: 'input' },
  ],
  ecolesdoctorales: [
    { key: 'nom', label: "Nom de l'école", dataPath: 'dcterms:title.0.@value', type: 'input' },
    { key: 'url', label: 'Url', dataPath: 'schema:url.0.@id', type: 'input' },
  ],
  universites: [
    { key: 'nom', label: "Nom de l'univeristé", dataPath: 'dcterms:title.0.@value', type: 'input' },
    { key: 'url', label: 'Url', dataPath: 'schema:url.0.@id', type: 'input' },
    {
      key: 'pays',
      label: 'Pays',
      dataPath: 'schema:addressCountry',
      type: 'selection',
      options: ['display_title'],
      selectionId: [94],
    },
  ],
  motcles: [
    { key: 'Motcles', label: 'Titre du mot clé', dataPath: 'dcterms:title.0.@value', type: 'input' },

    {
      key: 'skos:prefLabel',
      label: 'Titre préféré',
      dataPath: 'skos:prefLabel.0.@value',
      type: 'inputs',
      options: ['language'],
    },
    {
      key: 'skos:altLabel',
      label: 'Titre alternatif',
      dataPath: 'skos:altLabel.0.@value',
      type: 'inputs',
    },
    {
      key: 'skos:hiddenLabel',
      label: 'Titre caché',
      dataPath: 'skos:hiddenLabel.0.@value',
      type: 'inputs',
    },
    { key: 'Description', label: 'Description du mot clé', dataPath: 'dcterms:description.0.@value', type: 'textarea' },
    {
      key: 'skos:exactMatch',
      label: 'Concept synonyme',
      dataPath: 'skos:exactMatch',
      type: 'selection',
      options: ['display_title'],
      selectionId: [34],
    },
    {
      key: 'skos:broader',
      label: 'Concept parent',
      dataPath: 'skos:broader',
      type: 'selection',
      options: ['display_title'],
      selectionId: [34],
    },
    {
      key: 'skos:narrower',
      label: 'Concept enfant',
      dataPath: 'skos:narrower',
      type: 'selection',
      options: ['display_title'],
      selectionId: [34],
    },
    {
      key: 'skos:related',
      label: 'Concept associatif',
      dataPath: 'skos:related',
      type: 'selection',
      options: ['display_title'],
      selectionId: [34],
    },
    {
      key: 'skos:broadMatch',
      label: 'Concept ChatGPT',
      dataPath: 'skos:broadMatch',
      type: 'selection',
      options: ['display_title'],
      selectionId: [34],
    },
    {
      key: 'schema:genre',
      label: 'Genre',
      dataPath: 'schema:genre',
      type: 'selection',
      options: ['display_title', 13544],
      selectionId: [34],
    },
  ],
};

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, itemUrl, activeConfig, itemPropertiesData, propertiesLoading, justView = false }) => {
  const { data: itemDetailsData, loading: detailsLoading, error: detailsError, refetch: refetchItemDetails } = useGetDataByClassDetails(itemUrl);

  const [itemData, setItemData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const clearState = () => {
    setItemData({});
  };

  const clearDetailsState = () => {
    refetchItemDetails(); // Optionally, if your hook supports refetching data
    // Otherwise, manually reset your state variables
    // setItemDetailsData(null);
    // setDetailsLoading(false);
    // setDetailsError(null);
  };

  const pa = {
    api: 'https://tests.arcanes.ca/omk/api/',
  };

  const omks = new Omk(pa);
  omks.init();

  useEffect(() => {
    if (detailsError) {
      console.error('Error fetching item details:', detailsError);
    }
  }, [detailsError]);

  const handleInputChange = (path: string, value: any) => {
    setItemData((prevData: any) => {
      const newData = { ...prevData };
      const keys = path;
      const current = newData;

      if (Array.isArray(value)) {
        if (Array.isArray(current[keys])) {
          current[keys] = value;
        } else {
          current[keys] = [value];
        }
      } else {
        current[keys] = value;
      }

      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      if (!itemUrl) {
        throw new Error('Item URL is not defined or empty');
      }

      const segments = itemUrl.split('/');
      if (segments.length === 0) {
        throw new Error('Invalid item URL format');
      }

      const itemId = segments.pop();
      if (!itemId) {
        throw new Error('Failed to extract item ID');
      }

      omks.props = itemPropertiesData;
      if (itemDetailsData) {
        const object = omks.buildObjectUpdate(itemDetailsData[0], itemData);

        const updatePromise = omks.updateItem(itemId, object);

        addToast({
          title: "Mise à jour de l'item",
          description: 'Mise à jour en cours...',
          promise: updatePromise,
        });

        await updatePromise;

        addToast({
          title: 'Succès',
          description: "L'item a été mis à jour avec succès",
          color: 'success',
        });
      }

      setSaving(false);
      refetchItemDetails(); // Trigger data refresh
      onClose(); // Close the modal after successful save
    } catch (error) {
      // Toast d'erreur
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

      addToast({
        title: 'Erreur',
        description: `Échec de la mise à jour : ${errorMessage}`,
        color: 'danger',
      });

      setSaveError(errorMessage);
      setSaving(false);
    }
  };

  // Spinner et message de chargement
  if (propertiesLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <Spinner color='secondary' />
          <p>Chargement...</p>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        backdrop='blur'
        className='bg-c2'
        size='2xl'
        isOpen={isOpen}
        onClose={() => {
          clearState(); // Clear state when modal closes
          clearDetailsState();
          onClose(); // Close the modal
        }}
        classNames={{ closeButton: modalCloseButtonClasses }}
        scrollBehavior='inside'
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: 'easeOut',
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: 'easeIn',
              },
            },
          },
        }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className='p-6'>
                <ModalTitle
                  title={justView ? 'Détails' : 'Modification'}
                  icon={justView ? EyeIcon : EditIcon}
                  iconColor='text-action'
                  iconBg='bg-action/20'
                  titleClassName='text-c6 text-3xl font-medium'
                />
              </ModalHeader>
              <ModalBody className='flex p-6'>
                <div className='flex flex-col gap-12 items-start scroll-y-auto text-c6'>
                  {activeConfig && !detailsLoading ? (
                    itemDetailsData &&
                    inputConfigs[activeConfig]?.map((col: InputConfig) => {
                      const value = getValueByPath(itemDetailsData, col.dataPath);

                      if (col.type === 'input') {
                        return (
                          <>
                            <Input
                              key={col.key}
                              size='lg'
                              classNames={{
                                label: 'text-semibold !text-c6 text-2xl',
                                inputWrapper: 'bg-c1 shadow-none border-1 border-200',
                                input: 'h-[50px] ',
                              }}
                              isReadOnly={justView}
                              className='min-h-[50px]'
                              type='text'
                              label={col.label}
                              labelPlacement='outside-top'
                              placeholder={`Entrez ${col.label}`}
                              defaultValue={value}
                              onChange={(e) => handleInputChange(col.dataPath, e.target.value)}
                            />
                          </>
                        );
                      } else if (col.type === 'textarea') {
                        return (
                          <Textarea
                            key={col.key}
                            size='lg'
                            classNames={{
                              label: 'text-semibold text-c6 text-2xl',
                              inputWrapper: 'bg-c1 shadow-none border-1 border-200',
                              input: 'h-[50px]',
                            }}
                            isReadOnly={justView}
                            className='min-h-[50px]'
                            type='text'
                            label={col.label}
                            labelPlacement='outside-top'
                            placeholder={`Entrez ${col.label}`}
                            defaultValue={value}
                            onChange={(e) => handleInputChange(col.dataPath, e.target.value)}
                          />
                        );
                      } else if (col.type === 'time') {
                        return (
                          <>
                            <TimecodeInput
                              key={col.key}
                              label={col.label}
                              value={value}
                              isReadOnly={justView}
                              handleInputChange={(v) => handleInputChange(col.dataPath, v)}
                            />
                          </>
                        );
                      } else if (col.type === 'date') {
                        return (
                          <>
                            <DatePicker key={col.key} label={col.label} date={value} handleInputChange={(value) => handleInputChange(col.dataPath, value)} />
                          </>
                        );
                      } else if (col.type === 'selection') {
                        return <SelectionInput justView={justView} key={col.key} col={col} actualData={itemDetailsData} handleInputChange={handleInputChange} />;
                      } else if (col.type === 'inputs') {
                        return <MultipleInputs key={col.key} col={col} actualData={itemDetailsData} handleInputChange={handleInputChange} />;
                      } else {
                        return null;
                      }
                    })
                  ) : (
                    <Spinner color='secondary' />
                  )}

                  {saveError && <div className='error'>{saveError}</div>}
                </div>
              </ModalBody>
              <ModalFooter className='flex items-center justify-end p-6'>
                <div className='flex flex-row gap-6'>
                  {activeConfig && !detailsLoading && itemDetailsData && (
                    <>
                      {inputConfigs[activeConfig]?.map((col: InputConfig) => {
                        const value = getValueByPath(itemDetailsData, col.dataPath);
                        if (col.type === 'lien') {
                          return (
                            <Button
                              key={col.dataPath}
                              onClick={() => {
                                if (col.dataPath === 'schema:url.0.@id') {
                                  const conferenceUrl = value;
                                  window.open(conferenceUrl, '_blank', 'noopener,noreferrer');
                                }
                                const resourceId = value.split('/').pop();
                                // Formation du nouveau lien pour la conférence
                                const conferenceUrl = `https://edisem.arcanes.ca/conference/${resourceId}`;
                                // Ouverture dans un nouvel onglet
                                window.open(conferenceUrl, '_blank', 'noopener,noreferrer');
                              }}
                              endContent={<LinkIcon />}
                              radius='none'
                              className='h-[32px] px-2.5 text-base rounded-lg text-selected bg-c3 transition-all ease-in-out duration-200 navfilter flex items-center'>
                              {col.label}
                            </Button>
                          );
                        }
                        return null;
                      })}
                    </>
                  )}

                  {!justView ? (
                    <Button
                      onPress={onClose}
                      onClick={handleSave}
                      disabled={saving}
                      radius='none'
                      className='h-[32px] px-2.5 text-base rounded-lg text-selected bg-action transition-all ease-in-out duration-200 navfilter flex items-center'>
                      Modifier
                    </Button>
                  ) : (
                    <Button
                      onPress={onClose}
                      radius='none'
                      className='h-[32px] px-2.5 text-base rounded-lg text-selected bg-action transition-all ease-in-out duration-200 navfilter flex items-center'>
                      Fermer
                    </Button>
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
