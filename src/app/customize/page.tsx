'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Save, Eye, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import type { ExtendedTemplate, TemplateField } from '@/types'

// Mock template data - same as preview page
const getTemplateById = (id: string): ExtendedTemplate | null => {
  const templates: Record<string, ExtendedTemplate> = {
    'modern-portfolio': {
      id: 'modern-portfolio',
      name: 'Modern Portfolio',
      category: 'portfolio',
      metadata: {
        description: 'A clean, modern portfolio template perfect for developers and designers',
        tags: ['modern', 'minimalist', 'responsive'],
        previewImage: '/templates/modern-portfolio/preview.jpg',
        fields: [
          {
            name: 'full_name',
            label: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'John Doe'
          },
          {
            name: 'tagline',
            label: 'Professional Tagline',
            type: 'text',
            required: true,
            placeholder: 'Full Stack Developer & Designer'
          },
          {
            name: 'bio',
            label: 'About Me',
            type: 'textarea',
            required: true,
            placeholder: 'Tell us about yourself...'
          },
          {
            name: 'profile_image',
            label: 'Profile Photo',
            type: 'image',
            required: false,
            maxSize: '5MB'
          },
          {
            name: 'email',
            label: 'Email Address',
            type: 'text',
            required: true,
            placeholder: 'john@example.com'
          },
          {
            name: 'phone',
            label: 'Phone Number',
            type: 'text',
            required: false,
            placeholder: '+1 (555) 123-4567'
          },
          {
            name: 'skills',
            label: 'Skills (comma-separated)',
            type: 'text',
            required: false,
            placeholder: 'JavaScript, React, Node.js, Python'
          }
        ]
      },
      isActive: true,
      createdAt: new Date('2024-01-15')
    }
  }

  return templates[id] || null
}

function CustomizePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const templateId = searchParams.get('template')
  const editProjectId = searchParams.get('edit')
  const { user } = useAppStore()

  const [template, setTemplate] = useState<ExtendedTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>('')
  const [existingProject, setExistingProject] = useState<any>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) {
        router.push('/gallery')
        return
      }

      setIsLoading(true)
      setIsEditMode(!!editProjectId)
      
      try {
        // Load existing project data if editing
        if (editProjectId && user) {
          const projectResponse = await fetch(`/api/projects/${editProjectId}`)
          if (projectResponse.ok) {
            const projectResult = await projectResponse.json()
            if (projectResult.success) {
              setExistingProject(projectResult.project)
              // Set template ID from project if not provided in URL
              const projectTemplateId = projectResult.project.template.id
              if (templateId !== projectTemplateId) {
                // Update URL to reflect correct template
                const newUrl = `/customize?template=${projectTemplateId}&edit=${editProjectId}`
                window.history.replaceState({}, '', newUrl)
              }
            }
          }
        }
        
        // Simulate API call for template loading
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const templateData = getTemplateById(templateId)
        if (!templateData) {
          router.push('/gallery')
          return
        }

        setTemplate(templateData)
        
        // Initialize form data
        const initialData: Record<string, string> = {}
        templateData.metadata.fields.forEach(field => {
          // Use existing project data if available, otherwise empty values
          if (existingProject && existingProject.data && existingProject.data[field.name]) {
            initialData[field.name] = existingProject.data[field.name]
          } else {
            initialData[field.name] = ''
          }
        })
        setFormData(initialData)
      } catch (error) {
        console.error('Error loading template/project:', error)
        setError('Failed to load project data')
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplate()
  }, [templateId, editProjectId, user, router, existingProject])

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    if (!template) return false

    const newErrors: Record<string, string> = {}

    template.metadata.fields.forEach(field => {
      if (field.required && (!formData[field.name] || formData[field.name].trim() === '')) {
        newErrors[field.name] = `${field.label} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePreview = () => {
    // In real implementation, this would generate a preview with the form data
    window.open(`/preview/${template?.id}`, '_blank')
  }

  const handleSave = async () => {
    if (!validateForm()) return

    // Check if user is authenticated
    if (!user) {
      router.push('/login')
      return
    }

    setIsSaving(true)
    try {
      if (isEditMode && existingProject) {
        // Update existing project
        const response = await fetch(`/api/projects/${existingProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${template?.name} - ${formData.full_name || 'Untitled'}`,
            data: formData,
            regenerate: true, // Trigger website regeneration
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update project')
        }

        if (result.success) {
          // Redirect to dashboard with success message
          const params = new URLSearchParams({
            success: 'true',
            projectId: result.project.id,
            projectName: result.project.name,
            siteUrl: result.project.generatedUrl,
            action: 'updated'
          })
          
          router.push(`/dashboard?${params.toString()}`)
        }
      } else {
        // Create new project
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: template?.id,
            projectName: `${template?.name} - ${formData.full_name || 'Untitled'}`,
            formData,
            userId: user.id,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate website')
        }

        if (result.success) {
          // Store the generated project info
          const project = {
            ...result.project,
            templateName: template?.name,
          }
          
          // Redirect to success page with project info
          const params = new URLSearchParams({
            success: 'true',
            projectId: project.id,
            projectName: project.name,
            siteUrl: project.generatedUrl,
            action: 'created'
          })
          
          router.push(`/dashboard?${params.toString()}`)
        }
      }
    } catch (error) {
      console.error('Error saving project:', error)
      setError(error instanceof Error ? error.message : 'Failed to save project. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || ''
    const error = errors[field.name]

    const commonProps = {
      id: field.name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleFieldChange(field.name, e.target.value),
      placeholder: field.placeholder,
      className: error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={4}
          />
        )
      
      case 'image':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                // In real implementation, this would handle file upload
                const file = e.target.files?.[0]
                if (file) {
                  handleFieldChange(field.name, `uploaded_${file.name}`)
                }
              }}
              className={error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
            />
            {field.maxSize && (
              <p className="text-xs text-gray-500">Max file size: {field.maxSize}</p>
            )}
          </div>
        )
      
      default:
        return (
          <Input
            {...commonProps}
            type="text"
          />
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Template Not Found</h1>
          <p className="text-gray-600 mb-4">The requested template could not be found.</p>
          <Button onClick={() => router.push('/gallery')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gallery
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => router.back()}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit' : 'Customize'} {template.name}
                  {isEditMode && existingProject && (
                    <span className="text-sm font-normal text-blue-600 ml-2">
                      (Editing: {existingProject.name})
                    </span>
                  )}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary">{template.category}</Badge>
                  {isEditMode && <Badge variant="outline">Editing</Badge>}
                  <span className="text-sm text-gray-500">
                    {isEditMode 
                      ? 'Update the form fields to modify your website'
                      : 'Fill out the form to personalize your website'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>

              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditMode ? 'Updating Website...' : 'Creating Website...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Update Website' : 'Create Website'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Customize Your Content
                </h2>
                <p className="text-gray-600 text-sm">
                  Fill out the fields below to personalize your website. Required fields are marked with an asterisk.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form className="space-y-6">
                {template.metadata.fields.map(field => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {renderField(field)}
                    
                    {errors[field.name] && (
                      <p className="text-sm text-red-600">{errors[field.name]}</p>
                    )}
                  </div>
                ))}

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handlePreview}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Website
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Preview/Info */}
          <div className="space-y-6">
            {/* Template Info */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">About This Template</h3>
              <p className="text-gray-600 text-sm mb-4">
                {template.metadata.description}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {template.metadata.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Preview Placeholder */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Live Preview</h3>
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {template.name.charAt(0)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Preview will update as you fill the form
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handlePreview}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Full Preview
                  </Button>
                </div>
              </div>
            </Card>

            {/* Progress */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Required Fields</span>
                  <span className="text-gray-900">
                    {template.metadata.fields.filter(f => f.required && formData[f.name]?.trim()).length} / {template.metadata.fields.filter(f => f.required).length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(template.metadata.fields.filter(f => f.required && formData[f.name]?.trim()).length / template.metadata.fields.filter(f => f.required).length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CustomizePageContent />
    </Suspense>
  )
}
