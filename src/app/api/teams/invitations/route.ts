import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Validation schemas
const inviteUserSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
  message: z.string().max(500, 'Message must be 500 characters or less').optional()
})

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required')
})

// Helper function to generate secure invitation token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Helper function to check if user has permission to invite
async function canUserInvite(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    },
    include: {
      team: {
        select: {
          settings: true
        }
      }
    }
  })

  if (!membership) return false

  // Owner and Admin can always invite
  if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
    return true
  }

  // Check team settings for member invites
  const settings = membership.team.settings as any
  return settings?.allowMemberInvites === true && membership.role === 'MEMBER'
}

// POST /api/teams/invitations - Send team invitation
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
    const validatedData = inviteUserSchema.parse(body)
    const userId = session.user.id

    // Check if user has permission to invite
    const canInvite = await canUserInvite(userId, validatedData.teamId)
    if (!canInvite) {
      return NextResponse.json(
        { error: 'You do not have permission to invite users to this team' },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: validatedData.teamId,
        user: {
          email: validatedData.email
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId: validatedData.teamId,
        email: validatedData.email,
        status: 'PENDING'
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      )
    }

    // Find or create receiver user
    const receiver = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    // Generate invitation token and set expiration (7 days)
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: validatedData.teamId,
        email: validatedData.email,
        role: validatedData.role,
        token,
        senderId: userId,
        receiverId: receiver?.id,
        expiresAt,
        status: 'PENDING'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Create team activity
    await prisma.teamActivity.create({
      data: {
        teamId: validatedData.teamId,
        userId,
        action: 'MEMBER_INVITED',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: {
          invitedEmail: validatedData.email,
          role: validatedData.role
        }
      }
    })

    // TODO: Send invitation email
    // await sendInvitationEmail(invitation)

    return NextResponse.json({
      success: true,
      data: invitation,
      message: 'Invitation sent successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Team invitation error:', error)

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

// GET /api/teams/invitations - Get user's pending invitations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        email: userEmail,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: invitations
    })

  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/teams/invitations - Accept/reject invitation
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token } = acceptInvitationSchema.parse(body)
    const { action } = body // 'accept' or 'reject'
    
    const userId = session.user.id
    const userEmail = session.user.email

    // Find the invitation
    const invitation = await prisma.teamInvitation.findFirst({
      where: {
        token,
        email: userEmail,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    if (action === 'accept') {
      // Accept invitation - create team member and update invitation
      await prisma.$transaction([
        // Create team member
        prisma.teamMember.create({
          data: {
            teamId: invitation.teamId,
            userId,
            role: invitation.role
          }
        }),
        // Update invitation status
        prisma.teamInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            receiverId: userId
          }
        }),
        // Create team activity
        prisma.teamActivity.create({
          data: {
            teamId: invitation.teamId,
            userId,
            action: 'MEMBER_JOINED',
            entityType: 'user',
            entityId: userId,
            metadata: {
              role: invitation.role,
              invitationId: invitation.id
            }
          }
        })
      ])

      return NextResponse.json({
        success: true,
        message: 'Invitation accepted successfully'
      })
    } else if (action === 'reject') {
      // Reject invitation
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'REJECTED',
          receiverId: userId
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Invitation rejected'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "accept" or "reject"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Handle invitation error:', error)

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
