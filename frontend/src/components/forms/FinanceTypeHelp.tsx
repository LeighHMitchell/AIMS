import React from 'react';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Complete IATI Finance Type definitions
const FINANCE_TYPE_DEFINITIONS = {
  // Grants
  '1': {
    label: 'GNI: Gross National Income',
    description: 'The total domestic and foreign output claimed by residents of a country'
  },
  '110': {
    label: 'Standard grant',
    description: 'Transfers in cash or in kind for which no legal debt is incurred by the recipient'
  },
  '111': {
    label: 'Subsidies to national private investors',
    description: 'Grants to national private investors to help them establish or expand their activities'
  },
  
  // Interest subsidies
  '210': {
    label: 'Interest subsidy',
    description: 'A payment to soften the terms of private export credits, or loans or credits by the banking sector'
  },
  '211': {
    label: 'Interest subsidy to national private exporters',
    description: 'Interest subsidies to national private exporters on their loans'
  },
  
  // Deposit-based instruments
  '310': {
    label: 'Deposit basis',
    description: 'Payments into a fund to finance projects, where the recipient has to provide matching funds'
  },
  '311': {
    label: 'Encashment basis',
    description: 'Funds made available when recipient provides evidence of expenditure'
  },
  
  // Loans
  '410': {
    label: 'Aid loan excluding debt reorganisation',
    description: 'Loans extended by donor governments or official agencies with a grant element of at least 25%'
  },
  '411': {
    label: 'Investment-related loan',
    description: 'Loan to developing countries for investment projects'
  },
  '412': {
    label: 'Joint venture loan',
    description: 'Loan provided as part of a joint venture with the recipient'
  },
  '413': {
    label: 'Loan to private investor',
    description: 'Loan to national private investor in recipient country'
  },
  '414': {
    label: 'Loan to private exporter',
    description: 'Loan to national private exporter in recipient country'
  },
  '421': {
    label: 'Reimbursable grant',
    description: 'A grant that may require repayment under certain conditions'
  },
  
  // Export credits
  '451': {
    label: 'Non-banks guaranteed export credits',
    description: 'Export credits with official guarantee by non-banking institutions'
  },
  '452': {
    label: 'Non-banks non-guaranteed portions',
    description: 'Non-guaranteed portions of guaranteed export credits by non-banks'
  },
  '453': {
    label: 'Bank export credits',
    description: 'Export credits extended by the banking sector'
  },
  
  // Debt relief
  '510': {
    label: 'Debt forgiveness: ODA',
    description: 'Cancellation of ODA loan debt'
  },
  '511': {
    label: 'Debt forgiveness: DSR',
    description: 'Debt forgiveness under Debt Service Reduction'
  },
  '512': {
    label: 'Debt forgiveness: HIPC',
    description: 'Debt relief under Heavily Indebted Poor Countries Initiative'
  },
  '513': {
    label: 'Debt forgiveness: MDRI',
    description: 'Debt relief under Multilateral Debt Relief Initiative'
  },
  '520': {
    label: 'Debt forgiveness: OOF',
    description: 'Cancellation of Other Official Flows debt'
  },
  '530': {
    label: 'Debt forgiveness: Private',
    description: 'Cancellation of private claims debt'
  },
  
  // Other instruments
  '700': {
    label: 'Foreign direct investment',
    description: 'Investment to acquire lasting interest in enterprises operating in recipient countries'
  },
  '810': {
    label: 'Bonds',
    description: 'Fixed income debt securities issued by recipient entities'
  },
  '910': {
    label: 'Other securities/claims',
    description: 'Other securities and financial claims not elsewhere classified'
  },
  '1100': {
    label: 'Guarantees/insurance',
    description: 'Risk mitigation instruments including guarantees and insurance'
  }
};

interface FinanceTypeHelpProps {
  financeType?: string;
  className?: string;
  iconSize?: number;
}

export function FinanceTypeHelp({ 
  financeType, 
  className = "",
  iconSize = 14 
}: FinanceTypeHelpProps) {
  const typeInfo = financeType ? FINANCE_TYPE_DEFINITIONS[financeType as keyof typeof FINANCE_TYPE_DEFINITIONS] : null;
  
  const defaultMessage = (
    <div className="space-y-2">
      <p className="font-semibold">Default Finance Type</p>
      <p>This sets the default financial instrument for transactions in this activity. Common types include:</p>
      <ul className="text-xs space-y-1 mt-2">
        <li><strong>110</strong> - Standard grant (no repayment required)</li>
        <li><strong>410</strong> - Aid loan (concessional loan)</li>
        <li><strong>421</strong> - Reimbursable grant (conditional repayment)</li>
        <li><strong>700</strong> - Foreign direct investment</li>
        <li><strong>1100</strong> - Guarantees/insurance</li>
      </ul>
      <p className="text-xs mt-2 text-muted-foreground">
        Individual transactions can override this default if needed.
      </p>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon 
            className={`inline-block text-muted-foreground hover:text-foreground cursor-help ${className}`}
            size={iconSize}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          {typeInfo ? (
            <div className="space-y-2">
              <p className="font-semibold">{typeInfo.label}</p>
              <p className="text-sm">{typeInfo.description}</p>
              <p className="text-xs text-muted-foreground">IATI Code: {financeType}</p>
            </div>
          ) : defaultMessage}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 