'use client'

import React, { useState, useEffect } from 'react'
import { Plus, X, GripVertical, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import type { TemplateField } from '@/types'

interface AdvancedFormBuilderProps {
  fields: TemplateField[]
  formData: Record<string, any>
  onChange: (fieldName: string, value: any) => void
  onPreview?: () => void
  errors?: Record<string, string>
}

export default function AdvancedFormBuilder({
  fields,
  formData,
  onChange,
  onPreview,
  errors = {}
}: AdvancedFormBuilderProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Calculate validation status for each field
    const status: Record<string, boolean> = {}
    fields.forEach(field => {
      if (field.required) {
        status[field.name] = !!(formData[field.name] && String(formData[field.name]).trim())
      } else {
        status[field.name] = true // Optional fields are always valid
      }
    })
    setValidationStatus(status)
  }, [fields, formData])

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  const handleArrayFieldAdd = (fieldName: string) => {
    const currentValue = formData[fieldName] || []
    onChange(fieldName, [...currentValue, ''])
  }

  const handleArrayFieldRemove = (fieldName: string, index: number) => {
    const currentValue = formData[fieldName] || []
    const newValue = currentValue.filter((_: any, i: number) => i !== index)
    onChange(fieldName, newValue)
  }

  const handleArrayFieldChange = (fieldName: string, index: number, value: string) => {
    const currentValue = formData[fieldName] || []
    const newValue = [...currentValue]
    newValue[index] = value
    onChange(fieldName, newValue)
  }

  const renderFieldInput = (field: TemplateField) => {
    const value = formData[field.name] || (field.type === 'array' ? [] : '')
    const error = errors[field.name]
    const isValid = validationStatus[field.name]

    const baseInputProps = {
      id: field.name,
      placeholder: field.placeholder,
      className: `transition-colors ${
        error 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : isValid 
            ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
      }`
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...baseInputProps}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            rows={4}
          />
        )

      case 'select':
        return (
          <select
            {...baseInputProps}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`w-full rounded-md ${baseInputProps.className}`}
          >
            <option value="">Select an option...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'number':
        return (
          <Input
            {...baseInputProps}
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, Number(e.target.value))}
          />
        )

      case 'image':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // In real implementation, this would upload the file and return URL
                  const reader = new FileReader()
                  reader.onload = (e) => {
                    onChange(field.name, e.target?.result as string)
                  }
                  reader.readAsDataURL(file)
                }
              }}
              className={baseInputProps.className}
            />
            {field.maxSize && (
              <p className="text-xs text-gray-500">Max file size: {field.maxSize}</p>
            )}
            {value && typeof value === 'string' && value.startsWith('data:') && (
              <div className="mt-2">
                <img
                  src={value}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded-md border"
                />
              </div>
            )}
          </div>
        )

      case 'array':
        const arrayValue = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {arrayValue.map((item: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <Input
                  value={item}
                  onChange={(e) => handleArrayFieldChange(field.name, index, e.target.value)}
                  placeholder={`${field.label} ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleArrayFieldRemove(field.name, index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleArrayFieldAdd(field.name)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {field.label}
            </Button>
            {field.maxItems && (
              <p className="text-xs text-gray-500">
                {arrayValue.length} / {field.maxItems} items
              </p>
            )}
          </div>
        )

      default:
        return (
          <Input
            {...baseInputProps}
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        )
    }
  }

  // Group fields by category if they have one
  const groupedFields = fields.reduce((acc, field) => {
    const category = (field as any).category || 'General'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(field)
    return acc
  }, {} as Record<string, TemplateField[]>)

  const requiredFieldsCount = fields.filter(f => f.required).length
  const completedRequiredFields = fields.filter(f => f.required && validationStatus[f.name]).length
  const progressPercentage = requiredFieldsCount > 0 ? (completedRequiredFields / requiredFieldsCount) * 100 : 100

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Form Progress</h3>
          <span className="text-sm text-gray-600">
            {completedRequiredFields} / {requiredFieldsCount} required fields
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {progressPercentage === 100 && (
          <div className="mt-2 flex items-center text-green-600 text-sm">
            <div className="w-4 h-4 rounded-full bg-green-600 mr-2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            All required fields completed!
          </div>
        )}
      </Card>

      {/* Form fields grouped by category */}
      {Object.entries(groupedFields).map(([category, categoryFields]) => (
        <Card key={category} className="overflow-hidden">
          <div
            className="p-4 bg-gray-50 border-b cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection(category)}
          >
            <div className="flex items-center space-x-3">
              <h3 className="font-medium text-gray-900">{category}</h3>
              <Badge variant="secondary" className="text-xs">
                {categoryFields.length} field{categoryFields.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {expandedSections.has(category) ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>

          {(expandedSections.has(category) || expandedSections.size === 0) && (
            <div className="p-6 space-y-6">
              {categoryFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <div className="flex items-center space-x-2">
                      {validationStatus[field.name] ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      ) : field.required ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>

                  {renderFieldInput(field)}

                  {errors[field.name] && (
                    <p className="text-sm text-red-600">{errors[field.name]}</p>
                  )}

                  {(field as any).description && (
                    <p className="text-xs text-gray-500">{(field as any).description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Preview button */}
      {onPreview && (
        <Card className="p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPreview}
            className="w-full"
            disabled={progressPercentage < 100}
          >
            <Eye className="h-4 w-4 mr-2" />
            {progressPercentage === 100 ? 'Preview Website' : 'Complete required fields to preview'}
          </Button>
        </Card>
      )}
    </div>
  )
}
