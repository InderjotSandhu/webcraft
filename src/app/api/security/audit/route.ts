import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { SecurityAudit } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Query parameter validation
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
  action: z.string().optional(),
  success: z.coerce.boolean().optional(),
  days: z.coerce.number().min(1).max(365).default(30)
})

// GET - Get user's security audit logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - query.days)

    // Build where clause
    const where: any = {
      userId: session.user.id,
      timestamp: {
        gte: dateFilter
      }
    }

    if (query.action) {
      where.action = query.action
    }

    if (query.success !== undefined) {
      where.success = query.success
    }

    // Get total count for pagination
    const totalCount = await prisma.securityAuditLog.count({ where })

    // Get paginated results
    const skip = (query.page - 1) * query.limit
    const logs = await prisma.securityAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: query.limit,
      select: {
        id: true,
        action: true,
        success: true,
        timestamp: true,
        ipAddress: true,
        userAgent: true,
        location: true,
        details: true
      }
    })

    // Parse details JSON for each log
    const processedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details as string) : null
    }))

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / query.limit)
    const hasNextPage = query.page < totalPages
    const hasPrevPage = query.page > 1

    return NextResponse.json({
      success: true,
      data: {
        logs: processedLogs,
        pagination: {
          currentPage: query.page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: query.limit
        }
      }
    })

  } catch (error) {
    console.error('Audit log fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
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

// GET security statistics and summary
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
    const { days = 30 } = body

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Get security statistics
    const [
      totalEvents,
      successfulEvents,
      failedEvents,
      loginAttempts,
      twoFactorEvents,
      suspiciousEvents,
      uniqueLocations,
      recentEvents
    ] = await Promise.all([
      // Total events
      prisma.securityAuditLog.count({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter }
        }
      }),
      
      // Successful events
      prisma.securityAuditLog.count({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter },
          success: true
        }
      }),
      
      // Failed events
      prisma.securityAuditLog.count({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter },
          success: false
        }
      }),
      
      // Login attempts
      prisma.securityAuditLog.count({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter },
          action: { in: ['LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILED'] }
        }
      }),
      
      // Two-factor authentication events
      prisma.securityAuditLog.count({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter },
          action: { 
            in: [
              'TWO_FACTOR_ENABLE',
              'TWO_FACTOR_DISABLE',
              'TWO_FACTOR_VERIFY',
              'TWO_FACTOR_BACKUP_USED'
            ] 
          }
        }
      }),
      
      // Suspicious activity events
      prisma.securityAuditLog.count({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter },
          action: 'SUSPICIOUS_ACTIVITY'
        }
      }),
      
      // Unique locations
      prisma.securityAuditLog.groupBy({
        by: ['location'],
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter },
          location: { not: null }
        }
      }),
      
      // Recent events for timeline
      prisma.securityAuditLog.findMany({
        where: {
          userId: session.user.id,
          timestamp: { gte: dateFilter }
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          action: true,
          success: true,
          timestamp: true,
          location: true,
          details: true
        }
      })
    ])

    // Group events by day for chart data
    const eventsByDay = await prisma.securityAuditLog.groupBy({
      by: ['timestamp'],
      where: {
        userId: session.user.id,
        timestamp: { gte: dateFilter }
      },
      _count: true
    })

    // Process chart data
    const chartData = eventsByDay.reduce((acc, event) => {
      const day = event.timestamp.toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + event._count
      return acc
    }, {} as Record<string, number>)

    // Process recent events
    const processedRecentEvents = recentEvents.map(event => ({
      ...event,
      details: event.details ? JSON.parse(event.details as string) : null
    }))

    // Get user security info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        emailVerified: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockedUntil: true
      }
    })

    // Calculate security score
    let securityScore = 20 // Base score
    
    if (user?.emailVerified) securityScore += 20
    if (user?.twoFactorEnabled) securityScore += 30
    if (user?.failedLoginAttempts === 0) securityScore += 15
    if (user?.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceLogin <= 7) securityScore += 15
      else if (daysSinceLogin <= 30) securityScore += 10
    }

    // Generate security recommendations
    const recommendations = []
    
    if (!user?.twoFactorEnabled) {
      recommendations.push({
        id: 'enable-2fa',
        type: 'warning',
        title: 'Enable Two-Factor Authentication',
        description: 'Secure your account with 2FA to prevent unauthorized access.',
        action: 'Enable 2FA',
        actionUrl: '/settings/security'
      })
    }
    
    if (!user?.emailVerified) {
      recommendations.push({
        id: 'verify-email',
        type: 'warning',
        title: 'Verify Your Email',
        description: 'Verify your email address to secure account recovery.',
        action: 'Verify Email',
        actionUrl: '/settings/profile'
      })
    }
    
    if (failedEvents > 5) {
      recommendations.push({
        id: 'review-failed-logins',
        type: 'warning',
        title: 'Recent Failed Login Attempts',
        description: `You have ${failedEvents} failed login attempts in the last ${days} days.`,
        action: 'Review Activity',
        actionUrl: '/settings/security/audit'
      })
    }

    if (securityScore >= 90) {
      recommendations.push({
        id: 'excellent-security',
        type: 'success',
        title: 'Excellent Security',
        description: 'Your account security is excellent. Keep it up!',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalEvents,
          successfulEvents,
          failedEvents,
          loginAttempts,
          twoFactorEvents,
          suspiciousEvents,
          uniqueLocations: uniqueLocations.length,
          securityScore: Math.min(100, securityScore)
        },
        chartData,
        recentEvents: processedRecentEvents,
        recommendations,
        dateRange: {
          from: dateFilter.toISOString(),
          to: new Date().toISOString(),
          days
        }
      }
    })

  } catch (error) {
    console.error('Security statistics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
