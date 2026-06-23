import { useState, useCallback, useMemo } from 'react';
import { FormFieldConfig } from '@/pages/generic/config';
import { validateFlexibleDateValue } from '@/lib/flexibleDate';

/**
 * État du formulaire
 */
export interface FormState {
  data: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Actions du formulaire
 */
export interface FormActions {
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string) => void;
  setFieldTouched: (field: string) => void;
  setMultipleValues: (values: Record<string, any>) => void;
  resetForm: (initialData?: Record<string, any>) => void;
  validateField: (field: string) => string | null;
  validateForm: () => boolean;
  getFieldValue: (field: string) => any;
  hasFieldError: (field: string) => boolean;
}

interface UseFormStateOptions {
  initialData?: Record<string, any>;
  fields?: FormFieldConfig[];
  onSubmit?: (data: Record<string, any>) => Promise<void>;
}

/**
 * Hook de gestion d'état de formulaire
 */
export function useFormState(options: UseFormStateOptions = {}) {
  const { initialData = {}, fields = [] } = options;

  const [data, setData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalData] = useState<Record<string, any>>(initialData);

  // Calcul de isDirty
  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  // Calcul de isValid
  const isValid = useMemo(() => {
    // Vérifier les champs requis
    for (const field of fields) {
      if (field.required) {
        const value = data[field.key];
        if (value === undefined || value === null || value === '') {
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
      }
    }
    // Vérifier qu'il n'y a pas d'erreurs
    return Object.keys(errors).length === 0;
  }, [data, errors, fields]);

  // Définir la valeur d'un champ
  const setFieldValue = useCallback((field: string, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur quand on modifie le champ
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Définir une erreur sur un champ
  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Marquer un champ comme touché
  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Définir plusieurs valeurs à la fois
  const setMultipleValues = useCallback((values: Record<string, any>) => {
    setData((prev) => ({ ...prev, ...values }));
  }, []);

  // Réinitialiser le formulaire
  const resetForm = useCallback((newInitialData?: Record<string, any>) => {
    setData(newInitialData || initialData);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialData]);

  // Valider un champ spécifique
  const validateField = useCallback(
    (field: string): string | null => {
      const fieldConfig = fields.find((f) => f.key === field);
      if (!fieldConfig) return null;

      const value = data[field];

      // Validation required
      if (fieldConfig.required) {
        if (value === undefined || value === null || value === '') {
          return `${fieldConfig.label} est requis`;
        }
        if (Array.isArray(value) && value.length === 0) {
          return `${fieldConfig.label} est requis`;
        }
      }

      // Validation min/max pour les nombres
      if (fieldConfig.type === 'number' || fieldConfig.type === 'slider') {
        if (typeof value === 'number') {
          if (fieldConfig.min !== undefined && value < fieldConfig.min) {
            return `${fieldConfig.label} doit être au moins ${fieldConfig.min}`;
          }
          if (fieldConfig.max !== undefined && value > fieldConfig.max) {
            return `${fieldConfig.label} doit être au plus ${fieldConfig.max}`;
          }
        }
      }

      // Validation URL
      if (fieldConfig.type === 'url' && value) {
        try {
          new URL(value);
        } catch {
          return `${fieldConfig.label} doit être une URL valide`;
        }
      }

      // Validation date (format inféré : AAAA, MM/AAAA ou JJ/MM/AAAA)
      if (fieldConfig.type === 'date') {
        const dateError = validateFlexibleDateValue(value, {
          required: fieldConfig.required === true,
          label: fieldConfig.label,
        });
        if (dateError) return dateError;
      }

      return null;
    },
    [data, fields]
  );

  // Valider tout le formulaire
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isFormValid = true;

    for (const field of fields) {
      const error = validateField(field.key);
      if (error) {
        newErrors[field.key] = error;
        isFormValid = false;
      }
    }

    setErrors(newErrors);
    return isFormValid;
  }, [fields, validateField]);

  // Obtenir la valeur d'un champ
  const getFieldValue = useCallback(
    (field: string) => {
      return data[field];
    },
    [data]
  );

  // Vérifier si un champ a une erreur
  const hasFieldError = useCallback(
    (field: string): boolean => {
      return touched[field] && !!errors[field];
    },
    [touched, errors]
  );

  // État du formulaire
  const state: FormState = {
    data,
    errors,
    touched,
    isDirty,
    isSubmitting,
    isValid,
  };

  // Actions du formulaire
  const actions: FormActions = {
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setMultipleValues,
    resetForm,
    validateField,
    validateForm,
    getFieldValue,
    hasFieldError,
  };

  return {
    state,
    actions,
    setIsSubmitting,
  };
}

export default useFormState;
