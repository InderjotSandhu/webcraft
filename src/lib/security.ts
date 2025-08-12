import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { UAParser } from 'ua-parser-js'
import geoip from 'geoip-lite'
import { prisma } from './prisma'
import { SecurityAction, TokenType, type User } from '@prisma/client'
import { TwoFactorSetup, SessionInfo } from '@/types'

// Two-Factor Authentication Utils
export class TwoFactorAuth {
  /**
   * Generate 2FA secret and QR code for user setup
   */
  static async generateSecret(userId: string, email: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `WebCraft (${email})`,
      issuer: 'WebCraft',
      length: 32
    })

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!)
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    )

    return {
      secret: secret.base32!,
      qrCode,
      backupCodes,
      manualEntryKey: secret.base32!
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyToken(secret: string, token: string, window: number = 2): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window
    })
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(
    userId: string, 
    backupCode: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorBackupCodes: true }
    })

    if (!user?.twoFactorBackupCodes) return false

    const backupCodes = JSON.parse(user.twoFactorBackupCodes) as string[]
    const isValid = backupCodes.includes(backupCode.toUpperCase())

    if (isValid) {
      // Remove used backup code
      const updatedCodes = backupCodes.filter(code => code !== backupCode.toUpperCase())
      
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: JSON.stringify(updatedCodes) }
      })

      // Log backup code usage
      await SecurityAudit.log({
        userId,
        action: 'TWO_FACTOR_BACKUP_USED',
        success: true,
        details: { backupCodeUsed: true }
      })
    }

    return isValid
  }

  /**
   * Enable 2FA for user
   */
  static async enable(
    userId: string, 
    secret: string, 
    backupCodes: string[]
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
        twoFactorVerified: new Date()
      }
    })

    await SecurityAudit.log({
      userId,
      action: 'TWO_FACTOR_ENABLE',
      success: true,
      details: { method: 'TOTP' }
    })
  }

  /**
   * Disable 2FA for user
   */
  static async disable(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorVerified: null
      }
    })

    // Clean up tokens
    await prisma.twoFactorToken.deleteMany({
      where: { userId }
    })

    await SecurityAudit.log({
      userId,
      action: 'TWO_FACTOR_DISABLE',
      success: true,
      details: { method: 'manual' }
    })
  }
}

// Security Audit Logging
export class SecurityAudit {
  /**
   * Log security event
   */
  static async log({
    userId,
    sessionId,
    action,
    success = true,
    details,
    ipAddress,
    userAgent
  }: {
    userId?: string
    sessionId?: string
    action: SecurityAction
    success?: boolean
    details?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    // Get location from IP if available
    let location: string | undefined
    if (ipAddress) {
      const geo = geoip.lookup(ipAddress)
      if (geo) {
        location = `${geo.city}, ${geo.region}, ${geo.country}`
      }
    }

    await prisma.securityAuditLog.create({
      data: {
        userId,
        sessionId,
        action,
        success,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        location
      }
    })
  }

  /**
   * Get user's recent security events
   */
  static async getUserEvents(
    userId: string, 
    limit: number = 50
  ): Promise<any[]> {
    return prisma.securityAuditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })
  }

  /**
   * Check for suspicious activity
   */
  static async checkSuspiciousActivity(
    userId: string,
    ipAddress?: string
  ): Promise<boolean> {
    const recentFailures = await prisma.securityAuditLog.count({
      where: {
        userId,
        action: { in: ['LOGIN_FAILED', 'FAILED_2FA_ATTEMPT'] },
        success: false,
        timestamp: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      }
    })

    // Check for unusual IP addresses
    let unusualLocation = false
    if (ipAddress) {
      const recentSuccessfulLogins = await prisma.securityAuditLog.findMany({
        where: {
          userId,
          action: 'LOGIN_SUCCESS',
          success: true,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: { ipAddress: true },
        distinct: ['ipAddress']
      })

      const knownIPs = recentSuccessfulLogins
        .map(log => log.ipAddress)
        .filter(Boolean)

      unusualLocation = !knownIPs.includes(ipAddress)
    }

    return recentFailures >= 5 || unusualLocation
  }
}

// Session Management
export class SessionManager {
  /**
   * Parse user agent and create session info
   */
  static parseUserAgent(userAgent: string) {
    const parser = new UAParser(userAgent)
    const result = parser.getResult()
    
    return {
      browser: result.browser.name ? `${result.browser.name} ${result.browser.version}` : 'Unknown',
      os: result.os.name ? `${result.os.name} ${result.os.version}` : 'Unknown',
      device: result.device.type || 'desktop'
    }
  }

