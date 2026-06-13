"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Play, Loader2, Code2, FileCode, Globe } from "lucide-react";
import { toast } from "sonner";

interface EndpointParam {
  name: string;
  required?: boolean;
  description: string;
}

interface Endpoint {
  id: string;
  method: "GET";
  path: string;
  summary: string;
  description: string;
  params: EndpointParam[];
  returns: "json" | "xml";
  example: string; // example path with sample params filled in
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "activities-list",
    method: "GET",
    path: "/api/v1/public/activities",
    summary: "List published activities",
    description:
      "Paginated list of published activities. Drafts, rejected, and deleted activities are never returned. Use this to discover activity ids, then call the detail endpoint for full records.",
    params: [
      { name: "page", description: "Page number (default 1)." },
      { name: "limit", description: "Results per page (default 20, max 100)." },
      { name: "search", description: "Filter by title or IATI identifier." },
    ],
    returns: "json",
    example: "/api/v1/public/activities?limit=5",
  },
  {
    id: "activity-detail",
    method: "GET",
    path: "/api/v1/public/activities/{id}",
    summary: "Get one activity with detail",
    description:
      "Full detail for a single published activity, including sectors, participating organisations, locations, and transactions. The {id} may be the internal UUID or the IATI identifier. Returns 404 for anything not publicly published.",
    params: [
      { name: "id", required: true, description: "Activity UUID or IATI identifier (in the path)." },
    ],
    returns: "json",
    example: "/api/v1/public/activities/{id}",
  },
  {
    id: "transactions",
    method: "GET",
    path: "/api/v1/public/transactions",
    summary: "List transactions",
    description:
      "Transactions belonging to published activities (commitments, disbursements, expenditures). Visibility is inherited from the parent activity. Provide activity_id for complete coverage of one activity.",
    params: [
      { name: "activity_id", description: "Restrict to a single (published) activity." },
      { name: "page", description: "Page number (default 1)." },
      { name: "limit", description: "Results per page (default 20, max 100)." },
    ],
    returns: "json",
    example: "/api/v1/public/transactions?limit=5",
  },
  {
    id: "iati-xml",
    method: "GET",
    path: "/api/v1/iati.xml",
    summary: "IATI 2.03 publishing file",
    description:
      "A single iati-activities XML document of all published activities, suitable for the IATI Registry, d-portal, and partner harvesters. Optionally scope to one reporting organisation.",
    params: [
      { name: "reporting_org", description: "Restrict to one reporting organisation (UUID)." },
    ],
    returns: "xml",
    example: "/api/v1/iati.xml",
  },
];

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label ? <span className="ml-2">{label}</span> : null}
    </Button>
  );
}

function EndpointCard({ endpoint, origin }: { endpoint: Endpoint; origin: string }) {
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fullUrl = `${origin}${endpoint.path}`;
  const exampleUrl = `${origin}${endpoint.example}`;
  const hasPathParam = endpoint.path.includes("{");

  const tryIt = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    try {
      const res = await fetch(endpoint.example, { headers: { Accept: "*/*" } });
      setStatus(res.status);
      const text = await res.text();
      if (endpoint.returns === "json") {
        try {
          setResponse(JSON.stringify(JSON.parse(text), null, 2).slice(0, 4000));
        } catch {
          setResponse(text.slice(0, 4000));
        }
      } else {
        setResponse(text.slice(0, 4000));
      }
    } catch (err) {
      setResponse(err instanceof Error ? err.message : "Request failed");
      setStatus(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="bg-surface-muted">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{endpoint.summary}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{endpoint.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono">
            {endpoint.returns.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 font-mono hover:bg-emerald-600">{endpoint.method}</Badge>
          <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {fullUrl}
          </code>
          <CopyButton value={fullUrl} />
        </div>

        {endpoint.params.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Parameters
            </p>
            <div className="overflow-hidden border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {endpoint.params.map((p) => (
                    <tr key={p.name} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">
                        {p.name}
                        {p.required ? (
                          <span className="ml-1 text-red-600" title="required">
                            *
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={tryIt} disabled={loading || hasPathParam}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-2">Try it</span>
          </Button>
          <span className="font-mono text-xs text-muted-foreground">{exampleUrl}</span>
          {hasPathParam ? (
            <span className="text-xs text-muted-foreground">
              (fill in a real id from the list endpoint to try this one)
            </span>
          ) : null}
        </div>

        {response !== null && (
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                Response
              </span>
              {status !== null && (
                <Badge
                  variant={status >= 200 && status < 300 ? "secondary" : "destructive"}
                  className="font-mono"
                >
                  {status || "ERR"}
                </Badge>
              )}
            </div>
            <pre className="max-h-80 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100">
              <code>{response}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApiPortalPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-2">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">API</h1>
          <p className="mt-1 text-muted-foreground">
            Public, read-only access to published aid data. No sign-in or API key
            is required. Copy an endpoint URL, or use Try it to see a live response.
          </p>
        </div>

        {/* At-a-glance facts */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Open access</p>
                <p className="text-xs text-muted-foreground">
                  No key needed. Published data only.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <Code2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">JSON & IATI XML</p>
                <p className="text-xs text-muted-foreground">
                  REST JSON plus an IATI 2.03 publishing file.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <FileCode className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">CORS enabled</p>
                <p className="text-xs text-muted-foreground">
                  Call directly from the browser or a server.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick start */}
        <Card>
          <CardHeader className="bg-surface-muted">
            <CardTitle className="text-base">Quick start</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Every endpoint is a plain HTTPS GET. Try it from your terminal:
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100">
                curl {origin}/api/v1/public/activities?limit=5
              </code>
              <CopyButton
                value={`curl ${origin}/api/v1/public/activities?limit=5`}
                label="Copy"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Endpoints */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Endpoints</h2>
          <p className="text-sm text-muted-foreground">
            All endpoints return only published, non-deleted records. Personal
            contact details and internal identifiers are never exposed.
          </p>
        </div>
        <div className="space-y-5">
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={ep.id} endpoint={ep} origin={origin} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
