import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schemas
const createProjectSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  projectName: z.string().min(1, 'Project name is required'),
  formData: z.record(z.any()),
  userId: z.string().min(1, 'User ID is required')
})

// GET /api/projects - Get all projects for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: userId
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      projects
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: validatedData.templateId }
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        userId: validatedData.userId,
        templateId: validatedData.templateId,
        name: validatedData.projectName,
        data: validatedData.formData,
        status: 'COMPLETED',
        generatedUrl: `/generated/${Date.now()}-${validatedData.projectName.toLowerCase().replace(/\s+/g, '-')}`
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
      project
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