  /**
   * Create user session record
   */
  static async createSession({
    userId,
    sessionToken,
    expiresAt,
    ipAddress,
    userAgent
  }: {
    userId: string
    sessionToken: string
    expiresAt: Date
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    let parsedUA = { browser: undefined, os: undefined, device: undefined }
    let location: string | undefined

    if (userAgent) {
      parsedUA = SessionManager.parseUserAgent(userAgent)
    }

    if (ipAddress) {
      const geo = geoip.lookup(ipAddress)
      if (geo) {
        location = `${geo.city}, ${geo.region}, ${geo.country}`
      }
    }

    await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        expiresAt,
        ipAddress,
        location,
        browser: parsedUA.browser,
        os: parsedUA.os,
        device: parsedUA.device
      }
    })

    await SecurityAudit.log({
      userId,
      sessionId: sessionToken,
      action: 'SESSION_CREATED',
      success: true,
      ipAddress,
      userAgent,
      details: { 
        browser: parsedUA.browser, 
        os: parsedUA.os, 
        device: parsedUA.device,
        location
      }
    })
  }

  /**
   * Get user's active sessions
   */
  static async getUserSessions(
    userId: string,
    currentSessionToken?: string
  ): Promise<SessionInfo[]> {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        terminated: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { lastActive: 'desc' }
    })

    return sessions.map(session => ({
      id: session.id,
      device: session.device || undefined,
      browser: session.browser || undefined,
      os: session.os || undefined,
      location: session.location || undefined,
      ipAddress: session.ipAddress || undefined,
      lastActive: session.lastActive,
      current: session.sessionToken === currentSessionToken,
      terminated: session.terminated
    }))
  }

  /**
   * Terminate session
   */
  static async terminateSession(
    sessionId: string, 
    userId: string,
    reason: string = 'manual'
  ): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { terminated: true }
    })

    await SecurityAudit.log({
      userId,
      sessionId,
      action: 'SESSION_TERMINATED',
      success: true,
      details: { reason }
    })
  }

  /**
   * Terminate all user sessions except current
   */
  static async terminateAllSessions(
    userId: string, 
    currentSessionToken?: string
  ): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        userId,
        sessionToken: currentSessionToken ? { not: currentSessionToken } : undefined,
        terminated: false
      },
      data: { terminated: true }
    })

    await SecurityAudit.log({
      userId,
      action: 'SESSION_TERMINATED',
      success: true,
      details: { reason: 'terminate_all', excludedCurrent: !!currentSessionToken }
    })
  }

  /**
   * Update session activity
   */
  static async updateActivity(sessionToken: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { sessionToken },
      data: { lastActive: new Date() }
    })
  }
}

// Account Security Utils
export class AccountSecurity {
  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true }
    })

    return user?.lockedUntil ? user.lockedUntil > new Date() : false
  }

  /**
   * Lock account after failed attempts
   */
  static async lockAccount(
    userId: string, 
    minutes: number = 30
  ): Promise<void> {
    const lockedUntil = new Date(Date.now() + minutes * 60 * 1000)
    
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lockedUntil,
        failedLoginAttempts: 0
      }
    })

    await SecurityAudit.log({
      userId,
      action: 'ACCOUNT_LOCKED',
      success: true,
      details: { lockedUntil, reason: 'failed_attempts', duration: minutes }
    })
  }

  /**
   * Unlock account
   */
  static async unlockAccount(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lockedUntil: null,
        failedLoginAttempts: 0
      }
    })

    await SecurityAudit.log({
      userId,
      action: 'ACCOUNT_UNLOCKED',
      success: true,
      details: { reason: 'manual' }
    })
  }

  /**
   * Increment failed login attempts
   */
  static async incrementFailedAttempts(userId: string): Promise<void> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastLoginAt: new Date()
      },
      select: { failedLoginAttempts: true }
    })

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      await AccountSecurity.lockAccount(userId, 30)
    }
  }

  /**
   * Reset failed attempts on successful login
   */
  static async resetFailedAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date()
      }
    })
  }

  /**
   * Calculate security score
   */
  static calculateSecurityScore(user: User): number {
    let score = 0

    // Base score
    score += 20

    // Email verification
    if (user.emailVerified) score += 20

    // Two-factor authentication
    if (user.twoFactorEnabled) score += 30

    // Recent login activity (good sign)
    if (user.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceLogin <= 7) score += 15
      else if (daysSinceLogin <= 30) score += 10
    }

    // No failed attempts
    if (user.failedLoginAttempts === 0) score += 15

    return Math.min(100, score)
  }
}

// Export utilities
export { speakeasy, QRCode }
