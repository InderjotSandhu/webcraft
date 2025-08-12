import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { SessionManager, SecurityAudit } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Validation schemas
const terminateSchema = z.object({
  action: z.literal('terminate'),
  sessionId: z.string().min(1)
})

const terminateAllSchema = z.object({
  action: z.literal('terminate-all')
})

const requestSchema = z.discriminatedUnion('action', [
  terminateSchema,
  terminateAllSchema
])

// GET - Get user's active sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current session token from request
    const currentSessionToken = session.user.id // This should be the actual session token

    // Get user's active sessions
    const sessions = await SessionManager.getUserSessions(
      session.user.id,
      currentSessionToken
    )

    // Get session statistics
    const stats = await prisma.userSession.groupBy({
      by: ['device'],
      where: {
        userId: session.user.id,
        terminated: false,
        expiresAt: { gte: new Date() }
      },
      _count: true
    })

    const deviceStats = stats.reduce((acc, stat) => {
      const device = stat.device || 'unknown'
      acc[device] = stat._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        statistics: {
          total: sessions.length,
          current: sessions.filter(s => s.current).length,
          devices: deviceStats
        }
      }
    })

  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Manage user sessions (terminate, terminate all)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = requestSchema.parse(body)

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    switch (validatedData.action) {
      case 'terminate': {
        // Verify the session belongs to the user
        const userSession = await prisma.userSession.findFirst({
          where: {
            id: validatedData.sessionId,
            userId: session.user.id
          }
        })

        if (!userSession) {
          return NextResponse.json(
            { success: false, error: 'Session not found' },
            { status: 404 }
          )
        }

        // Terminate the session
        await SessionManager.terminateSession(
          validatedData.sessionId,
          session.user.id,
          'manual_user_action'
        )

        return NextResponse.json({
          success: true,
          message: 'Session terminated successfully'
        })
      }

      case 'terminate-all': {
        // Get current session token to exclude it
        const currentSessionToken = session.user.id // This should be the actual session token

        // Terminate all other sessions
        await SessionManager.terminateAllSessions(
          session.user.id,
          currentSessionToken
        )

        return NextResponse.json({
          success: true,
          message: 'All other sessions terminated successfully'
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Session management error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Terminate all sessions (alternative endpoint)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current session token to exclude it
    const currentSessionToken = session.user.id // This should be the actual session token

    // Terminate all sessions including current
    await SessionManager.terminateAllSessions(session.user.id)

    // Log the action
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    await SecurityAudit.log({
      userId: session.user.id,
      action: 'SESSION_TERMINATED',
      success: true,
      details: { reason: 'terminate_all_including_current' },
      ipAddress: ip || undefined,
      userAgent: userAgent || undefined
    })

    return NextResponse.json({
      success: true,
      message: 'All sessions terminated successfully'
    })

  } catch (error) {
    console.error('Session termination error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
