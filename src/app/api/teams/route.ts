import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name must be 50 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  settings: z.object({
    allowMemberInvites: z.boolean().default(true),
    defaultMemberRole: z.enum(['MEMBER', 'VIEWER']).default('MEMBER'),
    projectVisibility: z.enum(['private', 'team', 'public']).default('team'),
    notifications: z.object({
      newMembers: z.boolean().default(true),
      projectUpdates: z.boolean().default(true),
      mentions: z.boolean().default(true),
    }).default({})
  }).optional()
})

// Helper function to generate unique slug
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.team.findUnique({
      where: { slug }
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

// GET /api/teams - Get user's teams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get teams where user is owner or member
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        invitations: {
          where: {
            status: 'PENDING'
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: teams
    })

  } catch (error) {
    console.error('Teams GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createTeamSchema.parse(body)

    const userId = session.user.id
    const slug = await generateUniqueSlug(validatedData.name)

    // Create team with owner as first member
    const team = await prisma.team.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        slug,
        ownerId: userId,
        settings: validatedData.settings || {},
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        },
        activities: {
          create: {
            userId,
            action: 'TEAM_CREATED',
            entityType: 'team',
            metadata: {
              teamName: validatedData.name
            }
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Teams POST error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
