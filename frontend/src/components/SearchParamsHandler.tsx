"use client"

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface SearchParamsHandlerProps {
  onImportParam: (value: boolean) => void;
}

export function SearchParamsHandler({ onImportParam }: SearchParamsHandlerProps) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const importParam = searchParams.get('import');
    if (importParam === 'true') {
      onImportParam(true);
    }
  }, [searchParams, onImportParam]);
  
  return null;
} 