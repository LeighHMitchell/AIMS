'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAP_STYLES, ALL_MAP_STYLE_KEYS, type MapStyleKey } from '@/lib/map-styles';
import { cn } from '@/lib/utils';

interface MapStyleSelectProps {
  value: MapStyleKey;
  onChange: (value: MapStyleKey) => void;
  keys?: readonly MapStyleKey[];
  className?: string;
  triggerClassName?: string;
}

function CodeChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center justify-center font-mono text-[10px] leading-none bg-muted text-foreground px-1.5 py-0.5 rounded">
      {code}
    </span>
  );
}

export function MapStyleSelect({
  value,
  onChange,
  keys = ALL_MAP_STYLE_KEYS,
  className,
  triggerClassName,
}: MapStyleSelectProps) {
  const current = MAP_STYLES[value];
  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as MapStyleKey)}>
        <SelectTrigger
          className={cn(
            'w-[170px] bg-white shadow-md border-input text-xs h-9',
            triggerClassName
          )}
        >
          <SelectValue placeholder="Map style">
            <span className="flex items-center gap-2">
              <CodeChip code={current.code} />
              <span>{current.name}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {keys.map((key) => {
            const style = MAP_STYLES[key];
            return (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <CodeChip code={style.code} />
                  <span>{style.name}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
