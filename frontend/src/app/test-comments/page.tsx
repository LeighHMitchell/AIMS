'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestCommentsPage() {
  const [setupResult, setSetupResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const setupDatabase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup-database', {
        method: 'POST',
      });
      
      const data = await res.json();
      setSetupResult(data);
      
      if (data.success) {
        console.log('Database check completed:', data);
      } else {
        console.error('Database check failed:', data);
      }
    } catch (error) {
      console.error('Setup error:', error);
      setSetupResult({
        success: false,
        error: 'Failed to connect to API',
        results: ['❌ Could not connect to setup API']
      });
    } finally {
      setLoading(false);
    }
  };

  const testComments = async () => {
    setLoading(true);
    try {
      const activityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f';
      const res = await fetch(`/api/activities/${activityId}/comments`);
      
      if (res.ok) {
        const comments = await res.json();
        console.log(`Comments API working! Found ${comments.length} comments`);
      } else {
        const error = await res.json();
        console.error(`Comments API error:`, error);
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Comments System Test</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Database Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Check which database tables exist for the comments system.
            </p>
            <Button 
              onClick={setupDatabase} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Database Tables'}
            </Button>
            
            {setupResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Results:</h4>
                <div className="space-y-1 text-sm font-mono">
                  {setupResult.results?.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))}
                </div>
                
                {setupResult.instructions && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <h5 className="font-medium text-yellow-800 mb-1">Instructions:</h5>
                    <div className="text-sm text-yellow-700 space-y-1">
                      {setupResult.instructions.map((instruction, index) => (
                        <div key={index}>• {instruction}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Test Comments API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Test if the comments API is working correctly.
            </p>
            <Button 
              onClick={testComments} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Comments API'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SQL Script for Missing Tables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              If tables are missing, copy this SQL and run it in your database:
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
              <pre>{`-- Create missing comments tables
CREATE TABLE IF NOT EXISTS activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES activity_comment_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    like_type TEXT NOT NULL CHECK (like_type IN ('thumbs_up', 'thumbs_down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_comment_like UNIQUE (comment_id, user_id),
    CONSTRAINT unique_user_reply_like UNIQUE (reply_id, user_id),
    CONSTRAINT check_comment_or_reply CHECK (
        (comment_id IS NOT NULL AND reply_id IS NULL) OR 
        (comment_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON activity_comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_comment_id ON activity_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_likes_reply_id ON activity_comment_likes(reply_id);`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}