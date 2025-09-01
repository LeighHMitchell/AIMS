import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  RefreshCw,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Link2,
  FileText,
  Code,
  ArrowUpDown,
  Info,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface IatiLinkTabProps {
  activityId: string;
  iatiIdentifier?: string;
}

interface LinkStatus {
  lastSync?: Date;
  status: 'never' | 'syncing' | 'success' | 'error';
  message?: string;
  fields?: {
    field: string;
    localValue: any;
    iatiValue: any;
    status: 'match' | 'conflict' | 'missing';
  }[];
}

interface IatiSource {
  type: 'registry' | 'file' | 'url';
  value: string;
  lastChecked?: Date;
}

export default function IatiLinkTab({ activityId, iatiIdentifier }: IatiLinkTabProps) {
  const [linkStatus, setLinkStatus] = useState<LinkStatus>({ status: 'never' });
  const [iatiSource, setIatiSource] = useState<IatiSource>({ type: 'registry', value: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [iatiData, setIatiData] = useState<any>(null);
  const [mappingConfig, setMappingConfig] = useState<any>({});

  // Mock function to check link status
  const checkLinkStatus = async () => {
    setIsLoading(true);
    try {
      // This would call your API to check link status
      // For now, we'll mock it
      setLinkStatus({
        status: 'success',
        lastSync: new Date(),
        message: 'Activity is linked with IATI registry',
        fields: [
          { field: 'title', localValue: 'Sample Activity', iatiValue: 'Sample Activity', status: 'match' },
          { field: 'description', localValue: 'Description here', iatiValue: 'Different description', status: 'conflict' },
          { field: 'status', localValue: '2', iatiValue: '2', status: 'match' },
          { field: 'budget', localValue: null, iatiValue: 150000, status: 'missing' },
        ]
      });
    } catch (error) {
      setLinkStatus({
        status: 'error',
        message: 'Failed to check link status'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mock function to perform link operations
  const performLink = async (direction: 'pull' | 'push') => {
    setIsLoading(true);
    setLinkStatus({ ...linkStatus, status: 'syncing' });
    
    try {
      // This would call your API to link data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      
      setLinkStatus({
        status: 'success',
        lastSync: new Date(),
        message: `Successfully ${direction === 'pull' ? 'pulled from' : 'pushed to'} IATI`,
        fields: linkStatus.fields
      });
      
      toast.success(`IATI link operation completed successfully`, {
        description: `Data ${direction === 'pull' ? 'pulled from' : 'pushed to'} IATI registry`
      });
    } catch (error) {
      setLinkStatus({
        status: 'error',
        message: 'Link operation failed. Please try again.'
      });
      toast.error('IATI link operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      never: { variant: 'outline', icon: Clock, label: 'Not linked' },
      syncing: { variant: 'outline', icon: RefreshCw, label: 'Linking...' },
      success: { variant: 'outline', icon: CheckCircle, label: 'Linked' },
      error: { variant: 'outline', icon: AlertCircle, label: 'Link error' },
    };

    const config = variants[status] || variants.never;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  // Field comparison component
  const FieldComparison = ({ field }: { field: any }) => {
    const statusColors = {
      match: 'text-green-600',
      conflict: 'text-orange-600',
      missing: 'text-gray-400'
    };

    const statusIcons = {
      match: CheckCircle,
      conflict: AlertCircle,
      missing: Info
    };

    const Icon = statusIcons[field.status];

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center gap-3">
          <Icon className={`h-4 w-4 ${statusColors[field.status]}`} />
          <div>
            <p className="font-medium text-sm">{field.field}</p>
            <div className="flex gap-4 mt-1">
              <span className="text-xs text-gray-600">
                Local: <code className="bg-white px-1 rounded">{field.localValue || 'null'}</code>
              </span>
              {field.status !== 'match' && (
                <span className="text-xs text-gray-600">
                  IATI: <code className="bg-white px-1 rounded">{field.iatiValue || 'null'}</code>
                </span>
              )}
            </div>
          </div>
        </div>
        <Badge variant={field.status === 'match' ? 'success' : field.status === 'conflict' ? 'warning' : 'secondary'}>
          {field.status}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                IATI Link
              </CardTitle>
              <CardDescription className="mt-1">
                Manage the link between this activity and IATI data sources
              </CardDescription>
            </div>
            <StatusBadge status={linkStatus.status} />
          </div>
        </CardHeader>
        <CardContent>
          {/* IATI Identifier */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="iati-id">IATI Activity Identifier</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="iati-id"
                  value={iatiIdentifier || ''}
                  placeholder="e.g., GB-GOV-1-PROJECT-123"
                  className="font-mono"
                  readOnly={!!iatiIdentifier}
                />
                {iatiIdentifier && (
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {!iatiIdentifier && (
                <p className="text-xs text-gray-500 mt-1">
                  No IATI identifier set. Enter one to enable IATI linking.
                </p>
              )}
            </div>

            {/* Last Link Info */}
            {linkStatus.lastSync && (
              <Alert>
                <Info className="h-4 w-4" />
                <div className="font-medium">Last Linked</div>
                <AlertDescription>
                  {linkStatus.lastSync.toLocaleString()} - {linkStatus.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => checkLinkStatus()}
                disabled={isLoading || !iatiIdentifier}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
              <Button
                onClick={() => performLink('pull')}
                disabled={isLoading || !iatiIdentifier}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Pull from IATI
              </Button>
              <Button
                onClick={() => performLink('push')}
                disabled={isLoading || !iatiIdentifier}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Push to IATI
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Sync Information */}
      <Card>
        <CardHeader>
          <CardTitle>Link Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fields">Field Mapping</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {linkStatus.fields && linkStatus.fields.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Field Comparison</h3>
                    <Badge variant="outline">
                      {linkStatus.fields.filter(f => f.status === 'match').length}/{linkStatus.fields.length} matched
                    </Badge>
                  </div>
                  {linkStatus.fields.map((field, index) => (
                    <FieldComparison key={index} field={field} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No link data available</p>
                  <p className="text-sm mt-1">Check status to compare fields</p>
                </div>
              )}
            </TabsContent>

            {/* Field Mapping Tab */}
            <TabsContent value="fields" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <div className="font-medium">Field Mapping Configuration</div>
                <AlertDescription>
                  Configure how local fields map to IATI standard fields. This ensures proper data linking.
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Local Field</p>
                    <code className="text-xs">title_narrative</code>
                  </div>
                  <div>
                    <p className="text-sm font-medium">IATI Field</p>
                    <code className="text-xs">iati-activity/title/narrative</code>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Local Field</p>
                    <code className="text-xs">description_narrative</code>
                  </div>
                  <div>
                    <p className="text-sm font-medium">IATI Field</p>
                    <code className="text-xs">iati-activity/description/narrative</code>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No link history</p>
                <p className="text-sm mt-1">Link operations will be logged here</p>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Data Source</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      variant={iatiSource.type === 'registry' ? 'default' : 'outline'}
                      onClick={() => setIatiSource({ ...iatiSource, type: 'registry' })}
                      className="justify-start"
                    >
                      <Code className="h-4 w-4 mr-2" />
                      IATI Registry
                    </Button>
                    <Button
                      variant={iatiSource.type === 'file' ? 'default' : 'outline'}
                      onClick={() => setIatiSource({ ...iatiSource, type: 'file' })}
                      className="justify-start"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      XML File
                    </Button>
                    <Button
                      variant={iatiSource.type === 'url' ? 'default' : 'outline'}
                      onClick={() => setIatiSource({ ...iatiSource, type: 'url' })}
                      className="justify-start"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Custom URL
                    </Button>
                  </div>
                </div>

                {iatiSource.type === 'url' && (
                  <div>
                    <Label htmlFor="custom-url">Custom IATI Data URL</Label>
                    <Input
                      id="custom-url"
                      type="url"
                      placeholder="https://example.org/iati-data.xml"
                      value={iatiSource.value}
                      onChange={(e) => setIatiSource({ ...iatiSource, value: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                )}

                <Separator />

                <div>
                  <Label>Link Options</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Auto-link on save</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Validate against IATI schema</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Preserve local changes on conflict</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}