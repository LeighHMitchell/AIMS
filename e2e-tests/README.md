# Activity Editor E2E Diagnostic Test Suite

## Overview
This test suite performs comprehensive end-to-end diagnostics on the Activity Editor to verify field persistence, UI indicators, and data synchronization between the frontend and Supabase backend.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the project root with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   APP_BASE_URL=https://aims-pi.vercel.app
   TEST_EMAIL=test@example.com
   TEST_PASSWORD=your_password
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Running Tests

### Run all tests:
```bash
npm run test:e2e
```

### Debug mode (opens browser):
```bash
npm run test:e2e:debug
```

### UI mode (interactive):
```bash
npm run test:e2e:ui
```

### View test report:
```bash
npm run test:e2e:report
```

## Test Coverage

The suite tests each field for:
- Initial save functionality
- UI indicators (saving spinner and success tick)
- Database persistence
- Navigation persistence (forward/back)
- Page refresh persistence
- Empty field behavior
- Rapid edit race conditions

## Output

### Reports Generated:
- **CSV Report**: `test-artifacts/<timestamp>/activity_editor_save_diagnostics.csv`
- **JSON Report**: `test-artifacts/<timestamp>/activity_editor_save_diagnostics.json`
- **HTML Report**: View with `npm run test:e2e:report`

### Report Fields:
- `field_key`: Field identifier
- `ui_saved_initial`: UI shows saved value
- `db_saved_initial`: Database has saved value
- `ui_saved_after_nav_back`: Value persists after navigation
- `db_saved_after_nav_back`: DB value persists after navigation
- `ui_saved_after_refresh`: Value persists after page refresh
- `db_saved_after_refresh`: DB value persists after refresh
- `spinner_seen`: Saving spinner was displayed
- `tick_seen`: Success tick was displayed
- `tick_while_empty`: Tick shown for empty field (bug indicator)
- `rapid_edit_success`: Rapid edits saved correctly
- `notes`: Additional diagnostic information
- `screencap_path`: Path to failure screenshot
- `video_path`: Path to failure video

## Field Matrix

The test suite covers these fields by default:
- Basic Info: title, description, dates, status
- Classification: sector, scope, collaboration type, flow types
- Location: country
- Financial: budget amount, currency
- Organizations: implementer organization

To add more fields, edit `config/fields.ts`.

## Troubleshooting

### Authentication Issues
- Verify TEST_EMAIL and TEST_PASSWORD are correct
- Check if login page selectors match your app

### Field Not Found
- Update selectors in `config/fields.ts`
- Add fallback selectors in `helpers/test-utils.ts`

### Timeout Issues
- Increase timeouts in `playwright.config.ts`
- Adjust TEST_CONFIG timeouts in `config/fields.ts`

## Architecture

```
e2e-tests/
├── config/
│   └── fields.ts         # Field definitions and test configuration
├── helpers/
│   ├── auth.ts          # Authentication helper
│   ├── supabase.ts      # Supabase database operations
│   ├── report.ts        # Report generation
│   └── test-utils.ts    # UI interaction utilities
├── activity-editor.spec.ts  # Main test suite
└── README.md
```