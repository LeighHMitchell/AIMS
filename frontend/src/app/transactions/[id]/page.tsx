"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { 
  TRANSACTION_TYPE_LABELS, 
  FLOW_TYPE_LABELS, 
  DISBURSEMENT_CHANNEL_LABELS, 
  TIED_STATUS_LABELS,
  TransactionType,
  FlowType,
  DisbursementChannel,
  TiedStatus 
} from "@/types/transaction";

interface TransactionDetail {
  id: string;
  uuid?: string;
  activity_id?: string;
  activity?: {
    id: string;
    title: string;
    iati_id?: string;
  };
  transaction_type: string;
  transaction_date: string;
  value: number;
  currency: string;
  status?: string;
  transaction_reference?: string;
  value_date?: string;
  description?: string;
  provider_org_name?: string;
  provider_org_ref?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  flow_type?: string;
  finance_type?: string;
  aid_type?: string;
  disbursement_channel?: string;
  tied_status?: string;
  is_humanitarian?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchTransaction();
    }
  }, [params?.id]);

  const fetchTransaction = async () => {
    if (!params?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/transactions/${params.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      
      const data = await response.json();
      setTransaction(data);
    } catch (err) {
      console.error("[AIMS] Error fetching transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to load transaction");
      toast.error("Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = "USD") => {
    // Ensure currency is a valid 3-letter code, fallback to USD
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : "USD";
    
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (error) {
      console.warn(`[TransactionDetailPage] Invalid currency "${currency}", using USD:`, error);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !transaction) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">
                {error || "Transaction not found"}
              </p>
              <Button onClick={() => router.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                Transaction Details
              </h1>
              <p className="text-sm text-gray-500">
                ID: {transaction.id}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Details */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="mt-1">
                <Badge className="bg-blue-100 text-blue-800">
                  {TRANSACTION_TYPE_LABELS[transaction.transaction_type as TransactionType] || transaction.transaction_type}
                </Badge>
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1">
                <Badge variant={transaction.status === "published" ? "success" : "secondary"}>
                  {transaction.status || "Draft"}
                </Badge>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Transaction Date</label>
              <p className="mt-1 text-gray-900">
                {format(new Date(transaction.transaction_date), "MMMM d, yyyy")}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Value Date</label>
              <p className="mt-1 text-gray-900">
                {transaction.value_date 
                  ? format(new Date(transaction.value_date), "MMMM d, yyyy")
                  : "—"
                }
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(transaction.value, transaction.currency)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Reference</label>
              <p className="mt-1 text-gray-900">
                {transaction.transaction_reference || "—"}
              </p>
            </div>

            {transaction.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-gray-900">
                  {transaction.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Provider Organization</label>
              <p className="mt-1 text-gray-900">
                {transaction.provider_org_name || "—"}
              </p>
              {transaction.provider_org_ref && (
                <p className="text-sm text-gray-500">
                  Ref: {transaction.provider_org_ref}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Receiver Organization</label>
              <p className="mt-1 text-gray-900">
                {transaction.receiver_org_name || "—"}
              </p>
              {transaction.receiver_org_ref && (
                <p className="text-sm text-gray-500">
                  Ref: {transaction.receiver_org_ref}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Link */}
        {transaction.activity && (
          <Card>
            <CardHeader>
              <CardTitle>Related Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/activities/${transaction.activity_id}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {transaction.activity.title}
              </Link>
              {/* Transaction UUID Display */}
              <div className="mt-2">
                <span className="text-xs text-gray-500">Transaction UUID:</span>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                  {transaction.uuid || transaction.id}
                </div>
              </div>
              {transaction.activity.iati_id && (
                <p className="text-sm text-gray-500 mt-1">
                  IATI ID: {transaction.activity.iati_id}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transaction.flow_type && (
              <div>
                <label className="text-sm font-medium text-gray-500">Flow Type</label>
                <p className="mt-1 text-gray-900">
                  {FLOW_TYPE_LABELS[transaction.flow_type as FlowType] || transaction.flow_type}
                </p>
              </div>
            )}

            {transaction.finance_type && (
              <div>
                <label className="text-sm font-medium text-gray-500">Finance Type</label>
                <p className="mt-1 text-gray-900">
                  {transaction.finance_type}
                </p>
              </div>
            )}

            {transaction.aid_type && (
              <div>
                <label className="text-sm font-medium text-gray-500">Aid Type</label>
                <p className="mt-1 text-gray-900">
                  {transaction.aid_type}
                </p>
              </div>
            )}

            {transaction.disbursement_channel && (
              <div>
                <label className="text-sm font-medium text-gray-500">Disbursement Channel</label>
                <p className="mt-1 text-gray-900">
                  {DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel as DisbursementChannel] || transaction.disbursement_channel}
                </p>
              </div>
            )}

            {transaction.tied_status && (
              <div>
                <label className="text-sm font-medium text-gray-500">Tied Status</label>
                <p className="mt-1 text-gray-900">
                  {TIED_STATUS_LABELS[transaction.tied_status as TiedStatus] || transaction.tied_status}
                </p>
              </div>
            )}

            {transaction.is_humanitarian !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-500">Humanitarian</label>
                <p className="mt-1 text-gray-900">
                  {transaction.is_humanitarian ? "Yes" : "No"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Created By</label>
              <p className="mt-1 text-gray-900">
                {transaction.created_by || "System"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="mt-1 text-gray-900">
                {format(new Date(transaction.created_at), "PPpp")}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="mt-1 text-gray-900">
                {format(new Date(transaction.updated_at), "PPpp")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 