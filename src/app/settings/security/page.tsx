'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  ShieldCheck, 
  Key, 
  Monitor, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Smartphone
} from 'lucide-react'
import { TwoFactorSetupDialog } from '@/components/security/TwoFactorSetupDialog'
import { SecurityAuditLog } from '@/components/security/SecurityAuditLog'
import { SessionManagement } from '@/components/security/SessionManagement'

interface SecurityStatus {
  twoFactorEnabled: boolean
  backupCodesRemaining: number
  securityScore: number
  recentActivity: any[]
  activeSessions: any[]
  recommendations: any[]
}

export default function SecuritySettingsPage() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)

  useEffect(() => {
    fetchSecurityStatus()
  }, [])

  const fetchSecurityStatus = async () => {
    try {
      setLoading(true)
      
      // Fetch 2FA status
      const twoFactorResponse = await fetch('/api/security/2fa')
      const twoFactorData = await twoFactorResponse.json()
      
      // Fetch security statistics
      const auditResponse = await fetch('/api/security/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 })
      })
      const auditData = await auditResponse.json()
      
      // Fetch active sessions
      const sessionsResponse = await fetch('/api/security/sessions')
      const sessionsData = await sessionsResponse.json()
      
      if (twoFactorData.success && auditData.success && sessionsData.success) {
        setSecurityStatus({
          twoFactorEnabled: twoFactorData.data?.enabled || false,
          backupCodesRemaining: twoFactorData.data?.backupCodesRemaining || 0,
          securityScore: auditData.data?.statistics?.securityScore || 0,
          recentActivity: auditData.data?.recentEvents || [],
          activeSessions: sessionsData.data?.sessions || [],
          recommendations: auditData.data?.recommendations || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch security status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getSecurityScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (score >= 70) return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    return <AlertTriangle className="h-5 w-5 text-red-600" />
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security, two-factor authentication, and monitor security activity.
        </p>
      </div>

      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Score
              </CardTitle>
              <CardDescription>
                Your overall account security rating
              </CardDescription>
            </div>
            <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${getSecurityScoreColor(securityStatus?.securityScore || 0)}`}>
              {getSecurityScoreIcon(securityStatus?.securityScore || 0)}
              <span className="font-semibold text-lg">
                {securityStatus?.securityScore || 0}/100
              </span>
            </div>
          </div>
        </CardHeader>
        {securityStatus?.recommendations && securityStatus.recommendations.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Security Recommendations</h4>
              {securityStatus.recommendations.map((rec: any) => (
                <Alert key={rec.id} className={rec.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>{rec.title}</strong>
                        <p className="text-sm mt-1">{rec.description}</p>
                      </div>
                      {rec.action && rec.actionUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={rec.actionUrl}>{rec.action}</a>
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Security Settings Tabs */}
      <Tabs defaultValue="two-factor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="two-factor" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Two-Factor Auth
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Two-Factor Authentication Tab */}
        <TabsContent value="two-factor">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Two-Factor Authentication</span>
                <Badge variant={securityStatus?.twoFactorEnabled ? "default" : "secondary"}>
                  {securityStatus?.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with two-factor authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityStatus?.twoFactorEnabled ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Two-factor authentication is enabled and protecting your account.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Backup Recovery Codes</h4>
                      <p className="text-sm text-muted-foreground">
                        {securityStatus.backupCodesRemaining} codes remaining
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Codes
                    </Button>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowTwoFactorSetup(true)}
                  >
                    Disable 2FA
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      Your account is not protected by two-factor authentication. Enable it now for better security.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <Smartphone className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-medium">Authenticator App</h4>
                      <p className="text-sm text-muted-foreground">
                        Use Google Authenticator, Authy, or any TOTP-compatible app
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowTwoFactorSetup(true)}
                    >
                      Set Up 2FA
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <SessionManagement 
            sessions={securityStatus?.activeSessions || []}
            onSessionsUpdate={fetchSecurityStatus}
          />
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <SecurityAuditLog />
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>
                  Advanced security settings and emergency controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Terminate All Sessions</h4>
                    <p className="text-sm text-muted-foreground">
                      Sign out from all devices and browsers
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Terminate All
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Download Security Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Export your security activity and login history
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h4 className="font-medium text-red-900">Reset Security Settings</h4>
                    <p className="text-sm text-red-700">
                      This will disable 2FA and clear all security settings
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Reset All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Two-Factor Setup Dialog */}
      <TwoFactorSetupDialog 
        open={showTwoFactorSetup}
        onOpenChange={setShowTwoFactorSetup}
        isEnabled={securityStatus?.twoFactorEnabled || false}
        onStatusChange={fetchSecurityStatus}
      />
    </div>
  )
}
