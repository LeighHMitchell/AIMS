export interface TestField {
  key: string;
  selector: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'number' | 'multiselect';
  sample: string | string[];
  dbColumn?: string;
  tab?: string;
  waitAfterInput?: number;
}

export const FIELD_MATRIX: TestField[] = [
  {
    key: 'title',
    selector: 'input[name="title"], #title, input[placeholder*="title" i]',
    type: 'text',
    sample: 'Demo Activity Title - E2E Test',
    tab: 'basic'
  },
  {
    key: 'description', 
    selector: 'textarea[name="description"], #description, textarea[placeholder*="description" i]',
    type: 'textarea',
    sample: 'E2E diagnostic test description',
    tab: 'basic'
  },
  {
    key: 'activity_status',
    selector: 'select[name="activity_status"], select[name="status"], #activity_status',
    type: 'select', 
    sample: 'implementation',
    dbColumn: 'activity_status',
    tab: 'basic'
  }
];

export const UI_INDICATORS = {
  savingSpinner: {
    selector: '[data-testid="saving-indicator"], .saving-spinner, [aria-label*="Saving"], .animate-spin',
    expectedState: 'visible',
    timeout: 2000
  },
  successTick: {
    selector: '[data-testid="saved-indicator"], .saved-tick, [aria-label*="Saved"], .text-green-500, .text-green-600',
    expectedState: 'visible', 
    timeout: 5000
  }
};

export const TEST_CONFIG = {
  baseUrl: 'https://aims-pi.vercel.app',
  testTimeout: 60000,
  debounceWait: 1000,
  rapidEditDelay: 100
};