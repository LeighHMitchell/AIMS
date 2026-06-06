import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import fs from 'fs';

const env = {};
for (const f of ['.env.local','.env.production.local']) if (fs.existsSync(f)) for (const line of fs.readFileSync(f,'utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// Org ids (verified present)
const ADB = '689a2f8f-6228-4fc3-8fcb-29a4157d3bff';
const CEB = '63977161-ea4e-4566-a494-360a25afe9fa';
const UNDP = '550e8400-e29b-41d4-a716-446655440002';
const TAF  = 'e7d5b9c8-0c2b-4034-8733-8929519a06af';
const UNICEF = '579962d6-4950-4ae7-90b8-849950214220';
const MOC  = '241a31d7-8215-40ec-9e31-8f7b51b0c041';

// Fixed IATI identifiers for every seeded activity -> makes re-runs idempotent.
const SEED_IATI = [
  'XM-DAC-46004-MM-HWY-2023','XM-DAC-46004-MM-AGR-2023','XM-DAC-46006-MM-WAT-2024',
  'XM-DAC-41114-MM-MHF','XM-DAC-MM-JPF',
  'XM-DAC-41114-MM-MHF-C01','XM-DAC-41114-MM-MHF-C02','XM-DAC-MM-JPF-C01','XM-DAC-MM-JPF-C02',
];

// --- CLEANUP: remove any previously-seeded rows (idempotent re-run) --------
{
  const { data: prior } = await sb.from('activities').select('id').in('iati_identifier', SEED_IATI);
  const priorIds = (prior || []).map(a => a.id);
  if (priorIds.length) {
    await sb.from('activity_relationships').delete().or(`activity_id.in.(${priorIds.join(',')}),related_activity_id.in.(${priorIds.join(',')})`);
    await sb.from('transactions').delete().in('activity_id', priorIds);
    await sb.from('activity_sectors').delete().in('activity_id', priorIds);
    await sb.from('activity_budgets').delete().in('activity_id', priorIds);
    await sb.from('activities').delete().in('id', priorIds);
    console.log(`🧹 Cleaned up ${priorIds.length} previously-seeded activities (+ their child rows)`);
  }
}

const inserted = { activities: [], transactions: [], activity_sectors: [], activity_budgets: [], activity_relationships: [] };
function fail(step, error) { if (error) { console.error(`\n❌ FAILED at ${step}:`, error.message || error); console.error('Inserted so far (for cleanup):'); console.error(JSON.stringify(inserted, null, 0)); fs.writeFileSync('./seed-rollback-2026-05-29.json', JSON.stringify(inserted, null, 2)); process.exit(1); } }

// --- helpers --------------------------------------------------------------
function activity(o) {
  const id = randomUUID();
  inserted.activities.push(id);
  return {
    id,
    title_narrative: o.title,
    description_narrative: o.desc,
    iati_identifier: o.iati,
    activity_status: '2',                 // Implementation
    publication_status: 'published',
    submission_status: 'draft',
    hierarchy: 1,
    default_flow_type: '10',              // ODA
    default_aid_type: o.aid || 'C01',
    default_finance_type: o.finance,
    default_tied_status: '5',
    default_currency: 'USD',
    reporting_org_id: o.org,
    is_pooled_fund: !!o.pooled,
    planned_start_date: o.start,
    planned_end_date: o.end,
    actual_start_date: o.start,
  };
}
function txn(activityId, o) {
  const uuid = randomUUID();
  inserted.transactions.push(uuid);
  return {
    uuid,
    activity_id: activityId,
    transaction_type: o.type,
    transaction_date: o.date,
    value_date: o.date,
    value: o.value,
    value_usd: o.value,                   // USD currency -> usd == value
    currency: 'USD',
    usd_convertible: true,
    status: 'actual',
    flow_type: '10',
    finance_type: o.finance,
    aid_type: o.aid || 'C01',
    tied_status: '5',
    provider_org_name: o.provider || null,
    provider_org_id: o.providerId || null,
    receiver_org_name: o.receiver || null,
    receiver_org_id: o.receiverId || null,
    description: o.desc || null,
  };
}
function sector(activityId, code, name, cat, catName) {
  const id = randomUUID();
  inserted.activity_sectors.push(id);
  return { id, activity_id: activityId, sector_code: code, sector_name: name, percentage: 100,
           level: 'sector', category_code: cat, category_name: catName, type: 'primary', sector_vocabulary: '1' };
}
function budget(activityId, value, start, end) {
  const id = randomUUID();
  inserted.activity_budgets.push(id);
  return { id, activity_id: activityId, type: '1', status: '2', period_start: start, period_end: end,
           value, currency: 'USD', value_date: start, usd_value: value, usd_convertible: true };
}
function rel(fundId, childId, narrative) {
  const id = randomUUID();
  inserted.activity_relationships.push(id);
  return { id, activity_id: fundId, related_activity_id: childId, relationship_type: '1', narrative, is_resolved: true };
}

// --- 1. LOAN ACTIVITIES (finance_type 410) --------------------------------
const L1 = activity({ title: 'Greater Mekong Subregion Highway Modernization Project', desc: 'ADB sovereign loan financing the upgrade of priority national highway corridors, including climate-resilient road design and road-safety improvements.', iati: 'XM-DAC-46004-MM-HWY-2023', finance: '410', org: ADB, start: '2023-01-01', end: '2027-12-31' });
const L2 = activity({ title: 'Irrigated Agriculture Inclusive Development Project', desc: 'ADB loan to rehabilitate irrigation systems and strengthen water-user associations to raise smallholder agricultural productivity.', iati: 'XM-DAC-46004-MM-AGR-2023', finance: '410', org: ADB, start: '2023-07-01', end: '2028-06-30' });
const L3 = activity({ title: 'Yangon Urban Water Supply Improvement Project', desc: 'Concessional loan financing expansion and rehabilitation of urban water-supply infrastructure and non-revenue-water reduction.', iati: 'XM-DAC-46006-MM-WAT-2024', finance: '410', org: CEB, start: '2024-01-01', end: '2029-12-31' });

// --- 2. POOLED FUNDS ------------------------------------------------------
const F1 = activity({ title: 'Myanmar Humanitarian Fund', desc: 'Country-based pooled fund channelling donor contributions to frontline humanitarian partners for life-saving response.', iati: 'XM-DAC-41114-MM-MHF', finance: '110', aid: 'B03', org: UNDP, pooled: true, start: '2022-01-01', end: '2026-12-31' });
const F2 = activity({ title: 'Joint Peace Fund Myanmar', desc: 'Multi-donor pooled fund supporting an inclusive, sustainable peace process and civil-society participation.', iati: 'XM-DAC-MM-JPF', finance: '110', aid: 'B03', org: TAF, pooled: true, start: '2022-01-01', end: '2026-12-31' });

// --- 3. CHILD ACTIVITIES (of the pooled funds) ----------------------------
const C1 = activity({ title: 'Emergency Shelter and NFI Response – Rakhine', desc: 'Provision of emergency shelter and non-food items to conflict-affected households in Rakhine State.', iati: 'XM-DAC-41114-MM-MHF-C01', finance: '110', aid: 'B03', org: UNICEF, start: '2023-01-01', end: '2025-12-31' });
const C2 = activity({ title: 'WASH in Emergencies – Kachin', desc: 'Water, sanitation and hygiene services for displaced populations in Kachin State.', iati: 'XM-DAC-41114-MM-MHF-C02', finance: '110', aid: 'B03', org: UNICEF, start: '2023-01-01', end: '2025-12-31' });
const C3 = activity({ title: 'Community Peace and Reconciliation – Shan', desc: 'Local peace-building and inter-community dialogue initiatives in Shan State.', iati: 'XM-DAC-MM-JPF-C01', finance: '110', aid: 'B03', org: TAF, start: '2023-01-01', end: '2025-12-31' });
const C4 = activity({ title: 'Civil Society Strengthening for Peace', desc: 'Capacity building and grants for civil-society organisations engaged in the peace process.', iati: 'XM-DAC-MM-JPF-C02', finance: '110', aid: 'B03', org: TAF, start: '2023-01-01', end: '2025-12-31' });

const acts = [L1,L2,L3,F1,F2,C1,C2,C3,C4];
{ const { error } = await sb.from('activities').insert(acts); fail('insert activities', error); }
console.log(`✅ ${acts.length} activities inserted`);

// --- sectors --------------------------------------------------------------
const sectors = [
  sector(L1.id, '21020', 'Road transport', '210', 'Transport & storage'),
  sector(L2.id, '31140', 'Agricultural water resources', '311', 'Agriculture'),
  sector(L3.id, '14020', 'Water supply and sanitation - large systems', '140', 'Water supply & sanitation'),
  sector(C1.id, '72010', 'Material relief assistance and services', '720', 'Emergency response'),
  sector(C2.id, '14030', 'Basic drinking water supply and basic sanitation', '140', 'Water supply & sanitation'),
  sector(C3.id, '15220', 'Civilian peace-building, conflict prevention and resolution', '152', 'Conflict, peace & security'),
  sector(C4.id, '15150', 'Democratic participation and civil society', '151', 'Government & civil society-general'),
];
{ const { error } = await sb.from('activity_sectors').insert(sectors); fail('insert sectors', error); }
console.log(`✅ ${sectors.length} sectors inserted`);

// --- budgets (loans) ------------------------------------------------------
const budgets = [
  budget(L1.id, 18000000, '2023-01-01', '2023-12-31'),
  budget(L2.id, 15000000, '2023-07-01', '2024-06-30'),
  budget(L3.id, 12000000, '2024-01-01', '2024-12-31'),
];
{ const { error } = await sb.from('activity_budgets').insert(budgets); fail('insert budgets', error); }
console.log(`✅ ${budgets.length} budgets inserted`);

// --- transactions ---------------------------------------------------------
const txns = [
  // Loans: commitment (2) + disbursements (3), finance 410
  txn(L1.id, { type:'2', date:'2023-02-15', value:18000000, finance:'410', provider:'Asian Development Bank', providerId:ADB, receiver:'Ministry of Construction', receiverId:MOC, desc:'Loan commitment' }),
  txn(L1.id, { type:'3', date:'2023-09-30', value:6000000,  finance:'410', provider:'Asian Development Bank', providerId:ADB, receiver:'Ministry of Construction', receiverId:MOC }),
  txn(L1.id, { type:'3', date:'2024-09-30', value:4000000,  finance:'410', provider:'Asian Development Bank', providerId:ADB, receiver:'Ministry of Construction', receiverId:MOC }),
  txn(L2.id, { type:'2', date:'2023-08-15', value:15000000, finance:'410', provider:'Asian Development Bank', providerId:ADB, receiver:'Ministry of Agriculture, Livestock and Irrigation' }),
  txn(L2.id, { type:'3', date:'2024-03-31', value:5000000,  finance:'410', provider:'Asian Development Bank', providerId:ADB }),
  txn(L2.id, { type:'3', date:'2025-03-31', value:3000000,  finance:'410', provider:'Asian Development Bank', providerId:ADB }),
  txn(L3.id, { type:'2', date:'2024-02-20', value:12000000, finance:'410', provider:'Council of Europe Development Bank', providerId:CEB, receiver:'Yangon City Development Committee' }),
  txn(L3.id, { type:'3', date:'2024-11-30', value:4000000,  finance:'410', provider:'Council of Europe Development Bank', providerId:CEB }),

  // Fund 1 (Myanmar Humanitarian Fund): incoming contributions (1/11/13) + outgoing disbursements (3)
  txn(F1.id, { type:'1',  date:'2023-03-01', value:10000000, finance:'110', aid:'B03', provider:'Australia - Department of Foreign Affairs and Trade', receiver:'Myanmar Humanitarian Fund' }),
  txn(F1.id, { type:'11', date:'2023-04-01', value:8000000,  finance:'110', aid:'B03', provider:'European Union', receiver:'Myanmar Humanitarian Fund' }),
  txn(F1.id, { type:'13', date:'2023-05-01', value:5000000,  finance:'110', aid:'B03', provider:'United Kingdom - Foreign, Commonwealth & Development Office', receiver:'Myanmar Humanitarian Fund' }),
  txn(F1.id, { type:'3',  date:'2023-08-01', value:9000000,  finance:'110', aid:'B03', provider:'Myanmar Humanitarian Fund', receiver:'UNICEF Myanmar', receiverId:UNICEF }),
  txn(F1.id, { type:'3',  date:'2024-02-01', value:4000000,  finance:'110', aid:'B03', provider:'Myanmar Humanitarian Fund', receiver:'UNHCR Myanmar' }),

  // Fund 2 (Joint Peace Fund): incoming + outgoing
  txn(F2.id, { type:'1',  date:'2023-02-01', value:6000000, finance:'110', aid:'B03', provider:'Norway - Norwegian Agency for Development Cooperation', receiver:'Joint Peace Fund Myanmar' }),
  txn(F2.id, { type:'11', date:'2023-03-15', value:4000000, finance:'110', aid:'B03', provider:'Switzerland - Swiss Agency for Development and Cooperation', receiver:'Joint Peace Fund Myanmar' }),
  txn(F2.id, { type:'3',  date:'2023-07-01', value:3000000, finance:'110', aid:'B03', provider:'Joint Peace Fund Myanmar', receiver:'The Asia Foundation', receiverId:TAF }),
  txn(F2.id, { type:'3',  date:'2024-01-15', value:2000000, finance:'110', aid:'B03', provider:'Joint Peace Fund Myanmar', receiver:'Local CSO Consortium' }),

  // Children disbursements (type 3) -> feed fund-sector-allocation
  txn(C1.id, { type:'3', date:'2023-10-01', value:5000000, finance:'110', aid:'B03', provider:'UNICEF Myanmar', providerId:UNICEF, receiver:'Implementing Partners – Rakhine' }),
  txn(C2.id, { type:'3', date:'2023-11-01', value:4000000, finance:'110', aid:'B03', provider:'UNICEF Myanmar', providerId:UNICEF, receiver:'Implementing Partners – Kachin' }),
  txn(C3.id, { type:'3', date:'2023-09-01', value:3000000, finance:'110', aid:'B03', provider:'The Asia Foundation', providerId:TAF, receiver:'Community Organisations – Shan' }),
  txn(C4.id, { type:'3', date:'2023-12-01', value:2000000, finance:'110', aid:'B03', provider:'The Asia Foundation', providerId:TAF, receiver:'Civil Society Grantees' }),
];
{ const { error } = await sb.from('transactions').insert(txns); fail('insert transactions', error); }
console.log(`✅ ${txns.length} transactions inserted`);

// --- relationships (fund -> child) ---------------------------------------
const rels = [
  rel(F1.id, C1.id, 'Child activity funded by the Myanmar Humanitarian Fund'),
  rel(F1.id, C2.id, 'Child activity funded by the Myanmar Humanitarian Fund'),
  rel(F2.id, C3.id, 'Child activity funded by the Joint Peace Fund'),
  rel(F2.id, C4.id, 'Child activity funded by the Joint Peace Fund'),
];
{ const { error } = await sb.from('activity_relationships').insert(rels); fail('insert relationships', error); }
console.log(`✅ ${rels.length} relationships inserted`);

fs.writeFileSync('./seed-rollback-2026-05-29.json', JSON.stringify(inserted, null, 2));
console.log('\n📝 Rollback manifest written to seed-rollback-2026-05-29.json');

// --- VERIFY: do the reports now have data? --------------------------------
console.log('\n================= VERIFICATION =================');
const { count: pooledCount } = await sb.from('activities').select('*',{count:'exact',head:true}).eq('is_pooled_fund',true);
console.log('Pooled funds now:', pooledCount);
const { data: loanTx } = await sb.from('transactions').select('value_usd').eq('finance_type','410');
console.log('Loan (410) transactions:', loanTx.length, '| total USD:', loanTx.reduce((s,t)=>s+Number(t.value_usd||0),0).toLocaleString());
const { data: ftAll } = await sb.from('transactions').select('finance_type').limit(2000);
console.log('Distinct finance_type now:', [...new Set(ftAll.map(x=>x.finance_type))].sort());