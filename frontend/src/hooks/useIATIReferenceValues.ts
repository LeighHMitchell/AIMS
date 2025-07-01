import { useState, useEffect } from 'react';

export interface IATIReferenceValue {
  code: string;
  name: string;
}

export interface IATIReferenceData {
  transaction_type: IATIReferenceValue[];
  aid_type: IATIReferenceValue[];
  flow_type: IATIReferenceValue[];
  finance_type: IATIReferenceValue[];
  disbursement_channel: IATIReferenceValue[];
  tied_status: IATIReferenceValue[];
  organization_type: IATIReferenceValue[];
}

export function useIATIReferenceValues() {
  const [data, setData] = useState<IATIReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferenceValues = async () => {
      try {
        const response = await fetch('/api/iati-reference-values');
        if (!response.ok) {
          throw new Error('Failed to fetch reference values');
        }
        
        const result = await response.json();
        setData(result.fields);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchReferenceValues();
  }, []);

  // Helper function to get values for a specific field
  const getFieldValues = (fieldName: keyof IATIReferenceData): IATIReferenceValue[] => {
    return data?.[fieldName] || [];
  };

  // Helper function to get a specific value by code
  const getValue = (fieldName: keyof IATIReferenceData, code: string): IATIReferenceValue | null => {
    const values = getFieldValues(fieldName);
    return values.find(v => v.code === code) || null;
  };

  // Helper function to validate a code
  const isValidCode = (fieldName: keyof IATIReferenceData, code: string): boolean => {
    return getValue(fieldName, code) !== null;
  };

  return {
    data,
    loading,
    error,
    getFieldValues,
    getValue,
    isValidCode
  };
}

// Hook to fetch values for a specific field
export function useIATIFieldValues(fieldName: keyof IATIReferenceData) {
  const [values, setValues] = useState<IATIReferenceValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFieldValues = async () => {
      try {
        const response = await fetch(`/api/iati-reference-values?field_name=${fieldName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch field values');
        }
        
        const result = await response.json();
        setValues(result.values);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFieldValues();
  }, [fieldName]);

  return {
    values,
    loading,
    error
  };
}