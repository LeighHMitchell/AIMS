import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Finance types with categories
const FINANCE_TYPES_CATEGORIZED = {
  'GRANTS': {
    '110': 'Standard grant',
    '111': 'Subsidies to national private investors',
  },
  'LOANS': {
    '410': 'Aid loan excluding debt reorganisation',
    '411': 'Investment-related loan to developing countries', 
    '412': 'Loan in a joint venture with the recipient',
    '413': 'Loan to national private investor',
    '414': 'Loan to national private exporter',
    '421': 'Reimbursable grant',
  },
  'DEBT RELIEF': {
    '510': 'Debt forgiveness: ODA claims',
    '511': 'Debt forgiveness: ODA claims (HIPCs)',
    '512': 'Debt forgiveness: ODA claims (MDRI)',
    '520': 'Debt rescheduling: ODA claims',
    '600': 'Debt reorganisation',
  },
  'GUARANTEES': {
    '1100': 'Guarantees/insurance',
    '432': 'Guarantees on private investment',
    '433': 'Guarantees on other credits',
  },
  'OTHER': {
    '210': 'Interest subsidy',
    '310': 'Deposit basis',
    '700': 'Foreign direct investment',
    '810': 'Bonds',
    '910': 'Other securities/claims',
  }
};

interface DefaultFinanceTypeSelectProps {
  id?: string;
  value?: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DefaultFinanceTypeSelect({
  id,
  value,
  onValueChange,
  placeholder = "Select default finance type",
  disabled = false
}: DefaultFinanceTypeSelectProps) {
  return (
    <Select value={value || ""} onValueChange={(val) => onValueChange?.(val === "" ? null : val)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent 
        className="max-h-[400px] w-[var(--radix-select-trigger-width)]"
        position="popper"
        sideOffset={5}
      >
        {Object.entries(FINANCE_TYPES_CATEGORIZED).map(([category, types]) => (
          <React.Fragment key={category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category}</div>
            {Object.entries(types).map(([code, label]) => (
              <SelectItem 
                key={code} 
                value={code}
                className="cursor-pointer hover:bg-accent focus:bg-accent"
              >
                <span className="font-mono text-xs mr-2">{code}</span>
                {label}
              </SelectItem>
            ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
} 