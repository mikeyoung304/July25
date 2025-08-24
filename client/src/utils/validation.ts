import { useState, useCallback, useMemo } from 'react';

/**
 * Common validation rules
 */
export const validators = {
  required: (value: unknown, message = 'This field is required') => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },

  email: (value: string, message = 'Please enter a valid email address') => {
    if (!value) return null; // Let required validator handle empty values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : message;
  },

  phone: (value: string, message = 'Please enter a valid 10-digit phone number') => {
    if (!value) return null; // Let required validator handle empty values
    const phoneRegex = /^\d{10}$/;
    const cleanedValue = value.replace(/\D/g, ''); // Remove non-digits
    return phoneRegex.test(cleanedValue) ? null : message;
  },

  minLength: (min: number, message?: string) => (value: string) => {
    if (!value) return null; // Let required validator handle empty values
    return value.length >= min ? null : (message || `Must be at least ${min} characters`);
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    if (!value) return null;
    return value.length <= max ? null : (message || `Must be no more than ${max} characters`);
  },

  pattern: (pattern: RegExp, message = 'Invalid format') => (value: string) => {
    if (!value) return null;
    return pattern.test(value) ? null : message;
  },

  number: (value: unknown, message = 'Must be a valid number') => {
    if (!value && value !== 0) return null;
    return !isNaN(Number(value)) ? null : message;
  },

  min: (min: number, message?: string) => (value: number | string) => {
    if (!value && value !== 0) return null;
    const num = Number(value);
    return num >= min ? null : (message || `Must be at least ${min}`);
  },

  max: (max: number, message?: string) => (value: number | string) => {
    if (!value && value !== 0) return null;
    const num = Number(value);
    return num <= max ? null : (message || `Must be no more than ${max}`);
  },

  url: (value: string, message = 'Please enter a valid URL') => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  creditCard: (value: string, message = 'Please enter a valid credit card number') => {
    if (!value) return null;
    const cleanedValue = value.replace(/\s/g, '');
    const cardRegex = /^\d{13,19}$/;
    return cardRegex.test(cleanedValue) ? null : message;
  },

  zipCode: (value: string, message = 'Please enter a valid ZIP code') => {
    if (!value) return null;
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(value) ? null : message;
  },
};

/**
 * Validation rule type
 */
export type ValidationRule = (value: unknown) => string | null;

/**
 * Field configuration for form validation
 */
export interface FieldConfig {
  rules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Form validation configuration
 */
export interface FormConfig {
  [fieldName: string]: FieldConfig;
}

/**
 * Form validation state
 */
export interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Form validation hook return type
 */
export interface UseFormValidationReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldError: (field: keyof T, error: string | null) => void;
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  validateField: (field: keyof T) => string | null;
  validateForm: () => boolean;
  resetForm: (values?: T) => void;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  clearErrors: () => void;
}

/**
 * Hook for form validation
 * 
 * @example
 * const form = useFormValidation({
 *   email: '',
 *   phone: '',
 * }, {
 *   email: {
 *     rules: [validators.required, validators.email],
 *     validateOnChange: true,
 *   },
 *   phone: {
 *     rules: [validators.required, validators.phone],
 *     validateOnBlur: true,
 *   },
 * });
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  config: FormConfig = {}
): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  const validateField = useCallback((field: keyof T): string | null => {
    const fieldConfig = config[field as string];
    if (!fieldConfig?.rules) return null;

    const value = values[field];
    for (const rule of fieldConfig.rules) {
      const error = rule(value);
      if (error) return error;
    }
    return null;
  }, [config, values]);

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);

    const fieldConfig = config[field as string];
    if (fieldConfig?.validateOnChange) {
      const error = validateField(field);
      setErrors(prev => ({
        ...prev,
        [field]: error || '',
      }));
    }
  }, [config, validateField]);

  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, touchedValue = true) => {
    setTouched(prev => ({ ...prev, [field]: touchedValue }));

    const fieldConfig = config[field as string];
    if (fieldConfig?.validateOnBlur && touchedValue) {
      const error = validateField(field);
      setErrors(prev => ({
        ...prev,
        [field]: error || '',
      }));
    }
  }, [config, validateField]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(config).forEach(field => {
      const error = validateField(field as keyof T);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, validateField]);

  const resetForm = useCallback((newValues?: T) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  const handleChange = useCallback((field: keyof T) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      setFieldValue(field, value);
    };
  }, [setFieldValue]);

  const handleBlur = useCallback((field: keyof T) => {
    return () => setFieldTouched(field, true);
  }, [setFieldTouched]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const isValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    handleChange,
    handleBlur,
    clearErrors,
  };
}

/**
 * Format phone number as user types
 */
export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return value;
}

/**
 * Format credit card number with spaces
 */
export function formatCreditCard(value: string): string {
  const cleaned = value.replace(/\s/g, '');
  const chunks = cleaned.match(/.{1,4}/g) || [];
  return chunks.join(' ');
}

/**
 * Clean and format currency values
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}