import { Page, Locator } from '@playwright/test';
import { TestField, UI_INDICATORS, TEST_CONFIG } from '../config/fields';

export class TestUtils {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Find field element with multiple selector fallbacks
  async findFieldElement(field: TestField): Promise<Locator | null> {
    const selectors = field.selector.split(', ');
    
    for (const selector of selectors) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0) {
        return element;
      }
    }
    
    // Additional fallback selectors based on field key
    const fallbackSelectors = [
      `[name="${field.key}"]`,
      `[id="${field.key}"]`,
      `[data-field="${field.key}"]`,
      `label:has-text("${field.key.replace(/_/g, ' ')}") >> input, textarea, select`
    ];
    
    for (const selector of fallbackSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          return element;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    return null;
  }

  // Set field value based on field type
  async setFieldValue(field: TestField, value: string | string[]): Promise<boolean> {
    const element = await this.findFieldElement(field);
    if (!element) {
      console.error(`Could not find field element for ${field.key}`);
      return false;
    }

    try {
      switch (field.type) {
        case 'text':
        case 'number':
          await element.clear();
          await element.fill(String(value));
          await element.blur();
          break;
          
        case 'textarea':
          await element.clear();
          await element.fill(String(value));
          await element.blur();
          break;
          
        case 'date':
          await element.clear();
          await element.fill(String(value));
          await element.blur();
          break;
          
        case 'select':
          await element.selectOption(String(value));
          break;
          
        case 'multiselect':
          if (Array.isArray(value)) {
            await element.selectOption(value);
          }
          break;
      }
      
      // Wait for potential debounce
      if (field.waitAfterInput) {
        await this.page.waitForTimeout(field.waitAfterInput);
      } else {
        await this.page.waitForTimeout(TEST_CONFIG.debounceWait);
      }
      
      return true;
    } catch (error) {
      console.error(`Error setting value for field ${field.key}:`, error);
      return false;
    }
  }

  // Get current field value
  async getFieldValue(field: TestField): Promise<string | string[] | null> {
    const element = await this.findFieldElement(field);
    if (!element) {
      return null;
    }

    try {
      switch (field.type) {
        case 'text':
        case 'number':
        case 'date':
          return await element.inputValue();
          
        case 'textarea':
          return await element.inputValue();
          
        case 'select':
          return await element.inputValue();
          
        case 'multiselect':
          return await element.evaluate((el: HTMLSelectElement) => {
            return Array.from(el.selectedOptions).map(opt => opt.value);
          });
          
        default:
          return await element.inputValue();
      }
    } catch (error) {
      console.error(`Error getting value for field ${field.key}:`, error);
      return null;
    }
  }

  // Clear field value
  async clearFieldValue(field: TestField): Promise<boolean> {
    const element = await this.findFieldElement(field);
    if (!element) {
      return false;
    }

    try {
      switch (field.type) {
        case 'text':
        case 'number':
        case 'textarea':
        case 'date':
          await element.clear();
          break;
          
        case 'select':
          await element.selectOption('');
          break;
          
        case 'multiselect':
          await element.selectOption([]);
          break;
      }
      
      await element.blur();
      return true;
    } catch (error) {
      console.error(`Error clearing field ${field.key}:`, error);
      return false;
    }
  }

  // Watch for saving spinner
  async waitForSavingSpinner(): Promise<{ seen: boolean; timestamp?: number }> {
    const selectors = UI_INDICATORS.savingSpinner.selector.split(', ');
    const startTime = Date.now();
    
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        await element.waitFor({ 
          state: 'visible', 
          timeout: UI_INDICATORS.savingSpinner.timeout 
        });
        return { seen: true, timestamp: Date.now() - startTime };
      } catch {
        // Try next selector
      }
    }
    
    return { seen: false };
  }

  // Watch for success tick
  async waitForSuccessTick(): Promise<{ seen: boolean; timestamp?: number }> {
    const selectors = UI_INDICATORS.successTick.selector.split(', ');
    const startTime = Date.now();
    
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        await element.waitFor({ 
          state: 'visible', 
          timeout: UI_INDICATORS.successTick.timeout 
        });
        return { seen: true, timestamp: Date.now() - startTime };
      } catch {
        // Try next selector
      }
    }
    
    return { seen: false };
  }

  // Check if tick is shown for empty field
  async isTickShownForEmptyField(): Promise<boolean> {
    const selectors = UI_INDICATORS.successTick.selector.split(', ');
    
    for (const selector of selectors) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        return true;
      }
    }
    
    return false;
  }

  // Navigate to activity editor
  async navigateToActivityEditor(activityId: string): Promise<void> {
    const editorUrl = `${TEST_CONFIG.baseUrl}/activities/${activityId}/edit`;
    await this.page.goto(editorUrl, { waitUntil: 'networkidle' });
    
    // Wait for editor to fully load
    await this.page.waitForSelector('form', { timeout: TEST_CONFIG.navigationTimeout });
  }

  // Navigate to a specific tab in the editor
  async navigateToTab(tabName: string): Promise<boolean> {
    try {
      // Try multiple selectors for tabs
      const tabSelectors = [
        `button:has-text("${tabName}")`,
        `a:has-text("${tabName}")`,
        `[role="tab"]:has-text("${tabName}")`,
        `[data-tab="${tabName.toLowerCase()}"]`,
        `.tab:has-text("${tabName}")`
      ];
      
      for (const selector of tabSelectors) {
        const tab = this.page.locator(selector).first();
        if (await tab.count() > 0) {
          await tab.click();
          await this.page.waitForTimeout(500); // Wait for tab content to load
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error navigating to tab ${tabName}:`, error);
      return false;
    }
  }

  // Navigate forward and back
  async navigateForwardAndBack(): Promise<void> {
    // Navigate to another page
    await this.page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
    
    // Navigate back
    await this.page.goBack({ waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  // Perform hard refresh
  async performHardRefresh(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  // Perform rapid edits to test race conditions
  async performRapidEdits(field: TestField, values: string[]): Promise<string> {
    let lastValue = '';
    
    for (const value of values) {
      await this.setFieldValue(field, value);
      lastValue = value;
      await this.page.waitForTimeout(TEST_CONFIG.rapidEditDelay);
    }
    
    // Wait for final save to complete
    await this.page.waitForTimeout(TEST_CONFIG.debounceWait * 2);
    
    return lastValue;
  }

  // Take screenshot on failure
  async takeScreenshot(fileName: string): Promise<Buffer> {
    return await this.page.screenshot({ 
      fullPage: true,
      type: 'png'
    });
  }

  // Monitor network requests during save
  async monitorNetworkSave(action: () => Promise<void>): Promise<any[]> {
    const requests: any[] = [];
    
    this.page.on('request', (request) => {
      if (request.url().includes('supabase') && 
          (request.method() === 'POST' || request.method() === 'PUT' || request.method() === 'PATCH')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    await action();
    
    // Wait a bit to capture any delayed requests
    await this.page.waitForTimeout(1000);
    
    return requests;
  }

  // Check if error is displayed
  async hasError(): Promise<boolean> {
    const errorSelectors = UI_INDICATORS.errorIndicator.selector.split(', ');
    
    for (const selector of errorSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        return true;
      }
    }
    
    return false;
  }

  // Get error message if present
  async getErrorMessage(): Promise<string | null> {
    const errorSelectors = UI_INDICATORS.errorIndicator.selector.split(', ');
    
    for (const selector of errorSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible()) {
        return await element.textContent();
      }
    }
    
    return null;
  }
}

export default TestUtils;