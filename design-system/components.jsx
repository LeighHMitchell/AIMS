/**
 * AIMS design-system pattern snippets (React / Tailwind — matches the app stack).
 *
 * These are MINIMAL drop-in references for the recurring compositions.
 * In app code, prefer the existing shared components where they exist:
 *   - CodeBadge            → src/components/ui/code-badge.tsx
 *   - CopyableIdBadge      → src/components/ui/copyable-id-badge.tsx
 *   - Badge                → src/components/ui/badge.tsx
 *   - Button               → src/components/ui/button.tsx
 *   - Table/TableContainer → src/components/ui/table.tsx
 *   - EmptyState           → src/components/ui/empty-state.tsx
 * The JSX below shows the exact class recipes those components produce, so a
 * new screen built from these snippets is pixel-identical to the app.
 */

/* ----------------------------------------------------------------------------
 * 1. CodeChip — the monospace gray chip for ALL codes
 *    (IATI ids, status codes, transaction/finance/aid type codes, sector codes)
 * -------------------------------------------------------------------------- */
export function CodeChip({ children }) {
  return (
    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * 2. StatusRow — RULE: a status label ALWAYS has its code chip on the left.
 *    Works for activity status, transaction type, finance type, aid type…
 *    <StatusRow code="2" label="Implementation" />
 * -------------------------------------------------------------------------- */
export function StatusRow({ code, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CodeChip>{code}</CodeChip>
      <span className="text-body text-foreground">{label}</span>
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * 3. ActivityTitleRow — RULE: ID chip inline at the start of the title line;
 *    the title wraps while the chip anchors line 1. RULE: the acronym renders
 *    in the SAME family/size/weight as the title, as " (ACRONYM)".
 *    This mirrors the live Activities-table markup exactly.
 * -------------------------------------------------------------------------- */
export function ActivityTitleRow({ id, title, acronym, onCopyId }) {
  return (
    <h3 className="font-medium text-foreground leading-tight min-w-0 [text-wrap:wrap]">
      {id && (
        <button
          type="button"
          title="Click to copy Activity ID"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCopyId?.(id); }}
          className="mr-1.5 align-middle text-xs font-mono font-normal bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
        >
          <span>{id}</span>
        </button>
      )}
      {title}
      {acronym && <span className="font-medium text-foreground"> ({acronym})</span>}
    </h3>
  );
}

/* ----------------------------------------------------------------------------
 * 4. Table shell — square corners, surface-muted header, no zebra,
 *    hover bg-muted/50, numeric cells right-aligned with tabular figures.
 * -------------------------------------------------------------------------- */
export function TableShellExample({ rows }) {
  return (
    <div className="border overflow-hidden w-full">{/* TableContainer — NEVER rounded */}
      <table className="w-full caption-bottom text-body border border-border">
        <thead className="bg-surface-muted border-b border-border">
          <tr>
            <th className="h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground">
              Activity Title
            </th>
            <th className="h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground">
              Activity Status
            </th>
            <th className="h-12 px-4 py-3 text-right align-top text-body font-medium text-muted-foreground">
              Total Budgeted
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {rows.map((r) => (
            <tr key={r.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="px-4 py-2 align-top">
                <ActivityTitleRow id={r.partnerId} title={r.title} acronym={r.acronym} />
              </td>
              <td className="px-4 py-2 align-top">
                <StatusRow code={r.statusCode} label={r.statusLabel} />
              </td>
              {/* Numeric cell: right-aligned, tabular-nums, muted currency prefix */}
              <td className="px-4 py-2 align-top text-right tabular-nums">
                <span className="text-helper text-muted-foreground font-normal">USD</span>{' '}
                <span className="font-medium">{r.totalBudgeted}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 5. Buttons — the six variants. Use <Button> from ui/button.tsx in real code;
 *    these are the exact class recipes it generates.
 * -------------------------------------------------------------------------- */
const BTN_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-body font-medium ' +
  'ring-offset-background transition-all duration-150 active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2';

export const buttonRecipes = {
  // The ONE primary action per view. bg-primary = gunmetal #1d1f21 (not gray-900).
  default:     `${BTN_BASE} bg-primary text-primary-foreground hover:bg-primary/90`,
  secondary:   `${BTN_BASE} bg-secondary text-secondary-foreground hover:bg-secondary/80`,
  outline:     `${BTN_BASE} border border-input bg-background hover:bg-muted`,
  ghost:       `${BTN_BASE} hover:bg-muted`,
  destructive: `${BTN_BASE} bg-destructive text-destructive-foreground hover:bg-destructive/90`,
  link:        `${BTN_BASE} text-primary underline-offset-4 hover:underline`,
  // sizes: default h-10 px-4 py-2 · sm h-9 px-3 · lg h-11 px-8 · icon h-10 w-10
};

/* ----------------------------------------------------------------------------
 * 6. Section label ("eyebrow") — 12px uppercase tracked muted heading used
 *    above field groups and detail sections.
 * -------------------------------------------------------------------------- */
export function SectionLabel({ children }) {
  return (
    <h3 className="text-section-label uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h3>
  );
}

/* ----------------------------------------------------------------------------
 * 7. Code + value detail cell — profile-page pattern for IATI classification
 *    fields (code chip left, medium-weight human label right).
 * -------------------------------------------------------------------------- */
export function CodeValueCell({ label, code, value }) {
  return (
    <div>
      <div className="text-helper text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1.5">
        <CodeChip>{code}</CodeChip>
        <span className="font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 8. Page header + filter bar — the standard list-page frame.
 * -------------------------------------------------------------------------- */
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-page-title font-bold">{title}</h1>
          {subtitle && <p className="text-body text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {/* Filter bar: labelled triggers left, view toggles pushed right */}
      {children && <div className="flex items-end gap-4 flex-wrap mb-4">{children}</div>}
    </>
  );
}

export function FilterField({ label, children }) {
  return (
    <div>
      <div className="text-body font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * 8b. Page navigation tabs — the canonical page-level tab bar (Workspace,
 *     profiles, admin). White bordered track; ACTIVE = muted gray pill.
 *     This is the INVERSE of the ui/tabs.tsx default (muted track / white
 *     pill), which is reserved for small nested sub-tab toggles.
 * -------------------------------------------------------------------------- */
export function PageTabs({ tabs, value, onValueChange }) {
  // tabs: [{ value, label, icon: LucideIcon, badge?: number }]
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {(t.badge ?? 0) > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1 text-helper justify-center text-white">
                  {(t.badge ?? 0) > 99 ? '99+' : t.badge}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

/* ----------------------------------------------------------------------------
 * 9. Validation status badge — the 3-state display model.
 *    Always derive the state via toValidationStatus() from lib/validation-status
 *    (raw submission_status values collapse to Pending Validation).
 * -------------------------------------------------------------------------- */
const VALIDATION_BADGE_VARIANT = {
  pending_validation: 'warning', // amber
  validated: 'success',          // green
  rejected: 'destructive-soft',  // error bg/text pair
};
// usage: <Badge variant={VALIDATION_BADGE_VARIANT[toValidationStatus(raw).key]}>
//          {toValidationStatus(raw).label}
//        </Badge>

/* ----------------------------------------------------------------------------
 * 10. Chart colors — NEVER hardcode. One import, deterministic per IATI code:
 *
 *   import { getTransactionTypeColor, getFinancialSeriesColor,
 *            BUDGET_COLOR, PLANNED_DISBURSEMENT_COLOR, OTHERS_COLOR }
 *     from '@/lib/chart-colors'
 *
 *   <Bar dataKey="disbursements" fill={getTransactionTypeColor('3')} />
 *   <Line dataKey="budget" stroke={getFinancialSeriesColor('Budget')} />
 * -------------------------------------------------------------------------- */

/* ----------------------------------------------------------------------------
 * 11. Currency in tables vs charts — two context-scoped styles:
 *     tables  → <CurrencyValue amount={v} currency="USD" variant="short" />
 *               (muted ISO prefix: "USD 36.0M", right-aligned tabular)
 *     charts/cards → formatCurrency(v, 'USD')  →  "$36.0m" (symbol-first)
 * -------------------------------------------------------------------------- */

/* ----------------------------------------------------------------------------
 * 12. Dialog header — always shaded surface-muted, text-only title.
 *    (DialogHeader in ui/dialog.tsx already does this — never override it.)
 * -------------------------------------------------------------------------- */
export function DialogHeaderRecipe({ title, description }) {
  return (
    <div className="flex flex-col space-y-1.5 text-center sm:text-left bg-surface-muted px-6 py-4 border-b -mx-6 -mt-6 sm:rounded-t-lg">
      <h2 className="text-lg font-semibold leading-none tracking-tight text-balance">{title}</h2>
      {description && <p className="text-body text-muted-foreground">{description}</p>}
    </div>
  );
}
