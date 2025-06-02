"use client"

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  MessageSquare,
  Clock,
  AlertCircle,
  Filter
} from "lucide-react";

interface Activity {
  id: string;
  title: string;
  partnerId: string;
  description?: string;
  submissionStatus: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published';
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  activityStatus?: string;
  publicationStatus?: string;
  comments?: any[];
}

export default function ValidationsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'validated' | 'rejected'>('submitted');
  const [search, setSearch] = useState("");

  // Check if user can access this page
  const canValidate = user?.role === 'gov_partner_tier_1' || user?.role === 'super_user';

  useEffect(() => {
    if (!canValidate) {
      router.push("/");
      return;
    }
    fetchActivities();
  }, [canValidate, router]);

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error("Failed to fetch activities");
      const data = await res.json();
      setActivities(data);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(search.toLowerCase()) ||
                         activity.partnerId?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'all') {
      return matchesSearch && ['submitted', 'validated', 'rejected'].includes(activity.submissionStatus);
    }
    return matchesSearch && activity.submissionStatus === filter;
  });

  const pendingCount = activities.filter(a => a.submissionStatus === 'submitted').length;
  const validatedCount = activities.filter(a => a.submissionStatus === 'validated').length;
  const rejectedCount = activities.filter(a => a.submissionStatus === 'rejected').length;

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground">Loading validation queue...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Activity Validations</h1>
            <p className="text-muted-foreground mt-1">Review and validate submitted activities</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilter('submitted')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting validation</p>
              </CardContent>
            </Card>

            <Card className="bg-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilter('validated')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Validated</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validatedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready for publishing</p>
              </CardContent>
            </Card>

            <Card className="bg-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilter('rejected')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rejectedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Need revision</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filter === 'submitted' ? 'default' : 'outline'}
                onClick={() => setFilter('submitted')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filter === 'validated' ? 'default' : 'outline'}
                onClick={() => setFilter('validated')}
                size="sm"
              >
                Validated
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilter('rejected')}
                size="sm"
              >
                Rejected
              </Button>
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {filteredActivities.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No activities found</p>
                </CardContent>
              </Card>
            ) : (
              filteredActivities.map((activity) => (
                <Card key={activity.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{activity.title}</h3>
                          <Badge 
                            variant={
                              activity.submissionStatus === 'submitted' ? 'default' :
                              activity.submissionStatus === 'validated' ? 'success' :
                              activity.submissionStatus === 'rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {activity.submissionStatus}
                          </Badge>
                        </div>
                        
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Partner ID: {activity.partnerId}</span>
                          {activity.submittedByName && (
                            <span>Submitted by {activity.submittedByName}</span>
                          )}
                          {activity.submittedAt && (
                            <span>{format(new Date(activity.submittedAt), 'MMM d, yyyy')}</span>
                          )}
                          {activity.comments && activity.comments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{activity.comments.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/activities/${activity.id}?edit=true`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 