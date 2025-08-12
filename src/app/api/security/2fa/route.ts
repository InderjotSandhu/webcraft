import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { TwoFactorAuth, SecurityAudit } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Validation schemas
const setupSchema = z.object({
  action: z.literal('setup')
})

const enableSchema = z.object({
  action: z.literal('enable'),
  secret: z.string().min(1),
  totpCode: z.string().min(6).max(6),
  backupCodes: z.array(z.string())
})

const disableSchema = z.object({
  action: z.literal('disable'),
  totpCode: z.string().min(6).max(6).optional(),
  backupCode: z.string().optional()
}).refine(data => data.totpCode || data.backupCode, {
  message: "Either TOTP code or backup code is required"
})

const verifySchema = z.object({
  action: z.literal('verify'),
  totpCode: z.string().min(6).max(6).optional(),
  backupCode: z.string().optional()
}).refine(data => data.totpCode || data.backupCode, {
  message: "Either TOTP code or backup code is required"
})

const requestSchema = z.discriminatedUnion('action', [
  setupSchema,
  enableSchema,
  disableSchema,
  verifySchema
])

// GET - Get 2FA status and setup info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorVerified: true,
        twoFactorBackupCodes: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Count remaining backup codes
    let backupCodesRemaining = 0
    if (user.twoFactorBackupCodes) {
      try {
        const codes = JSON.parse(user.twoFactorBackupCodes) as string[]
        backupCodesRemaining = codes.length
      } catch {
        backupCodesRemaining = 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        verified: user.twoFactorVerified !== null,
        backupCodesRemaining,
        setupDate: user.twoFactorVerified
      }
    })

  } catch (error) {
    console.error('2FA status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Handle 2FA operations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = requestSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    switch (validatedData.action) {
      case 'setup': {
        if (user.twoFactorEnabled) {
          return NextResponse.json(
            { success: false, error: '2FA is already enabled' },
            { status: 400 }
          )
        }

        const setup = await TwoFactorAuth.generateSecret(user.id, user.email!)

        await SecurityAudit.log({
          userId: user.id,
          action: 'TWO_FACTOR_ENABLE',
          success: true,
          details: { step: 'setup_initiated' },
          ipAddress: ip || undefined,
          userAgent: userAgent || undefined
        })

        return NextResponse.json({
          success: true,
          data: setup
        })
      }

      case 'enable': {
        if (user.twoFactorEnabled) {
          return NextResponse.json(
            { success: false, error: '2FA is already enabled' },
            { status: 400 }
          )
        }

        // Verify the TOTP code with the provided secret
        const isValid = TwoFactorAuth.verifyToken(
          validatedData.secret,
          validatedData.totpCode
        )

        if (!isValid) {
          await SecurityAudit.log({
            userId: user.id,
            action: 'TWO_FACTOR_ENABLE',
            success: false,
            details: { step: 'verification_failed', reason: 'invalid_totp' },
            ipAddress: ip || undefined,
            userAgent: userAgent || undefined
          })

          return NextResponse.json(
            { success: false, error: 'Invalid verification code' },
            { status: 400 }
          )
        }

        // Enable 2FA
        await TwoFactorAuth.enable(
          user.id,
          validatedData.secret,
          validatedData.backupCodes
        )

        return NextResponse.json({
          success: true,
          message: 'Two-factor authentication enabled successfully'
        })
      }

      case 'disable': {
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
          return NextResponse.json(
            { success: false, error: '2FA is not enabled' },
            { status: 400 }
          )
        }

        let isValid = false
        let method = 'unknown'

        if (validatedData.totpCode) {
          isValid = TwoFactorAuth.verifyToken(
            user.twoFactorSecret,
            validatedData.totpCode
          )
          method = 'totp'
        } else if (validatedData.backupCode) {
          isValid = await TwoFactorAuth.verifyBackupCode(
            user.id,
            validatedData.backupCode
          )
          method = 'backup_code'
        }

        if (!isValid) {
          await SecurityAudit.log({
            userId: user.id,
            action: 'TWO_FACTOR_DISABLE',
            success: false,
            details: { method, reason: 'invalid_verification' },
            ipAddress: ip || undefined,
            userAgent: userAgent || undefined
          })

          return NextResponse.json(
            { success: false, error: 'Invalid verification code' },
            { status: 400 }
          )
        }

        // Disable 2FA
        await TwoFactorAuth.disable(user.id)

        return NextResponse.json({
          success: true,
          message: 'Two-factor authentication disabled successfully'
        })
      }

      case 'verify': {
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
          return NextResponse.json(
            { success: false, error: '2FA is not enabled' },
            { status: 400 }
          )
        }

        let isValid = false
        let method = 'unknown'

        if (validatedData.totpCode) {
          isValid = TwoFactorAuth.verifyToken(
            user.twoFactorSecret,
            validatedData.totpCode
          )
          method = 'totp'
        } else if (validatedData.backupCode) {
          isValid = await TwoFactorAuth.verifyBackupCode(
            user.id,
            validatedData.backupCode
          )
          method = 'backup_code'
        }

        await SecurityAudit.log({
          userId: user.id,
          action: 'TWO_FACTOR_VERIFY',
          success: isValid,
          details: { method, purpose: 'manual_verification' },
          ipAddress: ip || undefined,
          userAgent: userAgent || undefined
        })

        return NextResponse.json({
          success: isValid,
          message: isValid 
            ? 'Verification successful'
            : 'Invalid verification code'
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('2FA operation error:', error)
    
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
