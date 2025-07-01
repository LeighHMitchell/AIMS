// DAC Sector Types
export interface DAC5Sector {
  dac5_code: string;
  dac5_name: string;
  dac3_code: string;
  dac3_name: string;
  dac3_parent_code?: string;
  dac3_parent_name?: string;
  keywords?: string[];
}

export interface SectorAllocation {
  id?: string;
  dac5_code: string;
  dac5_name: string;
  dac3_code: string;
  dac3_name: string;
  percentage: number;
}

export interface SectorGroup {
  dac3_code: string;
  dac3_name: string;
  allocations: SectorAllocation[];
  totalPercentage: number;
}

export interface SectorValidation {
  isValid: boolean;
  totalPercentage: number;
  remainingPercentage: number;
  errors: string[];
} 