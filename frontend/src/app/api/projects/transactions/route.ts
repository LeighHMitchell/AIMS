import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ProjectTransaction, CONTRIBUTION_STATUS } from '@/types/project';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'project-transactions.json');

// Ensure data file exists
async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(TRANSACTIONS_FILE);
    } catch {
      await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error ensuring transactions file:', error);
  }
}

// Load transactions
async function loadTransactions(): Promise<ProjectTransaction[]> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
}

// Save transactions
async function saveTransactions(transactions: ProjectTransaction[]) {
  await ensureDataFile();
  await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
}

// GET /api/projects/transactions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const contributorOrgId = searchParams.get('contributorOrgId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const transactions = await loadTransactions();

    let filtered = transactions;

    // Filter by project
    if (projectId) {
      filtered = filtered.filter(t => t.projectId === projectId);
    }

    // Filter by contributor organization
    if (contributorOrgId) {
      filtered = filtered.filter(t => t.contributorOrgId === contributorOrgId);
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    // Filter by type
    if (type) {
      filtered = filtered.filter(t => t.type === type);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error in GET /api/projects/transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'projectId', 'contributorOrgId', 'contributorOrgName',
      'type', 'value', 'currency', 'transactionDate',
      'financingInstrument', 'flowType', 'providerOrg', 'receiverOrg',
      'createdBy', 'createdByName'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const transactions = await loadTransactions();

    // Create new transaction
    const newTransaction: ProjectTransaction = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      projectId: body.projectId,
      contributorOrgId: body.contributorOrgId,
      contributorOrgName: body.contributorOrgName,
      type: body.type,
      value: Number(body.value),
      currency: body.currency,
      transactionDate: body.transactionDate,
      financingInstrument: body.financingInstrument,
      flowType: body.flowType,
      tiedStatus: body.tiedStatus,
      aidType: body.aidType,
      providerOrg: body.providerOrg,
      receiverOrg: body.receiverOrg,
      narrative: body.narrative,
      status: CONTRIBUTION_STATUS.DRAFT,
      createdBy: body.createdBy,
      createdByName: body.createdByName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    transactions.push(newTransaction);
    await saveTransactions(transactions);

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/transactions:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/transactions - Update a transaction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const transactions = await loadTransactions();
    const index = transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update transaction
    transactions[index] = {
      ...transactions[index],
      ...updates,
      lastEditedBy: updates.lastEditedBy || transactions[index].lastEditedBy,
      lastEditedByName: updates.lastEditedByName || transactions[index].lastEditedByName,
      updatedAt: new Date().toISOString()
    };

    await saveTransactions(transactions);

    return NextResponse.json(transactions[index]);
  } catch (error) {
    console.error('Error in PATCH /api/projects/transactions:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/transactions
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const transactions = await loadTransactions();
    const filtered = transactions.filter(t => t.id !== id);

    if (filtered.length === transactions.length) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    await saveTransactions(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects/transactions:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/transactions/submit - Submit transactions for approval
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, contributorOrgId } = body;

    if (!projectId || !contributorOrgId) {
      return NextResponse.json(
        { error: 'Project ID and contributor org ID are required' },
        { status: 400 }
      );
    }

    const transactions = await loadTransactions();
    
    // Update all draft transactions for this project and contributor
    let updated = 0;
    transactions.forEach((transaction, index) => {
      if (
        transaction.projectId === projectId &&
        transaction.contributorOrgId === contributorOrgId &&
        transaction.status === CONTRIBUTION_STATUS.DRAFT
      ) {
        transactions[index] = {
          ...transaction,
          status: CONTRIBUTION_STATUS.SUBMITTED,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updated++;
      }
    });

    if (updated === 0) {
      return NextResponse.json(
        { error: 'No draft transactions found to submit' },
        { status: 404 }
      );
    }

    await saveTransactions(transactions);

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Error in PUT /api/projects/transactions/submit:', error);
    return NextResponse.json(
      { error: 'Failed to submit transactions' },
      { status: 500 }
    );
  }
} 