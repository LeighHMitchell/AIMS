import { GPEDCFormData, GPEDCValidationErrors } from '../types/gpedc';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// URL validation regex
const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

export function validateGPEDCForm(data: GPEDCFormData): {
  isValid: boolean;
  errors: GPEDCValidationErrors;
} {
  const errors: GPEDCValidationErrors = {};

  // Validate contact details
  if (!data.contact.name?.trim()) {
    errors['contact.name'] = 'Contact name is required';
  }

  if (!data.contact.organisation?.trim()) {
    errors['contact.organisation'] = 'Organisation is required';
  }

  if (!data.contact.email?.trim()) {
    errors['contact.email'] = 'Email is required';
  } else if (!emailRegex.test(data.contact.email)) {
    errors['contact.email'] = 'Please enter a valid email address';
  }

  if (data.contact.phoneNumber && !phoneRegex.test(data.contact.phoneNumber.replace(/\s/g, ''))) {
    errors['contact.phoneNumber'] = 'Please enter a valid phone number with international code';
  }

  // Validate outcome indicators
  if (data.developmentEffectiveness.numberOfOutcomeIndicators !== undefined) {
    if (data.developmentEffectiveness.numberOfOutcomeIndicators < 0) {
      errors['developmentEffectiveness.numberOfOutcomeIndicators'] = 'Number of indicators cannot be negative';
    }
  }

  // Validate external link
  if (data.documents.externalLink && !urlRegex.test(data.documents.externalLink)) {
    errors['documents.externalLink'] = 'Please enter a valid URL';
  }

  // Check if at least one question is answered in each output section
  const hasOutput1Answer = Object.values(data.developmentEffectiveness).some(v => v !== undefined && v !== null);
  const hasOutput2Answer = Object.values(data.governmentSystems).some(v => v !== undefined && v !== null);
  const hasOutput3Answer = Object.values(data.budgetPlanning).some(v => v !== undefined && v !== null);

  if (!hasOutput1Answer) {
    errors['developmentEffectiveness'] = 'Please answer at least one question in Output 1';
  }

  if (!hasOutput2Answer) {
    errors['governmentSystems'] = 'Please answer at least one question in Output 2';
  }

  if (!hasOutput3Answer) {
    errors['budgetPlanning'] = 'Please answer at least one question in Output 3';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Format phone number with spacing
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Apply formatting based on length
  if (cleaned.startsWith('+')) {
    // International format
    const withoutPlus = cleaned.slice(1);
    if (withoutPlus.length <= 3) return cleaned;
    if (withoutPlus.length <= 6) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    if (withoutPlus.length <= 9) return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
  }
  
  return cleaned;
}