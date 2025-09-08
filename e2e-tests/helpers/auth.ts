import { Page, BrowserContext } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export class AuthHelper {
  private readonly email: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor() {
    this.email = process.env.TEST_EMAIL || 'test@example.com';
    this.password = process.env.TEST_PASSWORD || 'testpassword123';
    this.baseUrl = process.env.APP_BASE_URL || 'https://aims-pi.vercel.app';
  }

  async login(page: Page): Promise<boolean> {
    try {
      // Navigate to login page
      await page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle' });

      // Check if already logged in by looking for a logout button or user menu
      const isLoggedIn = await this.isAuthenticated(page);
      if (isLoggedIn) {
        console.log('Already logged in');
        return true;
      }

      // Fill login form - try multiple possible selectors
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        '#email',
        'input[placeholder*="email" i]',
        '[data-testid="email-input"]'
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password',
        'input[placeholder*="password" i]',
        '[data-testid="password-input"]'
      ];

      // Try to find and fill email field
      let emailFilled = false;
      for (const selector of emailSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.fill(selector, this.email);
          emailFilled = true;
          break;
        }
      }

      if (!emailFilled) {
        console.error('Could not find email input field');
        return false;
      }

      // Try to find and fill password field
      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.fill(selector, this.password);
          passwordFilled = true;
          break;
        }
      }

      if (!passwordFilled) {
        console.error('Could not find password input field');
        return false;
      }

      // Submit form - try multiple approaches
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Login")',
        'button:has-text("Log in")',
        '[data-testid="login-button"]',
        'input[type="submit"]'
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          submitted = true;
          break;
        }
      }

      if (!submitted) {
        // Try pressing Enter as fallback
        await page.keyboard.press('Enter');
      }

      // Wait for navigation or success indicator
      await page.waitForURL((url) => !url.includes('/login'), {
        timeout: 10000,
        waitUntil: 'networkidle'
      }).catch(() => {
        // If URL doesn't change, check for error messages
        console.log('URL did not change after login attempt');
      });

      // Verify login was successful
      const loggedIn = await this.isAuthenticated(page);
      
      if (loggedIn) {
        console.log('Login successful');
        // Store auth state for reuse
        await this.saveAuthState(page.context());
      } else {
        console.error('Login failed - could not verify authentication');
      }

      return loggedIn;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async isAuthenticated(page: Page): Promise<boolean> {
    // Check multiple indicators of being logged in
    const authIndicators = [
      'button:has-text("Logout")',
      'button:has-text("Sign out")',
      'a:has-text("Logout")',
      'a:has-text("Sign out")',
      '[data-testid="user-menu"]',
      '[data-testid="user-avatar"]',
      '.user-menu',
      '#user-menu',
      'nav:has-text("Dashboard")',
      'a[href="/dashboard"]',
      'a[href="/activities"]'
    ];

    for (const selector of authIndicators) {
      if (await page.locator(selector).count() > 0) {
        return true;
      }
    }

    // Check if we're on a protected page (not login/register)
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('/register') && !currentUrl.includes('/signup')) {
      // Try to access a protected route
      const response = await page.goto(`${this.baseUrl}/activities`, {
        waitUntil: 'domcontentloaded'
      }).catch(() => null);

      if (response && response.ok() && !page.url().includes('/login')) {
        return true;
      }
    }

    return false;
  }

  async logout(page: Page): Promise<void> {
    try {
      // Try multiple logout selectors
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign out")',
        'a:has-text("Logout")',
        'a:has-text("Sign out")',
        '[data-testid="logout-button"]'
      ];

      for (const selector of logoutSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
          break;
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async saveAuthState(context: BrowserContext): Promise<void> {
    try {
      await context.storageState({ path: '.auth/state.json' });
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  async loadAuthState(context: BrowserContext): Promise<boolean> {
    try {
      await context.addCookies(require('../.auth/state.json').cookies);
      return true;
    } catch (error) {
      // Auth state doesn't exist or is invalid
      return false;
    }
  }

  // Helper to ensure user is logged in before test
  async ensureAuthenticated(page: Page): Promise<boolean> {
    if (await this.isAuthenticated(page)) {
      return true;
    }
    return await this.login(page);
  }

  // Get current user info if available
  async getCurrentUser(page: Page): Promise<{ email: string; id?: string } | null> {
    if (!await this.isAuthenticated(page)) {
      return null;
    }

    // Try to extract user info from page
    try {
      const userInfo = await page.evaluate(() => {
        // Check localStorage for user data
        const localUser = localStorage.getItem('user');
        if (localUser) {
          return JSON.parse(localUser);
        }

        // Check sessionStorage
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
          return JSON.parse(sessionUser);
        }

        // Try to find user email in DOM
        const emailElement = document.querySelector('[data-testid="user-email"]');
        if (emailElement?.textContent) {
          return { email: emailElement.textContent };
        }

        return null;
      });

      return userInfo || { email: this.email };
    } catch (error) {
      return { email: this.email };
    }
  }
}

export default new AuthHelper();