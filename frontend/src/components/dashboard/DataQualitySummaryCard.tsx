"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { apiFetch } from "@/lib/api-fetch";
import {
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeftRight,
  Building2,
  Copy,
} from "lucide-react";

const ALLOWED_ROLES = ["super_user", "gov_partner_tier_1"];

interface SummaryCounts {
  activitiesMissingSector: number;
  activitiesMissingLocation: number;
  activitiesMissingAidType: number;
  activitiesMissingFinanceType: number;
  activitiesMissingStatus: number;
  activitiesMissingDates: number;
  transactionsMissingDate: number;
  transactionsMissingFinanceType: number;
  organizationsMissingType: number;
  organizationsMissingIdentifier: number;
  duplicatePairs: number;
}

type CountKey = keyof SummaryCounts;

const ROW_CONFIG: {
  key: CountKey;
  tab: string;
  icon: React.ComponentType<{ className?: string }>;
  label: (n: number) => string;
}[] = [
  { key: "activitiesMissingSector", tab: "activities", icon: FileText, label: (n) => `${n} ${n === 1 ? "activity" : "activities"} missing a sector` },
  { key: "activitiesMissingLocation", tab: "activities", icon: FileText, label: (n) => `${n} ${n === 1 ? "activity" : "activities"} missing a location` },
  { key: "activitiesMissingAidType", tab: "activities", icon: FileText, label: (n) => `${n} ${n === 1 ? "activity" : "activities"} missing an aid type` },
  { key: "activitiesMissingFinanceType", tab: "activities", icon: FileText, label: (n) => `${n} ${n === 1 ? "activity" : "activities"} missing a finance type` },
  { key: "activitiesMissingStatus", tab: "activities", icon: FileText, label: (n) => `${n} ${n === 1 ? "activity" : "activities"} missing a status` },
  { key: "activitiesMissingDates", tab: "activities", icon: FileText, label: (n) => `${n} ${n === 1 ? "activity" : "activities"} missing start dates` },
  { key: "transactionsMissingDate", tab: "transactions", icon: ArrowLeftRight, label: (n) => `${n} ${n === 1 ? "transaction" : "transactions"} missing a date` },
  { key: "transactionsMissingFinanceType", tab: "transactions", icon: ArrowLeftRight, label: (n) => `${n} ${n === 1 ? "transaction" : "transactions"} missing a finance type` },
  { key: "organizationsMissingType", tab: "organizations", icon: Building2, label: (n) => `${n} ${n === 1 ? "organisation" : "organisations"} missing a type` },
  { key: "organizationsMissingIdentifier", tab: "organizations", icon: Building2, label: (n) => `${n} ${n === 1 ? "organisation" : "organisations"} missing an IATI identifier` },
  { key: "duplicatePairs", tab: "duplicates", icon: Copy, label: (n) => `${n} potential duplicate ${n === 1 ? "record" : "records"}` },
];

export function DataQualitySummaryCard({ className }: { className?: string }) {
  const { user } = useUser();
  const [counts, setCounts] = useState<SummaryCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canSee = !!user && ALLOWED_ROLES.includes(user.role as string);

  useEffect(() => {
    if (!canSee) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch("/api/data-clinic/summary");
        if (!res.ok) throw new Error("Failed to load data quality summary");
        const data = await res.json();
        if (!cancelled) setCounts(data.counts as SummaryCounts);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSee]);

  // Hidden entirely for roles that can't act on Data Clinic
  if (!canSee) return null;

  const rows = counts
    ? ROW_CONFIG.filter((r) => (counts[r.key] ?? 0) > 0)
    : [];

  return (
    <Card className={`bg-white ${className ?? ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-muted-foreground" />
          Data Quality
        </CardTitle>
        <CardDescription>
          System-wide data gaps from the Data Clinic — click to review and fix
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-helper text-muted-foreground py-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Couldn&apos;t load data quality summary.</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-body text-foreground">No data quality issues found</p>
            <p className="text-helper text-muted-foreground mt-0.5">
              Every checked field is complete across the portfolio.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const Icon = r.icon;
              const n = counts![r.key];
              return (
                <Link
                  key={r.key}
                  href={`/data-clinic?tab=${r.tab}`}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-input no-underline"
                >
                  <div className="p-2 rounded-full bg-white text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="flex-1 min-w-0 font-medium text-body text-foreground truncate">
                    {r.label(n)}
                  </p>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
