import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// IATI Finance Types (simplified list)
const FINANCE_TYPES = {
  "110": "Aid grant excluding debt reorganisation",
  "111": "Aid grant excluding debt reorganisation, excluding import support",
  "210": "Standard grant",
  "211": "Subsidies to national private investors",
  "212": "Subsidies to national private investors, including loans to national private investors",
  "220": "Capital subscription on deposit basis",
  "230": "Capital subscription on encashment basis",
  "310": "Loan excluding debt reorganisation",
  "311": "Loan excluding debt reorganisation, excluding import support",
  "320": "Loan in a joint venture with the recipient",
  "410": "Aid loan excluding debt reorganisation",
  "411": "Aid loan excluding debt reorganisation, excluding import support",
  "421": "Standard loan",
  "422": "Reimbursable grant",
  "423": "Bonds",
  "424": "Asset-backed securities",
  "425": "Other debt securities",
  "510": "Common equity",
  "520": "Non-bank guaranteed export credits",
  "530": "Foreign direct investment, new capital",
  "531": "Foreign direct investment, addition to reserves",
  "610": "Debt forgiveness: OOF claims (P)",
  "620": "Debt forgiveness: OOF claims (I)",
  "630": "Debt forgiveness: Private claims (P)",
  "631": "Debt forgiveness: Private claims (I)"
} as const;

export async function GET() {
  try {
    // Convert FINANCE_TYPES object to array format expected by frontend
    const financeTypes = Object.entries(FINANCE_TYPES).map(([code, name]) => ({
      code,
      name
    }));

    return NextResponse.json(financeTypes);

  } catch (error) {
    console.error('Error in finance-types API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}