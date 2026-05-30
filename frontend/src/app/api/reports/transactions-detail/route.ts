import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { codeAndName } from '@/lib/iati/codelist-resolver';
import { titleWithAcronym } from '@/lib/reports/format-helpers';

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

// Resolve an IATI codelist value safely — never throws if the codelist or
// value is unknown; falls back to the raw code.
function safeCode(codelist: string, code: unknown): { code: string; name: string } {
  if (code == null || code === '') return { code: '', name: '' }
  try {
    return codeAndName(codelist as any, String(code))
  } catch {
    return { code: String(code), name: '' }
  }
}

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch every transaction, paginating past Supabase's default 1000-row cap.
    // select('*') keeps the route resilient to optional columns (aid_type, etc.).
    const transactions: Record<string, any>[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        console.error('[Reports API] Error fetching transactions:', error)
        return NextResponse.json(
          { error: 'Failed to fetch transactions', details: error.message },
          { status: 500 }
        )
      }
      if (!data || data.length === 0) break
      transactions.push(...data)
      if (data.length < PAGE_SIZE) break
    }

    if (transactions.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    // Resolve activity IATI id + title for context
    const activityIds = Array.from(new Set(transactions.map(t => t.activity_id).filter(Boolean))) as string[]
    const activityById = new Map<string, { iati: string; title: string }>()
    for (let i = 0; i < activityIds.length; i += PAGE_SIZE) {
      const slice = activityIds.slice(i, i + PAGE_SIZE)
      const { data: acts } = await supabase
        .from('activities')
        .select('id, iati_identifier, title_narrative, acronym')
        .in('id', slice)
      acts?.forEach(a => activityById.set(a.id, { iati: a.iati_identifier || '', title: titleWithAcronym(a.title_narrative, a.acronym) }))
    }

    const reportData = transactions.map(t => {
      const act = t.activity_id ? activityById.get(t.activity_id) : undefined
      const type = safeCode('transaction_type', t.transaction_type)
      const aid = safeCode('aid_type', t.aid_type ?? t.default_aid_type)
      const finance = safeCode('finance_type', t.finance_type ?? t.default_finance_type)
      const flow = safeCode('flow_type', t.flow_type ?? t.default_flow_type)
      const tied = safeCode('tied_status', t.tied_status ?? t.default_tied_status)
      return {
        activity_iati_id: act?.iati || '',
        activity_title: act?.title || '',
        transaction_type_code: type.code,
        transaction_type_name: type.name,
        transaction_date: t.transaction_date || t.value_date || '',
        provider_org: t.provider_org_name || '',
        receiver_org: t.receiver_org_name || '',
        value: t.value != null ? t.value : '',
        currency: t.currency || '',
        value_usd: t.value_usd != null ? Math.round(t.value_usd) : '',
        aid_type_code: aid.code,
        aid_type_name: aid.name,
        finance_type_code: finance.code,
        finance_type_name: finance.name,
        flow_type_code: flow.code,
        flow_type_name: flow.name,
        tied_status_code: tied.code,
        tied_status_name: tied.name,
        description: t.description || '',
        reference: t.transaction_reference || '',
      }
    })

    const response = NextResponse.json({ data: reportData, error: null })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response

  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
