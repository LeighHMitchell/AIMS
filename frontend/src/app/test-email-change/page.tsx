"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api-fetch';

export default function TestEmailChangePage() {
  const [newEmail, setNewEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEmailChange = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('Testing email change with:', newEmail);

      const response = await apiFetch('/api/users/change-email-simple', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'local-test-user',
          newEmail: newEmail,
          currentUserRole: 'super_user'
        }),
      });

      const data = await response.json();
      
      setResult({
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (response.ok) {
        toast.success("Email change test successful!");
      } else {
        toast.error("Email change test failed");
      }

    } catch (error) {
      console.error('Test error:', error);
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error("Test failed with exception");
    } finally {
      setLoading(false);
    }
  };

  const resetTestData = async () => {
    try {
      const response = await apiFetch('/api/test-email-change', {
        method: 'POST',
      });
      
      const data = await response.json();
      toast.success("Test data reset");
      setResult(null);
    } catch (error) {
      toast.error("Failed to reset test data");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Change Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              New Email Address
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="test-new@example.com"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testEmailChange}
              disabled={loading}
            >
              {loading ? "Testing..." : "Test Email Change"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={resetTestData}
            >
              Reset Test Data
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Test Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>Test User ID:</strong> local-test-user</p>
            <p><strong>Original Email:</strong> test@example.com</p>
            <p><strong>User Role:</strong> super_user</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
