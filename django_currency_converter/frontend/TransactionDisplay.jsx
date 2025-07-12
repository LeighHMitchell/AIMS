import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Info
} from 'lucide-react';

/**
 * Component to display transaction values with USD conversion information
 */
const TransactionDisplay = ({ 
  transaction,
  onConvert = null,
  showConvertButton = false,
  compact = false 
}) => {
  const {
    value,
    currency,
    value_usd,
    value_usd_formatted,
    usd_convertible,
    conversion_status,
    exchange_rate_display,
    usd_conversion_date,
    is_currency_supported
  } = transaction;

  const getStatusInfo = () => {
    switch (conversion_status) {
      case 'native_usd':
        return {
          badge: 'USD',
          color: 'bg-blue-100 text-blue-800',
          icon: <DollarSign className="h-3 w-3" />,
          tooltip: 'Transaction is already in USD'
        };
      case 'converted':
        return {
          badge: 'Converted',
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-3 w-3" />,
          tooltip: `Converted to USD using exchange rate: ${exchange_rate_display}`
        };
      case 'unconvertible':
        return {
          badge: 'No USD rate',
          color: 'bg-red-100 text-red-800',
          icon: <AlertCircle className="h-3 w-3" />,
          tooltip: 'Currency not supported for automatic USD conversion'
        };
      case 'pending':
        return {
          badge: 'Not converted',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-3 w-3" />,
          tooltip: 'Currency is supported but not yet converted to USD'
        };
      default:
        return {
          badge: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          icon: <Info className="h-3 w-3" />,
          tooltip: 'Conversion status unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const formatOriginalValue = () => {
    const formattedValue = typeof value === 'number' 
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value;
    return `${formattedValue} ${currency}`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="font-medium">{formatOriginalValue()}</span>
        
        {value_usd_formatted && (
          <span className="text-sm text-gray-600">
            ({value_usd_formatted})
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
          <span className="font-medium text-lg">{formatOriginalValue()}</span>
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
      {value_usd_formatted && (
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-lg font-semibold text-green-600">
            {value_usd_formatted}
          </span>
          
          {exchange_rate_display && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{exchange_rate_display}</p>
                  {usd_conversion_date && (
                    <p className="text-xs mt-1">
                      Converted: {new Date(usd_conversion_date).toLocaleDateString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Convert Button */}
      {showConvertButton && onConvert && conversion_status === 'pending' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onConvert(transaction.id)}
          className="flex items-center space-x-1"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Convert to USD</span>
        </Button>
      )}

      {/* Warning for unsupported currency */}
      {!is_currency_supported && conversion_status === 'unconvertible' && (
        <div className="text-xs text-amber-600 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>
            {currency} is not supported for automatic conversion. 
            Please convert manually or contact support.
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Component to display conversion statistics
 */
export const ConversionStats = ({ stats, className = "" }) => {
  const conversionRate = stats?.conversion_rate || 0;
  const total = stats?.total_transactions || 0;
  
  if (total === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        No transactions to display
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{total}</div>
        <div className="text-sm text-blue-600">Total</div>
      </div>
      
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">
          {stats.converted_transactions || 0}
        </div>
        <div className="text-sm text-green-600">Converted</div>
      </div>
      
      <div className="text-center p-3 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-600">
          {stats.pending_transactions || 0}
        </div>
        <div className="text-sm text-yellow-600">Pending</div>
      </div>
      
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-600">
          {conversionRate.toFixed(1)}%
        </div>
        <div className="text-sm text-gray-600">Conversion Rate</div>
      </div>
    </div>
  );
};

export default TransactionDisplay;