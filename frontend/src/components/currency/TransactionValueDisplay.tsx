import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Info,
  Loader2
} from 'lucide-react';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

interface TransactionData {
  id: string;
  value: number;
  currency: string;
  transaction_date: string;
  value_date?: string;
  value_usd?: number | null;
  usd_convertible?: boolean;
  usd_conversion_date?: string | null;
  exchange_rate_used?: number | null;
}

interface TransactionValueDisplayProps {
  transaction: TransactionData;
  onConvert?: (transactionId: string) => void;
  showConvertButton?: boolean;
  compact?: boolean;
  variant?: 'full' | 'original-only' | 'usd-only';
  decimalPlaces?: number;
  monotone?: boolean;
}

interface ConversionStatus {
  status: 'native_usd' | 'converted' | 'unconvertible' | 'pending' | 'loading';
  badge: string;
  color: string;
  icon: React.ReactNode;
  tooltip: string;
}

/**
 * Enhanced component to display transaction values with USD conversion
 * Integrates with the currency converter service for real-time conversion
 */
export function TransactionValueDisplay({ 
  transaction,
  onConvert,
  showConvertButton = false,
  compact = false,
  variant = 'full',
  decimalPlaces = 2,
  monotone = false
}: TransactionValueDisplayProps) {
  // Debug logging
  console.log('[TransactionValueDisplay] Received transaction:', {
    id: transaction.id,
    currency: transaction.currency,
    value: transaction.value,
    value_usd: transaction.value_usd,
    usd_convertible: transaction.usd_convertible,
    showConvertButton,
    onConvert: !!onConvert
  });
  const [isConverting, setIsConverting] = useState(false);
  const [conversionData, setConversionData] = useState<{
    usd_amount: number | null;
    exchange_rate: number | null;
    conversion_date: string | null;
  }>({
    usd_amount: transaction.value_usd || null,
    exchange_rate: transaction.exchange_rate_used || null,
    conversion_date: transaction.usd_conversion_date || null
  });

  const formatCurrency = (value: number, currency: string = "USD") => {
    // Ensure currency is a valid 3-letter code, fallback to USD
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : "USD";
    
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch (error) {
      console.warn(`[TransactionValueDisplay] Invalid currency "${currency}", using USD:`, error);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  const formatOriginalValue = () => {
    return formatCurrency(transaction.value, transaction.currency);
  };

  const getConversionStatus = (): ConversionStatus => {
    if (isConverting) {
      return {
        status: 'loading',
        badge: 'Converting...',
        color: 'bg-blue-100 text-blue-800',
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        tooltip: 'Converting to USD...'
      };
    }

    if (transaction.currency === 'USD') {
      const hasValueDate = transaction.value_date && transaction.value_date !== transaction.transaction_date;
      const hasCalculatedValue = conversionData.usd_amount !== null && conversionData.usd_amount !== transaction.value;
      
      let tooltip = 'Transaction is already in USD';
      if (hasValueDate && hasCalculatedValue) {
        tooltip = `USD value calculated using value date: ${transaction.value_date}`;
      } else if (hasValueDate) {
        tooltip = `Transaction uses value date: ${transaction.value_date}`;
      }
      
      return {
        status: 'native_usd',
        badge: hasValueDate ? 'USD (Value Date)' : 'USD',
        color: 'bg-blue-100 text-blue-800',
        icon: <DollarSign className="h-3 w-3" />,
        tooltip
      };
    }

    if (conversionData.usd_amount !== null) {
      const exchangeRateDisplay = conversionData.exchange_rate 
        ? `1 ${transaction.currency} = ${conversionData.exchange_rate.toFixed(4)} USD`
        : '';
      
      return {
        status: 'converted',
        badge: 'Converted',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-3 w-3" />,
        tooltip: `Converted to USD${exchangeRateDisplay ? ` using exchange rate: ${exchangeRateDisplay}` : ''}`
      };
    }

    if (transaction.usd_convertible === false) {
      return {
        status: 'unconvertible',
        badge: 'No USD rate',
        color: 'bg-red-100 text-red-800',
        icon: <AlertCircle className="h-3 w-3" />,
        tooltip: 'Currency not supported for automatic USD conversion'
      };
    }

    return {
      status: 'pending',
      badge: 'Not converted',
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className="h-3 w-3" />,
      tooltip: 'Currency is supported but not yet converted to USD'
    };
  };

  const handleConvert = async () => {
    if (!onConvert) return;

    setIsConverting(true);
    try {
      // Call the parent's convert function
      await onConvert(transaction.id);
      
      // Optionally, try to get fresh conversion data
      const result = await fixedCurrencyConverter.convertToUSD(
        transaction.value,
        transaction.currency,
        new Date(transaction.value_date || transaction.transaction_date)
      );

      if (result.success && result.usd_amount !== null) {
        setConversionData({
          usd_amount: result.usd_amount,
          exchange_rate: result.exchange_rate,
          conversion_date: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const statusInfo = getConversionStatus();

  if (variant === 'original-only') {
    return (
      <div className="flex items-center space-x-2">
        <span className={monotone ? "font-medium text-foreground" : "font-medium"}>{formatOriginalValue()}</span>
      </div>
    );
  }

  if (variant === 'usd-only' && conversionData.usd_amount !== null) {
    return (
      <div className="flex items-center space-x-2">
        <DollarSign className={monotone ? "h-4 w-4 text-foreground" : "h-4 w-4 text-green-600"} />
        <span className={monotone ? "font-medium text-foreground" : "font-medium text-green-600"}>
          {formatCurrency(conversionData.usd_amount, 'USD')}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className={monotone ? "font-medium text-foreground" : "font-medium"}>{formatOriginalValue()}</span>
        
        {conversionData.usd_amount !== null && conversionData.usd_amount !== transaction.value && (
          <span className={monotone ? "text-sm text-foreground" : "text-sm text-green-600"}>
            ({formatCurrency(conversionData.usd_amount, 'USD')})
          </span>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={statusInfo.color}>
                {statusInfo.icon}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusInfo.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Original Value */}
      <div className="flex items-center justify-between">
        <div>
          <span className={monotone ? "font-medium text-lg text-foreground" : "font-medium text-lg"}>{formatOriginalValue()}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`${statusInfo.color} flex items-center space-x-1`}>
                {statusInfo.icon}
                <span>{statusInfo.badge}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusInfo.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* USD Value */}
      {conversionData.usd_amount !== null && conversionData.usd_amount !== transaction.value && (
        <div className="flex items-center space-x-2">
          <DollarSign className={monotone ? "h-4 w-4 text-foreground" : "h-4 w-4 text-green-600"} />
          <span className={monotone ? "text-lg font-semibold text-foreground" : "text-lg font-semibold text-green-600"}>
            {formatCurrency(conversionData.usd_amount, 'USD')}
          </span>
          
          {transaction.currency === 'USD' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className={monotone ? "h-4 w-4 text-foreground cursor-help" : "h-4 w-4 text-gray-400 cursor-help"} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>USD value calculated using value date: {transaction.value_date}</p>
                  {conversionData.conversion_date && (
                    <p className="text-xs mt-1">
                      Calculated: {new Date(conversionData.conversion_date).toLocaleDateString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : conversionData.exchange_rate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className={monotone ? "h-4 w-4 text-foreground cursor-help" : "h-4 w-4 text-gray-400 cursor-help"} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>1 {transaction.currency} = {conversionData.exchange_rate.toFixed(4)} USD</p>
                  {conversionData.conversion_date && (
                    <p className="text-xs mt-1">
                      Converted: {new Date(conversionData.conversion_date).toLocaleDateString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Convert Button */}
      {showConvertButton && statusInfo.status === 'pending' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleConvert}
          disabled={isConverting}
          className="flex items-center space-x-1"
        >
          {isConverting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          <span>{isConverting ? 'Converting...' : 'Convert to USD'}</span>
        </Button>
      )}

      {/* Warning for unsupported currency */}
      {statusInfo.status === 'unconvertible' && (
        <div className="text-xs text-amber-600 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>
            {transaction.currency} is not supported for automatic conversion. 
            Please convert manually or contact support.
          </span>
        </div>
      )}
    </div>
  );
}

export default TransactionValueDisplay;