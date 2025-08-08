import { User, Template, Project, ProjectStatus } from '@prisma/client'

// Database types (re-exported from Prisma)
export type { User, Template, Project, ProjectStatus }

// Template metadata structure
export interface TemplateField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'array' | 'select' | 'number'
  required: boolean
  placeholder?: string
  options?: string[] // For select fields
  max_size?: string // For image fields
  max_items?: number // For array fields
}

export interface TemplateMetadata {
  id: string
  name: string
  category: string
  tags: string[]
  preview_image: string
  fields: TemplateField[]
  assets: {
    html: string
    css: string
    js?: string
  }
}

// Form data types
export interface ProjectFormData {
  [key: string]: string | string[] | File | null
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Template categories
export type TemplateCategory = 
  | 'portfolio'
  | 'business' 
  | 'events'
  | 'contact'
  | 'blog'
  | 'ecommerce'

// Extended types with relations
export interface ProjectWithRelations extends Project {
  user: User
  template: Template
}

export interface TemplateWithProjects extends Template {
  projects: Project[]
  _count?: {
    projects: number
  }
}

// Zustand store types
export interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void
  
  // Current project state
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  
  // UI state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  
  // Template gallery state
  templates: Template[]
  setTemplates: (templates: Template[]) => void
  selectedCategory: TemplateCategory | 'all'
  setSelectedCategory: (category: TemplateCategory | 'all') => void
}

// File upload types
export interface UploadResponse {
  url: string
  publicId: string
  format: string
  resourceType: string
}

// Generation status
export interface GenerationStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  message?: string
  downloadUrl?: string
  deployUrl?: string
}
