-- Atomic replace-set save of an activity's transactions.
-- SECURITY INVOKER: runs as the calling (session) role so RLS still applies.
-- Locks the activity row to serialize concurrent saves of the same activity.
create or replace function public.save_activity_transactions(
  p_activity_id uuid,
  p_transactions jsonb  -- array of fully-mapped transaction rows (uuid REQUIRED on every row)
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_deleted int := 0;
  v_upserted int := 0;
begin
  perform 1 from public.activities where id = p_activity_id for update;
  if not found then
    raise exception 'activity % not found or not accessible', p_activity_id;
  end if;

  delete from public.transactions t
  where t.activity_id = p_activity_id
    and not exists (
      select 1 from jsonb_array_elements(p_transactions) e
      where (e->>'uuid')::uuid = t.uuid
    );
  get diagnostics v_deleted = row_count;

  insert into public.transactions as t (
    uuid, activity_id, organization_id, transaction_type,
    provider_org_name, receiver_org_name, provider_org_id, receiver_org_id,
    provider_org_type, receiver_org_type, provider_org_ref, receiver_org_ref,
    value, currency, status, transaction_date, value_date,
    transaction_reference, description, aid_type, tied_status, flow_type,
    finance_type, disbursement_channel, is_humanitarian,
    financing_classification, created_by,
    value_usd, exchange_rate_used, usd_conversion_date, usd_convertible
  )
  select
    (e->>'uuid')::uuid, (e->>'activity_id')::uuid, (e->>'organization_id')::uuid, e->>'transaction_type',
    e->>'provider_org_name', e->>'receiver_org_name', (e->>'provider_org_id')::uuid, (e->>'receiver_org_id')::uuid,
    e->>'provider_org_type', e->>'receiver_org_type', e->>'provider_org_ref', e->>'receiver_org_ref',
    (e->>'value')::numeric, e->>'currency', e->>'status', (e->>'transaction_date')::date, (e->>'value_date')::date,
    e->>'transaction_reference', e->>'description', e->>'aid_type', e->>'tied_status', e->>'flow_type',
    e->>'finance_type', e->>'disbursement_channel', (e->>'is_humanitarian')::boolean,
    e->>'financing_classification', (e->>'created_by')::uuid,
    (e->>'value_usd')::numeric, (e->>'exchange_rate_used')::numeric,
    (e->>'usd_conversion_date')::timestamptz, (e->>'usd_convertible')::boolean
  from jsonb_array_elements(p_transactions) e
  on conflict (uuid) do update set
    organization_id = excluded.organization_id,
    transaction_type = excluded.transaction_type,
    provider_org_name = excluded.provider_org_name,
    receiver_org_name = excluded.receiver_org_name,
    provider_org_id = excluded.provider_org_id,
    receiver_org_id = excluded.receiver_org_id,
    provider_org_type = excluded.provider_org_type,
    receiver_org_type = excluded.receiver_org_type,
    provider_org_ref = excluded.provider_org_ref,
    receiver_org_ref = excluded.receiver_org_ref,
    value = excluded.value,
    currency = excluded.currency,
    status = excluded.status,
    transaction_date = excluded.transaction_date,
    value_date = excluded.value_date,
    transaction_reference = excluded.transaction_reference,
    description = excluded.description,
    aid_type = excluded.aid_type,
    tied_status = excluded.tied_status,
    flow_type = excluded.flow_type,
    finance_type = excluded.finance_type,
    disbursement_channel = excluded.disbursement_channel,
    is_humanitarian = excluded.is_humanitarian,
    financing_classification = excluded.financing_classification,
    value_usd = excluded.value_usd,
    exchange_rate_used = excluded.exchange_rate_used,
    usd_conversion_date = excluded.usd_conversion_date,
    usd_convertible = excluded.usd_convertible;
  get diagnostics v_upserted = row_count;

  return jsonb_build_object('deleted', v_deleted, 'upserted', v_upserted);
end;
$$;

grant execute on function public.save_activity_transactions(uuid, jsonb) to authenticated;
