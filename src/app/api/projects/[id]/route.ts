import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'

// Validation schemas
const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  data: z.record(z.any()).optional(),
})

const duplicateProjectSchema = z.object({
  name: z.string().min(1, 'New project name is required').max(100),
  userId: z.string().min(1, 'User ID is required')
})

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            previewImage: true,
            metadata: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project
    })

  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // Check if project exists and get current data
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        template: true
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Update project in database
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: validatedData.name,
        data: validatedData.data || existingProject.data,
        updatedAt: new Date()
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            previewImage: true
          }
        }
      }
    })

    // If data was updated, regenerate the website
    if (validatedData.data) {
      try {
        // TODO: Implement website regeneration logic
        // This would use the template engine to regenerate the website with new data
        console.log('Website regeneration needed for project:', projectId)
      } catch (regenerationError) {
        console.error('Website regeneration failed:', regenerationError)
        // Continue even if regeneration fails
      }
    }

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Project updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Get project details before deletion
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project from database
    await prisma.project.delete({
      where: { id: projectId }
    })

    // Clean up generated files
    if (project.generatedUrl) {
      try {
        // Extract project folder from URL
        const urlParts = project.generatedUrl.split('/')
        const projectFolder = urlParts[urlParts.length - 2] // Get folder name
        const generatedPath = path.join(process.cwd(), 'generated', projectFolder)
        
        // Remove the entire project directory
        await fs.rm(generatedPath, { recursive: true, force: true })
        console.log('Cleaned up generated files for project:', projectId)
      } catch (cleanupError) {
        console.error('Error cleaning up generated files:', cleanupError)
        // Continue even if cleanup fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/duplicate - Duplicate a project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await request.json()
    
    // Handle different POST actions based on request body
    if (body.action === 'duplicate') {
      const validatedData = duplicateProjectSchema.parse(body)

      // Get the original project
      const originalProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          template: true
        }
      })

      if (!originalProject) {
        return NextResponse.json(
          { success: false, error: 'Original project not found' },
          { status: 404 }
        )
      }

      // Create duplicate project
      const duplicatedProject = await prisma.project.create({
        data: {
          userId: validatedData.userId,
          templateId: originalProject.templateId,
          name: validatedData.name,
          data: originalProject.data,
          status: 'DRAFT' // Start as draft for duplicated projects
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
              previewImage: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        project: duplicatedProject,
        message: 'Project duplicated successfully'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in project POST operation:', error)
    return NextResponse.json(
      { success: false, error: 'Operation failed' },
      { status: 500 }
    )
  }
}
