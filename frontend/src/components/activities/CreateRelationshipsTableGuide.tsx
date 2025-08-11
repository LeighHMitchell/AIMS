import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CreateRelationshipsTableGuide() {
  const [copied, setCopied] = React.useState(false);
  
  const sqlCommand = `-- Create activity_relationships table for IATI-compliant linked activities
CREATE TABLE IF NOT EXISTS activity_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  related_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(10) NOT NULL CHECK (relationship_type IN ('1', '2', '3', '4', '5')),
  narrative TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(activity_id, related_activity_id),
  CHECK (activity_id != related_activity_id)
);

CREATE INDEX idx_activity_relationships_activity_id ON activity_relationships(activity_id);
CREATE INDEX idx_activity_relationships_related_activity_id ON activity_relationships(related_activity_id);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
              <h4 className="text-orange-900 font-medium mb-2">Database Setup Required</h4>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-orange-800">
          The activity_relationships table needs to be created in your database to enable linked activities.
        </p>
        <div className="bg-white border border-orange-200 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">SQL Command:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">{sqlCommand}</pre>
        </div>
        <p className="text-xs text-orange-700">
          Run this SQL in your Supabase dashboard: SQL Editor → New Query → Paste & Run
        </p>
      </AlertDescription>
    </Alert>
  );
}
