import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePicker, type ResourcePickerProps } from './ResourcePicker';
import { fetchRelatedResourceSuggestions } from '@/services/relatedResourceSuggestions';
import { normalizePickerItem } from '@/services/resourcePickerApi';

export interface RelatedResourcePickerProps extends Omit<ResourcePickerProps, 'suggestionSection' | 'resourceTemplateId'> {
  resourceTemplateIds: number[];
  keywordIds?: (string | number)[];
  excludeItemId?: string | number;
}

const EMPTY_KEYWORD_IDS: (string | number)[] = [];
const EMPTY_SELECTED_IDS: (string | number)[] = [];

const serializeIds = (ids: (string | number)[]): string =>
  ids.map((id) => String(id)).sort().join(',');

/**
 * Picker dédié aux contenus associés (schema:isRelatedTo).
 * Propose des suggestions basées sur les mots-clés communs avec la fiche courante.
 */
export const RelatedResourcePicker: React.FC<RelatedResourcePickerProps> = ({
  keywordIds: keywordIdsProp,
  excludeItemId,
  resourceTemplateIds,
  selectedIds: selectedIdsProp,
  filterFn,
  isOpen,
  ...pickerProps
}) => {
  const keywordIds = keywordIdsProp ?? EMPTY_KEYWORD_IDS;
  const selectedIds = selectedIdsProp ?? EMPTY_SELECTED_IDS;

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const keywordIdsKey = serializeIds(keywordIds);
  const selectedIdsKey = serializeIds(selectedIds);
  const templateIdsKey = serializeIds(resourceTemplateIds);

  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    if (keywordIds.length === 0) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    fetchRelatedResourceSuggestions({
      keywordIds,
      allowedTemplateIds: resourceTemplateIds,
      excludeItemId,
      excludeIds: selectedIds,
      limit: 4,
    })
      .then((items) => {
        if (cancelled) return;
        setSuggestions(
          items.map((item) => ({
            ...normalizePickerItem(item),
            matchScore: item.matchScore,
            subtitle: item.subtitle,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, keywordIdsKey, selectedIdsKey, templateIdsKey, excludeItemId]);

  const combinedFilterFn = useCallback(
    (resource: any) => {
      if (filterFn && !filterFn(resource)) return false;
      const resourceId = resource['o:id'] ?? resource.id;
      if (excludeItemId != null && String(resourceId) === String(excludeItemId)) return false;
      return true;
    },
    [filterFn, excludeItemId],
  );

  const suggestionSection = useMemo(
    () => ({
      title: 'Suggestions intelligentes',
      items: suggestions,
      loading: suggestionsLoading && keywordIds.length > 0,
      keywordCount: keywordIds.length,
    }),
    [suggestions, suggestionsLoading, keywordIds.length],
  );

  return (
    <ResourcePicker
      {...pickerProps}
      isOpen={isOpen}
      resourceTemplateIds={resourceTemplateIds}
      selectedIds={selectedIds}
      filterFn={combinedFilterFn}
      suggestionSection={suggestionSection}
      showResourceType
    />
  );
};

export default RelatedResourcePicker;
