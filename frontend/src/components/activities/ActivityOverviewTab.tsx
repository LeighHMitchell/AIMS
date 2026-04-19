"use client";

import React from "react";
import { format, differenceInMonths } from "date-fns";
import {
  Banknote,
  MapPin,
  Target,
  Users,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SDGImageGrid } from "@/components/ui/SDGImageGrid";
import { getActivityStatusDisplay } from "@/lib/activity-status-utils";
import { cn } from "@/lib/utils";

interface Financials {
  totalCommitment: number;
  totalDisbursement: number;
  totalExpenditure: number;
  percentDisbursed: number;
}

interface Props {
  activity: any;
  financials: Financials;
  totalBudgeted: number;
  totalPlannedDisbursements: number;
  participatingOrgs: any[];
  countryAllocations: any[];
  regionAllocations: any[];
  sdgMappings: any[];
  onNavigate: (tab: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const formatUsd = (n: number): string => {
  if (!n || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const safeDate = (s?: string) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

function describeTimeline(activity: any): string {
  const start =
    safeDate(activity?.actualStartDate) || safeDate(activity?.plannedStartDate);
  const end =
    safeDate(activity?.actualEndDate) || safeDate(activity?.plannedEndDate);
  if (!start && !end) return "No dates recorded";
  if (start && end) {
    const months = differenceInMonths(end, start);
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const duration =
      years > 0
        ? `${years} yr${years === 1 ? "" : "s"}${rem > 0 ? ` ${rem} mo` : ""}`
        : `${months} mo`;
    return `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")} · ${duration}`;
  }
  if (start) return `Started ${format(start, "MMM yyyy")}`;
  return `Ends ${format(end!, "MMM yyyy")}`;
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-section-label font-medium text-muted-foreground uppercase">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums leading-tight">
        {value}
      </div>
      {hint && (
        <div className="text-helper text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: any;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h3 className="inline-flex items-center gap-2 text-body font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {action}
    </div>
  );
}

function DeepDiveCard({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start text-left p-4 rounded-lg border bg-background hover:border-foreground/30 hover:bg-surface-muted/50 transition-all"
    >
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-body font-semibold">{label}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
      <p className="text-helper text-muted-foreground leading-relaxed">
        {description}
      </p>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export function ActivityOverviewTab({
  activity,
  financials,
  totalBudgeted,
  totalPlannedDisbursements,
  participatingOrgs,
  countryAllocations,
  regionAllocations,
  sdgMappings,
  onNavigate,
}: Props) {
  const status = getActivityStatusDisplay(activity?.activityStatus);
  const timeline = describeTimeline(activity);

  const sectors = (activity?.sectors ?? [])
    .slice()
    .sort((a: any, b: any) => (b.percentage ?? 0) - (a.percentage ?? 0))
    .map((s: any) => ({
      name:
        (typeof s.sector_name === "string" && s.sector_name) ||
        (typeof s.name === "string" && s.name) ||
        s.sector_code ||
        s.code ||
        "Unnamed sector",
      percentage: s.percentage ?? null,
    }));
  const topSectors = sectors.slice(0, 5);

  // Normalise country/region shapes — they may come in as objects
  // (e.g. `{ country: { code, iso2, name } }`) or as flat `{ country_name, country_code, percentage }`.
  const getName = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v.name || v.label || v.code || "";
  };
  const countries = (countryAllocations ?? [])
    .map((c: any) => ({
      name:
        getName(c.country) ||
        c.country_name ||
        getName(c.name) ||
        c.country_code ||
        c.code ||
        "",
      percentage: c.percentage ?? c.allocation_percentage ?? null,
    }))
    .filter((c: any) => c.name);
  const regions = (regionAllocations ?? [])
    .map((r: any) => ({
      name:
        getName(r.region) ||
        r.region_name ||
        getName(r.name) ||
        r.region_code ||
        r.code ||
        "",
    }))
    .filter((r: any) => r.name);

  const orgs = (participatingOrgs ?? [])
    .map((p: any) => p.organization || p)
    .filter(Boolean);
  const topOrgs = orgs.slice(0, 6);

  const sdgCodes = (sdgMappings ?? [])
    .map((s: any) => s.sdg_goal ?? s.goal ?? s.code ?? s.sdgCode)
    .filter(Boolean);

  const primaryAmount =
    financials.totalCommitment > 0
      ? financials.totalCommitment
      : totalBudgeted;

  return (
    <div className="space-y-10">
      {/* ── Row 1: Status, Timeline, Key financials ─────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-8">
        {/* Left: status + timeline */}
        <div className="space-y-4">
          <SectionHeading icon={FileText} title="At a glance" />
          <div className="space-y-3">
            <div>
              <div className="text-section-label font-medium text-muted-foreground uppercase mb-1">
                Status
              </div>
              <Badge className={cn("text-body font-medium", status.className)}>
                {status.label}
              </Badge>
            </div>
            <div>
              <div className="text-section-label font-medium text-muted-foreground uppercase mb-1">
                Timeline
              </div>
              <div className="text-body">{timeline}</div>
            </div>
            {typeof activity?.reportingOrg?.name === "string" && activity.reportingOrg.name && (
              <div>
                <div className="text-section-label font-medium text-muted-foreground uppercase mb-1">
                  Reported by
                </div>
                <div className="text-body font-medium">
                  {activity.reportingOrg.name}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: KPIs */}
        <div className="space-y-4">
          <SectionHeading icon={Banknote} title="Money" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiTile
              label="Committed"
              value={formatUsd(financials.totalCommitment)}
              hint="Total committed (USD)"
            />
            <KpiTile
              label="Disbursed"
              value={formatUsd(financials.totalDisbursement)}
              hint={
                financials.percentDisbursed > 0
                  ? `${financials.percentDisbursed}% of commitments`
                  : undefined
              }
            />
            <KpiTile
              label="Spent"
              value={formatUsd(financials.totalExpenditure)}
              hint="Expenditure to date"
            />
            <KpiTile
              label="Budgeted"
              value={formatUsd(totalBudgeted)}
              hint={
                totalPlannedDisbursements > 0
                  ? `${formatUsd(totalPlannedDisbursements)} planned`
                  : undefined
              }
            />
          </div>
          {primaryAmount > 0 && financials.totalDisbursement > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-helper text-muted-foreground mb-1">
                <span>Disbursement progress</span>
                <span className="tabular-nums">
                  {Math.min(
                    100,
                    Math.round(
                      (financials.totalDisbursement / primaryAmount) * 100
                    )
                  )}
                  %
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (financials.totalDisbursement / primaryAmount) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Row 2: Scope (Sectors + Geography + SDGs) ───────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sectors */}
        <div>
          <SectionHeading
            icon={Layers}
            title="Sectors"
            action={
              topSectors.length > 0 && (
                <button
                  onClick={() => onNavigate("sectors")}
                  className="text-helper text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Details <ArrowRight className="h-3 w-3" />
                </button>
              )
            }
          />
          {topSectors.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No sectors recorded.
            </p>
          ) : (
            <ul className="space-y-2">
              {topSectors.map((s: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="text-body truncate">{s.name}</span>
                  {s.percentage != null && (
                    <span className="text-helper text-muted-foreground tabular-nums flex-shrink-0">
                      {Math.round(s.percentage)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Geography */}
        <div>
          <SectionHeading
            icon={MapPin}
            title="Geography"
            action={
              (countries.length > 0 || regions.length > 0) && (
                <button
                  onClick={() => onNavigate("geography")}
                  className="text-helper text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Map <ArrowRight className="h-3 w-3" />
                </button>
              )
            }
          />
          {countries.length === 0 && regions.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No locations recorded.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {countries.slice(0, 8).map((c: any, i: number) => (
                <Badge key={`c-${i}`} variant="secondary" className="font-normal">
                  {c.name}
                  {c.percentage != null && ` · ${Math.round(c.percentage)}%`}
                </Badge>
              ))}
              {regions.slice(0, 4).map((r: any, i: number) => (
                <Badge key={`r-${i}`} variant="outline" className="font-normal">
                  {r.name}
                </Badge>
              ))}
              {countries.length > 8 && (
                <Badge variant="outline" className="font-normal">
                  +{countries.length - 8} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* SDGs */}
        <div>
          <SectionHeading
            icon={Target}
            title="SDGs"
            action={
              sdgCodes.length > 0 && (
                <button
                  onClick={() => onNavigate("sdg")}
                  className="text-helper text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Details <ArrowRight className="h-3 w-3" />
                </button>
              )
            }
          />
          {sdgCodes.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No SDGs mapped.
            </p>
          ) : (
            <SDGImageGrid
              sdgCodes={sdgCodes}
              size="md"
              maxDisplay={8}
              clickable={false}
            />
          )}
        </div>
      </section>

      {/* ── Row 3: Partners ─────────────────────────────────────────────── */}
      {topOrgs.length > 0 && (
        <section>
          <SectionHeading
            icon={Users}
            title="Key partners"
            action={
              <button
                onClick={() => onNavigate("partnerships")}
                className="text-helper text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                All partners <ArrowRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="flex flex-wrap gap-2">
            {topOrgs.map((o: any, i: number) => {
              const name =
                (typeof o.name === "string" && o.name) ||
                (typeof o.organization_name === "string" && o.organization_name) ||
                "Unknown organisation";
              const acronym = typeof o.acronym === "string" ? o.acronym : null;
              const logo =
                (typeof o.logo_url === "string" && o.logo_url) ||
                (typeof o.logo === "string" && o.logo) ||
                null;
              return (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-body"
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      className="h-4 w-4 rounded-sm object-contain"
                    />
                  ) : (
                    <div className="h-4 w-4 rounded-sm bg-muted" />
                  )}
                  <span className="font-medium truncate max-w-[200px]">
                    {name}
                  </span>
                  {acronym && (
                    <span className="text-helper text-muted-foreground">
                      ({acronym})
                    </span>
                  )}
                </div>
              );
            })}
            {orgs.length > topOrgs.length && (
              <div className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-body text-muted-foreground">
                +{orgs.length - topOrgs.length} more
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Row 4: Dive deeper ──────────────────────────────────────────── */}
      <section className="border-t pt-8">
        <SectionHeading icon={ArrowRight} title="Dive deeper" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <DeepDiveCard
            label="Money"
            description="Budgets, disbursements, transactions and financial analytics."
            onClick={() => onNavigate("finances")}
          />
          <DeepDiveCard
            label="Scope"
            description="Sectors, geography, SDGs and policy markers covered."
            onClick={() => onNavigate("sectors")}
          />
          <DeepDiveCard
            label="People"
            description="Partners, contributing organisations and contacts."
            onClick={() => onNavigate("partnerships")}
          />
          <DeepDiveCard
            label="Delivery"
            description="Results, related activities, library and discussion."
            onClick={() => onNavigate("results")}
          />
        </div>
      </section>
    </div>
  );
}
