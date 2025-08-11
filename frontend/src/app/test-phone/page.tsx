'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { EnhancedCountryFlag } from '@/components/ui/enhanced-country-flag';

export default function TestPhonePage() {
  const [phoneValue, setPhoneValue] = useState('+95 9 123 456 789');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phone Input Test Page</h1>
      
      {/* Test individual flag components */}
      <Card>
        <CardHeader>
          <CardTitle>Flag Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <EnhancedCountryFlag countryCode="MM" countryName="Myanmar" size="sm" />
            <span>Myanmar (small)</span>
          </div>
          <div className="flex items-center gap-4">
            <EnhancedCountryFlag countryCode="TH" countryName="Thailand" size="md" />
            <span>Thailand (medium)</span>
          </div>
          <div className="flex items-center gap-4">
            <EnhancedCountryFlag countryCode="US" countryName="United States" size="lg" />
            <span>United States (large)</span>
          </div>
        </CardContent>
      </Card>

      {/* Test phone input */}
      <Card>
        <CardHeader>
          <CardTitle>Phone Input Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full max-w-md">
            <Label htmlFor="test-phone">Phone Number</Label>
            <InternationalPhoneInput
              id="test-phone"
              value={phoneValue}
              onChange={setPhoneValue}
              placeholder="Enter your phone number"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Current value:</strong> {phoneValue}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
