'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Eye, ArrowRight, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'

import type { ExtendedTemplate, TemplateCategory } from '@/types'

// Mock template data - this will be replaced with API call
const mockTemplates: ExtendedTemplate[] = [
  {
    id: 'modern-portfolio',
    name: 'Modern Portfolio',
    category: 'portfolio',
    metadata: {
      description: 'A clean, modern portfolio template perfect for developers and designers',
      tags: ['modern', 'minimalist', 'responsive'],
      previewImage: '/templates/modern-portfolio/preview.jpg',
      fields: []
    },
    isActive: true,
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'business-pro',
    name: 'Business Pro',
    category: 'business',
    metadata: {
      description: 'Professional business template with service pages and contact forms',
      tags: ['professional', 'corporate', 'services'],
      previewImage: '/templates/business-pro/preview.jpg',
      fields: []
    },
    isActive: true,
    createdAt: new Date('2024-01-10')
  },
  {
    id: 'event-landing',
    name: 'Event Landing',
    category: 'events',
    metadata: {
      description: 'Perfect for conferences, workshops, and special events',
      tags: ['events', 'landing', 'registration'],
      previewImage: '/templates/event-landing/preview.jpg',
      fields: []
    },
    isActive: true,
    createdAt: new Date('2024-01-05')
  },
  {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    category: 'portfolio',
    metadata: {
      description: 'Bold and creative portfolio for artists and creative professionals',
      tags: ['creative', 'artistic', 'bold'],
      previewImage: '/templates/creative-portfolio/preview.jpg',
      fields: []
    },
    isActive: true,
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'startup-landing',
    name: 'Startup Landing',
    category: 'business',
    metadata: {
      description: 'Modern landing page template perfect for startups and SaaS products',
      tags: ['startup', 'saas', 'landing'],
      previewImage: '/templates/startup-landing/preview.jpg',
      fields: []
    },
    isActive: true,
    createdAt: new Date('2024-01-25')
  },
  {
    id: 'contact-simple',
    name: 'Simple Contact',
    category: 'contact',
    metadata: {
      description: 'Clean and simple contact page template',
      tags: ['contact', 'simple', 'form'],
      previewImage: '/templates/contact-simple/preview.jpg',
      fields: []
    },
    isActive: true,
    createdAt: new Date('2024-01-12')
  }
]

const categories: { value: TemplateCategory | 'all', label: string }[] = [
  { value: 'all', label: 'All Templates' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'business', label: 'Business' },
  { value: 'events', label: 'Events' },
  { value: 'contact', label: 'Contact' }
]

export default function GalleryPage() {
  const { templates, setTemplates, selectedCategory, setSelectedCategory } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest')
  const [isLoading, setIsLoading] = useState(true)

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTemplates(mockTemplates)
      setIsLoading(false)
    }
    
    loadTemplates()
  }, [setTemplates])

  // Filter templates based on category and search
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'popular':
        // Mock popularity sorting - in real app, this would be based on usage stats
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  const handleTemplateSelect = (template: ExtendedTemplate) => {
    // Navigate to customization page
    window.location.href = `/customize?template=${template.id}`
  }

  const handlePreview = (template: ExtendedTemplate) => {
    // Open preview in new tab
    window.open(`/preview/${template.id}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Template
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start with a professionally designed template and customize it to match your vision
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select 
                value={selectedCategory} 
                onValueChange={(value) => setSelectedCategory(value as TemplateCategory | 'all')}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select 
                value={sortBy} 
                onValueChange={(value) => setSortBy(value as 'newest' | 'oldest' | 'popular')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </Card>
            ))}
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {sortedTemplates.length} template{sortedTemplates.length !== 1 ? 's' : ''} found
                {selectedCategory !== 'all' && (
                  <> in <span className="capitalize font-medium">{selectedCategory}</span></>
                )}
              </p>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="group hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Preview Image */}
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
                    {template.metadata.previewImage ? (
                      <img 
                        src={template.metadata.previewImage} 
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to gradient background if image fails to load
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/90 hover:bg-white"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        Use Template
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Category Badge */}
                    <Badge 
                      variant="secondary" 
                      className="absolute top-3 left-3 bg-white/90 text-gray-800"
                    >
                      {template.category}
                    </Badge>
                  </div>

                  {/* Template Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h3>
                      {template.name.includes('Pro') && (
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {template.metadata.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.metadata.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
