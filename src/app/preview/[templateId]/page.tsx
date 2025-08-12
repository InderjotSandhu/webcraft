'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, ArrowRight, Monitor, Tablet, Smartphone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

import type { Template } from '@/types'

// Mock template data - this would come from API in real implementation
const getTemplateById = (id: string): Template | null => {
  const templates: Record<string, Template> = {
    'modern-portfolio': {
      id: 'modern-portfolio',
      name: 'Modern Portfolio',
      category: 'portfolio',
      metadata: {
        description: 'A clean, modern portfolio template perfect for developers and designers. Features a minimalist design with smooth animations and responsive layout.',
        tags: ['modern', 'minimalist', 'responsive', 'portfolio'],
        previewImage: '/templates/modern-portfolio/preview.jpg',
        features: [
          'Responsive design for all devices',
          'Smooth scroll animations',
          'Contact form integration',
          'Project showcase gallery',
          'Social media links',
          'Dark/light mode toggle'
        ],
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
            name: 'profile_image',
            label: 'Profile Photo',
            type: 'image',
            required: false,
            maxSize: '5MB'
          }
        ]
      },
      isActive: true,
      createdAt: new Date('2024-01-15')
    },
    'business-pro': {
      id: 'business-pro',
      name: 'Business Pro',
      category: 'business',
      metadata: {
        description: 'Professional business template with service pages and contact forms. Perfect for agencies, consultants, and professional services.',
        tags: ['professional', 'corporate', 'services', 'business'],
        previewImage: '/templates/business-pro/preview.jpg',
        features: [
          'Multi-page layout',
          'Service showcase',
          'Team member profiles',
          'Testimonials section',
          'Contact forms',
          'SEO optimized'
        ],
        fields: []
      },
      isActive: true,
      createdAt: new Date('2024-01-10')
    }
  }

  return templates[id] || null
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.templateId as string
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  useEffect(() => {
    const loadTemplate = async () => {
      setIsLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const templateData = getTemplateById(templateId)
      setTemplate(templateData)
      setIsLoading(false)
    }

    if (templateId) {
      loadTemplate()
    }
  }, [templateId])

  const handleUseTemplate = () => {
    if (template) {
      router.push(`/customize?template=${template.id}`)
    }
  }

  const getViewportClass = () => {
    switch (viewMode) {
      case 'mobile':
        return 'w-[375px] h-[667px]'
      case 'tablet':
        return 'w-[768px] h-[1024px]'
      default:
        return 'w-full h-[800px]'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template preview...</p>
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
                <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary">{template.category}</Badge>
                  {template.metadata.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Viewport Controls */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                  className="h-8 px-3"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tablet')}
                  className="h-8 px-3"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                  className="h-8 px-3"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={handleUseTemplate}>
                Use This Template
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Template Preview */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="flex items-center justify-center">
                <div className={`border border-gray-300 rounded-lg overflow-hidden transition-all duration-300 ${getViewportClass()}`}>
                  {/* Mock Preview - In real implementation, this would be an iframe or rendered template */}
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {template.name.charAt(0)}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {template.name}
                      </h2>
                      <p className="text-gray-600 mb-4">
                        Template Preview
                      </p>
                      <div className="flex justify-center space-x-2">
                        {template.metadata.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Template Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Description */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">About This Template</h3>
              <p className="text-gray-600 text-sm mb-4">
                {template.metadata.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Category:</span>
                  <Badge variant="secondary" className="capitalize">
                    {template.category}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-900">
                    {template.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Features */}
            {template.metadata.features && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Features Included</h3>
                <ul className="space-y-2">
                  {template.metadata.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Get Started</h3>
              <div className="space-y-3">
                <Button 
                  onClick={handleUseTemplate}
                  className="w-full"
                >
                  Use This Template
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                Customize this template with your own content, images, and branding.
              </p>
            </Card>

            {/* Related Templates */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">More {template.category} Templates</h3>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => router.push(`/gallery?category=${template.category}`)}
              >
                Browse More
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
