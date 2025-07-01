import * as React from "react"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOutsideClick } from "@/hooks/useOutsideClick"

interface SelectWithOutsideClickProps {
  value?: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SelectWithOutsideClick({
  value,
  onValueChange,
  children,
  placeholder,
  className,
  disabled
}: SelectWithOutsideClickProps) {
  const [open, setOpen] = React.useState(false)
  const dropdownRef = useOutsideClick(() => setOpen(false), open)

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue)
    setOpen(false)
  }

  return (
    <div ref={dropdownRef}>
      <Select 
        open={open} 
        onOpenChange={setOpen}
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </div>
  )
} 