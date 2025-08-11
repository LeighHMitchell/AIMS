import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SimplePhoneInput } from '@/components/ui/simple-phone-input';

export function PhoneInputDemo() {
  const [phoneValue, setPhoneValue] = useState('+95 9 123 456 789');

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>International Phone Input Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="demo-phone">Phone Number</Label>
                      <SimplePhoneInput
              id="demo-phone"
              value={phoneValue}
              onChange={setPhoneValue}
              placeholder="Enter your phone number"
            />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p><strong>Current value:</strong> {phoneValue}</p>
          <div className="mt-2 space-y-1">
            <p><strong>Features:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>🏳️ Country flags (proper images) and names</li>
              <li>📞 IDD codes (+95, +66, etc.)</li>
              <li>🔍 Searchable by country name or code</li>
              <li>⌨️ Auto-detects country: try "+95123456" or "+66987654"</li>
              <li>📱 Type local number without +: "123456789"</li>
              <li>🎯 Click flag to change country manually</li>
              <li>🇲🇲 Defaults to Myanmar (+95)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
