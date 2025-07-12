import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * Enhanced Currency Selector that only allows supported currencies
 * Fetches and caches the list of convertible currencies from the API
 */
const CurrencySelector = ({ 
  value, 
  onChange, 
  placeholder = "Select currency",
  className = "",
  disabled = false,
  showUSDInfo = true,
  allowUSD = true
}) => {
  const [supportedCurrencies, setSupportedCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch supported currencies on component mount
  useEffect(() => {
    fetchSupportedCurrencies();
  }, []);

  const fetchSupportedCurrencies = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const url = `/api/currency/currencies/supported/${refresh ? '?refresh=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch currencies: ${response.status}`);
      }

      const data = await response.json();
      
      let currencies = data.supported_currencies || [];
      
      // Add USD if allowed and not already in list
      if (allowUSD && !currencies.find(c => c.code === 'USD')) {
        currencies.unshift({ code: 'USD', name: 'US Dollar', is_supported: true });
      }

      setSupportedCurrencies(currencies);
      setLastUpdated(data.last_updated);
      
      // Cache in localStorage for 1 hour
      const cacheData = {
        currencies,
        timestamp: Date.now(),
        lastUpdated: data.last_updated
      };
      localStorage.setItem('supportedCurrencies', JSON.stringify(cacheData));

    } catch (err) {
      console.error('Error fetching supported currencies:', err);
      setError(err.message);
      
      // Try to use cached data as fallback
      const cached = getCachedCurrencies();
      if (cached) {
        setSupportedCurrencies(cached.currencies);
        setLastUpdated(cached.lastUpdated);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCachedCurrencies = () => {
    try {
      const cached = localStorage.getItem('supportedCurrencies');
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - data.timestamp < oneHour) {
          return data;
        }
      }
    } catch (err) {
      console.error('Error reading cached currencies:', err);
    }
    return null;
  };

  const handleRefresh = () => {
    fetchSupportedCurrencies(true);
  };

  const getCurrencyInfo = (currencyCode) => {
    const currency = supportedCurrencies.find(c => c.code === currencyCode);
    return currency || null;
  };

  const isSelectedCurrencySupported = () => {
    if (!value) return true;
    const currency = getCurrencyInfo(value);
    return currency && currency.is_supported;
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading currencies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Select 
          value={value} 
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {supportedCurrencies.map((currency) => (
              <SelectItem 
                key={currency.code} 
                value={currency.code}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{currency.code}</span>
                  <span className="text-sm text-gray-500">- {currency.name}</span>
                  {currency.is_supported && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-gray-600"
          title="Refresh currency list"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Warning for unsupported selected currency */}
      {value && !isSelectedCurrencySupported() && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{value}</strong> cannot be automatically converted to USD. 
            Transactions in this currency will need manual conversion.
          </AlertDescription>
        </Alert>
      )}

      {/* USD conversion info */}
      {showUSDInfo && value && value !== 'USD' && isSelectedCurrencySupported() && (
        <div className="text-xs text-green-600 flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>This currency supports automatic USD conversion</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load currencies: {error}
            {supportedCurrencies.length > 0 && (
              <span className="block mt-1">Using cached data.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Last updated info */}
      {lastUpdated && (
        <div className="text-xs text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;