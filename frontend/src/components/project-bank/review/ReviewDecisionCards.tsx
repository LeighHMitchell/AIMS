"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DecisionOption } from "./types"

interface ReviewDecisionCardsProps {
  options: DecisionOption[]
  selected: string
  onSelect: (value: string) => void
  recommendedValue?: string | null
}

export function ReviewDecisionCards({ options, selected, onSelect, recommendedValue }: ReviewDecisionCardsProps) {
  return (
    <div className="flex items-center gap-4">
      {options.map(opt => {
        const isSelected = selected === opt.value
        const isRecommended = recommendedValue === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "relative flex flex-col justify-end w-[180px] h-[160px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden",
              isSelected
                ? "ring-border bg-primary/5"
                : "ring-border bg-background hover:bg-muted/50"
            )}
          >
            <Image src={opt.image} alt={opt.alt} fill className="object-cover opacity-15" />

            {isRecommended && !isSelected && (
              <div className="absolute top-2 right-2 z-10">
                <span className="text-[9px] bg-[#5f7f7a]/10 text-[#5f7f7a] px-1.5 py-0.5 rounded font-semibold">
                  Recommended
                </span>
              </div>
            )}

            {isSelected && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            <div className="relative z-10 p-3">
              <h4 className="text-sm font-semibold">{opt.label}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
