'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Settings, User, LogOut, FolderOpen, ExternalLink, Eye, Calendar, Globe, Suspense, MoreVertical, Edit2, Copy, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import type { ProjectWithRelations } from '@/types'

function DashboardContent() {
  const { user, setUser, projects, setProjects } = useAppStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Check for success message from URL params
  useEffect(() => {
    const success = searchParams.get('success')
    const projectName = searchParams.get('projectName')
    const projectId = searchParams.get('projectId')
    const action = searchParams.get('action')
    
    if (success === 'true' && projectName) {
      setShowSuccess(true)
      
      // Set appropriate message based on action
      if (action === 'updated') {
        setSuccessMessage(`✅ Website "${projectName}" updated successfully!`)
      } else if (action === 'created') {
        setSuccessMessage(`🎉 Website "${projectName}" created successfully!`)
      } else {
        setSuccessMessage(`🎉 Website "${projectName}" saved successfully!`)
      }
      
      // Clean up URL params
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 5000)
    }
  }, [searchParams])

  // Load user projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return
      
      setIsLoadingProjects(true)
      try {
        const response = await fetch(`/api/projects?userId=${user.id}`)
        const result = await response.json()
        
        if (result.success) {
          setProjects(result.projects)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      } finally {
        setIsLoadingProjects(false)
      }
    }

    if (user) {
      loadProjects()
    }
  }, [user, setProjects])

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleLogout = () => {
    setUser(null)
    router.push('/')
  }

  const handleNewWebsite = () => {
    router.push('/gallery')
  }

  // Project management functions
  const handleEditProject = (projectId: string) => {
    // Navigate to edit/customize page
    router.push(`/customize?template=modern-portfolio&edit=${projectId}`)
  }

  const handleDuplicateProject = async (project: any) => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'duplicate',
          name: `${project.name} (Copy)`,
          userId: user.id
        })
      })

      const result = await response.json()
      if (result.success) {
        // Refresh projects list
        const projectsResponse = await fetch(`/api/projects?userId=${user.id}`)
        const projectsResult = await projectsResponse.json()
        if (projectsResult.success) {
          setProjects(projectsResult.projects)
        }
        
        setSuccessMessage(`✅ Project "${result.project.name}" duplicated successfully!`)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error duplicating project:', error)
    }
  }

  const handleDeleteProject = async (project: any) => {
    if (!user || !confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        // Remove from local state
        setProjects(projects.filter(p => p.id !== project.id))
        
        setSuccessMessage(`🗑️ Project "${project.name}" deleted successfully!`)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  if (!user) {
    return null // Don't render until auth check is complete
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
              <p className="text-gray-600">Let's build something amazing today</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Avatar className="h-8 w-8">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || 'User'} />
                ) : (
                  <div className="bg-blue-600 text-white flex items-center justify-center h-full text-sm font-medium">
                    {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                  </div>
                )}
              </Avatar>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mx-4 my-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          
          {/* Quick Actions */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleNewWebsite}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">New Website</h3>
                    <p className="text-sm text-gray-600">Start from a template</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">My Projects</h3>
                    <p className="text-sm text-gray-600">View all websites</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Profile</h3>
                    <p className="text-sm text-gray-600">Manage account</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Settings className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Settings</h3>
                    <p className="text-sm text-gray-600">Preferences</p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingProjects ? (
                // Loading state
                <>  
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : projects.length > 0 ? (
                // Projects display
                projects.slice(0, 6).map((project: any) => (
                  <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">{project.name}</h3>
                        <p className="text-sm text-gray-600">{project.template.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {project.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditProject(project.id)}
                              className="cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateProject(project)}
                              className="cursor-pointer"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteProject(project)}
                              className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {project.generatedUrl && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(project.generatedUrl, '_blank')}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(project.generatedUrl, '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                // Empty state
                <Card className="p-8 text-center col-span-full">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FolderOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-600 mb-4">Create your first website to get started</p>
                  <Button onClick={handleNewWebsite}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Website
                  </Button>
                </Card>
              )}
            </div>
          </section>

          {/* Stats Cards */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Websites</p>
                    <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Published</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Settings className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
