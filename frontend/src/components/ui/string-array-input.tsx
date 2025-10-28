"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

interface StringArrayInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  description?: string
  id?: string
  disabled?: boolean
  maxLength?: number
  validate?: (value: string) => string | null // Returns error message or null if valid
}

/**
 * Reusable component for managing arrays of strings
 * Displays input field with add button and shows current values as removable badges
 */
export function StringArrayInput({
  value = [],
  onChange,
  placeholder = 'Add item...',
  label,
  description,
  id,
  disabled = false,
  maxLength,
  validate
}: StringArrayInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmedValue = inputValue.trim()
    
    if (!trimmedValue) {
      return
    }

    // Check for duplicates
    if (value.some(item => item.toLowerCase() === trimmedValue.toLowerCase())) {
      setError('This item already exists')
      return
    }

    // Run custom validation if provided
    if (validate) {
      const validationError = validate(trimmedValue)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Check max length
    if (maxLength && trimmedValue.length > maxLength) {
      setError(`Maximum length is ${maxLength} characters`)
      return
    }

    // Add the item
    onChange([...value, trimmedValue])
    setInputValue('')
    setError(null)
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label}
        </Label>
      )}
      
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}

      {/* Input field with Add button */}
      <div className="flex gap-2">
        <Input
          id={id}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError(null) // Clear error when user types
          }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAdd}
          size="icon"
          variant="outline"
          disabled={disabled || !inputValue.trim()}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Display current values as badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((item, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="hover:shadow-sm transition-shadow"
            >
              {item}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${item}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

