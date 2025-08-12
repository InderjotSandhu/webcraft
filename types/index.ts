import { 
  User, Template, Project, ProjectStatus,
  Team, TeamMember, TeamInvitation, TeamActivity,
  TeamRole, InvitationStatus, ActivityType,
  // Security models
  TwoFactorToken, SecurityAuditLog, UserSession,
  SecurityAction, TokenType,
  // Marketplace models
  TemplateReview, TemplatePurchase, TemplateFavorite, PurchaseStatus,
  // Performance monitoring models
  PerformanceMetric, ErrorLog, UptimeCheck,
  MetricType, MetricStatus, ErrorLevel, UptimeStatus
} from '@prisma/client'

// Database types (re-exported from Prisma)
export type { 
  User, Template, Project, ProjectStatus,
  Team, TeamMember, TeamInvitation, TeamActivity,
  TeamRole, InvitationStatus, ActivityType,
  // Security types
  TwoFactorToken, SecurityAuditLog, UserSession,
  SecurityAction, TokenType
}

// Template metadata structure
export interface TemplateField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'array' | 'select' | 'number'
  required: boolean
  placeholder?: string
  options?: string[] // For select fields
  maxSize?: string // For image fields
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

// Extended Template interface for frontend use
export interface ExtendedTemplate extends Omit<Template, 'metadata'> {
  metadata: {
    description: string
    tags: string[]
    previewImage?: string
    features?: string[]
    fields: TemplateField[]
  }
}

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
  templates: ExtendedTemplate[]
  setTemplates: (templates: ExtendedTemplate[]) => void
  selectedCategory: TemplateCategory | 'all'
  setSelectedCategory: (category: TemplateCategory | 'all') => void
  
  // Projects state
  projects: ProjectWithRelations[]
  setProjects: (projects: ProjectWithRelations[]) => void
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

// Team Collaboration Extended Types
export interface TeamWithRelations extends Team {
  owner: User
  members: (TeamMember & { user: User })[]
  invitations: TeamInvitation[]
  activities: (TeamActivity & { user: User })[]
  _count?: {
    members: number
    projects: number
  }
}

export interface TeamMemberWithUser extends TeamMember {
  user: User
}

export interface TeamInvitationWithRelations extends TeamInvitation {
  team: Team
  sender: User
  receiver?: User
}

export interface TeamActivityWithUser extends TeamActivity {
  user: User
}

// Team Settings Interface
export interface TeamSettings {
  allowMemberInvites: boolean
  defaultMemberRole: TeamRole
  projectVisibility: 'private' | 'team' | 'public'
  notifications: {
    newMembers: boolean
    projectUpdates: boolean
    mentions: boolean
  }
}

// Team Creation/Update Form Data
export interface TeamFormData {
  name: string
  description?: string
  settings?: Partial<TeamSettings>
}

// Team Invitation Form Data
export interface TeamInvitationFormData {
  email: string
  role: TeamRole
  message?: string
}

// Team Statistics
export interface TeamStats {
  totalMembers: number
  totalProjects: number
  recentActivity: number
  storageUsed: number
  storageLimit: number
}

// Advanced Security Types
export interface ExtendedUser extends User {
  projects?: Project[]
  accounts?: any[]
  ownedTeams?: TeamWithRelations[]
  teamMemberships?: TeamMemberWithUser[]
  auditLogs?: SecurityAuditLogWithDetails[]
  userSessions?: UserSessionWithDetails[]
  twoFactorTokens?: TwoFactorToken[]
}

export interface SecurityAuditLogWithDetails extends SecurityAuditLog {
  user?: User
}

export interface UserSessionWithDetails extends UserSession {
  user?: User
}

// Security Setup and Management
export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
  manualEntryKey: string
}

export interface SessionInfo {
  id: string
  device?: string
  browser?: string
  os?: string
  location?: string
  ipAddress?: string
  lastActive: Date
  current: boolean
  terminated: boolean
}

export interface SecurityEvent {
  action: SecurityAction
  timestamp: Date
  success: boolean
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  location?: string
}

// Security Settings Form Data
export interface SecuritySettingsFormData {
  twoFactorEnabled: boolean
  sessionTimeout: number
  securityNotifications: boolean
  loginNotifications: boolean
}

