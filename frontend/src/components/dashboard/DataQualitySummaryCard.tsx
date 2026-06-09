"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@/hooks/useUser";
import { apiFetch } from "@/lib/api-fetch";
import {
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeftRight,
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
}

type CountKey = keyof SummaryCounts;

const ROW_CONFIG: {
  key: CountKey;
  tab: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  issue: string;
}[] = [
  { key: "activitiesMissingSector", tab: "sectors", icon: FileText, category: "Activities", issue: "Missing a sector" },
  { key: "activitiesMissingLocation", tab: "locations", icon: FileText, category: "Activities", issue: "Missing a location" },
  { key: "activitiesMissingAidType", tab: "activities", icon: FileText, category: "Activities", issue: "Missing an aid type" },
  { key: "activitiesMissingFinanceType", tab: "activities", icon: FileText, category: "Activities", issue: "Missing a finance type" },
  { key: "activitiesMissingStatus", tab: "activities", icon: FileText, category: "Activities", issue: "Missing a status" },
  { key: "activitiesMissingDates", tab: "activities", icon: FileText, category: "Activities", issue: "Missing start dates" },
  { key: "transactionsMissingDate", tab: "transactions", icon: ArrowLeftRight, category: "Transactions", issue: "Missing a date" },
  { key: "transactionsMissingFinanceType", tab: "transactions", icon: ArrowLeftRight, category: "Transactions", issue: "Missing a finance type" },
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
          Data gaps in your organisation&apos;s activities — click an issue to review and fix
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
              Every checked field is complete across your organisation&apos;s activities.
            </p>
          </div>
        ) : (
          <div className="border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px] text-right">Count</TableHead>
                  <TableHead className="w-[160px]">Category</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead className="w-[48px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const Icon = r.icon;
                  const n = counts![r.key];
                  const href = `/data-clinic?tab=${r.tab}`;
                  return (
                    <TableRow key={r.key}>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{n}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 text-body text-muted-foreground whitespace-nowrap">
                          <Icon className="h-4 w-4 shrink-0" />
                          {r.category}
                        </span>
                      </TableCell>
                      {/* Only the issue text (and the arrow) act as a link — clicking
                          elsewhere in the row does nothing. */}
                      <TableCell className="text-body">
                        <Link
                          href={href}
                          className="text-foreground hover:text-primary hover:underline underline-offset-2"
                        >
                          {r.issue}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={href} aria-label={`Review: ${r.issue}`} className="inline-flex">
                          <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