// Two-Factor Authentication Form Data
export interface TwoFactorFormData {
  totpCode: string
  backupCode?: string
}

// Security Dashboard Data
export interface SecurityDashboard {
  recentActivity: SecurityAuditLogWithDetails[]
  activeSessions: SessionInfo[]
  securityScore: number
  recommendations: SecurityRecommendation[]
}

export interface SecurityRecommendation {
  id: string
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  action?: string
  actionUrl?: string
}

// Template Marketplace Types
export type { 
  TemplateReview, TemplatePurchase, TemplateFavorite, PurchaseStatus
}

export interface TemplateWithMarketplaceData extends Template {
  author?: User
  reviews: TemplateReview[]
  purchases: TemplatePurchase[]
  favorites: TemplateFavorite[]
  _count?: {
    reviews: number
    purchases: number
    favorites: number
    projects: number
  }
}

export interface TemplateReviewWithUser extends TemplateReview {
  user: User
}

export interface MarketplaceTemplate extends Template {
  author: User
  reviews: TemplateReviewWithUser[]
  _count: {
    reviews: number
    purchases: number
    favorites: number
  }
}

// Template Review Form Data
export interface TemplateReviewFormData {
  rating: number
  comment?: string
  isPublic: boolean
}

// Template Publishing Form Data
export interface TemplatePublishFormData {
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  isPremium: boolean
  price?: number
  license: string
}

// Marketplace Statistics
export interface MarketplaceStats {
  totalTemplates: number
  freeTemplates: number
  premiumTemplates: number
  totalDownloads: number
  totalRevenue: number
  avgRating: number
  topCategories: { category: string; count: number }[]
  recentPurchases: TemplatePurchase[]
}

// Performance Monitoring Types
export type { 
  PerformanceMetric, ErrorLog, UptimeCheck,
  MetricType, MetricStatus, ErrorLevel, UptimeStatus
}

export interface ProjectWithPerformance extends Project {
  performanceMetrics: PerformanceMetric[]
  errorLogs: ErrorLog[]
  uptimeChecks: UptimeCheck[]
}

export interface PerformanceReport {
  projectId: string
  projectName: string
  url: string
  overallScore: number
  metrics: {
    performanceScore: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
    timeToInteractive: number
    speedIndex: number
  }
  status: 'healthy' | 'warning' | 'critical'
  uptime: {
    percentage: number
    incidents: number
    avgResponseTime: number
  }
  errors: {
    total: number
    resolved: number
    unresolved: number
    byLevel: Record<ErrorLevel, number>
  }
  recommendations: PerformanceRecommendation[]
  timestamp: Date
}

export interface PerformanceRecommendation {
  id: string
  type: 'performance' | 'seo' | 'accessibility' | 'best-practices'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  impact: string
  solution: string
  resources?: string[]
}

// Monitoring Dashboard Data
export interface MonitoringDashboard {
  projects: ProjectWithPerformance[]
  overallHealth: {
    healthy: number
    warning: number
    critical: number
  }
  performance: {
    avgScore: number
    trend: 'up' | 'down' | 'stable'
    slowestPages: { url: string; score: number }[]
  }
  uptime: {
    avgUptime: number
    incidents: number
    avgResponseTime: number
  }
  errors: {
    total: number
    recent: ErrorLog[]
    topErrors: { message: string; count: number }[]
  }
}

// Performance Configuration
export interface PerformanceConfig {
  projectId: string
  url: string
  checkInterval: number // minutes
  thresholds: {
    performanceScore: number
    responseTime: number
    uptime: number
  }
  notifications: {
    email: boolean
    slack: boolean
    webhook?: string
  }
  enabled: boolean
}

// Error Reporting
export interface ErrorReport {
  message: string
  stack?: string
  url?: string
  userAgent?: string
  userId?: string
  projectId?: string
  level: ErrorLevel
  metadata?: Record<string, any>
  timestamp: Date
}

// Lighthouse Audit Result
export interface LighthouseAudit {
  url: string
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  metrics: {
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
    timeToInteractive: number
    speedIndex: number
  }
  opportunities: Array<{
    id: string
    title: string
    description: string
    impact: 'low' | 'medium' | 'high'
    savings: number
  }>
  timestamp: Date
}
