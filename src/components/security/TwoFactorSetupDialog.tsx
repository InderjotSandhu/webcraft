'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Smartphone, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Copy,
  Download,
  Shield,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface TwoFactorSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEnabled: boolean
  onStatusChange: () => void
}

interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
  manualEntryKey: string
}

export function TwoFactorSetupDialog({ 
  open, 
  onOpenChange, 
  isEnabled, 
  onStatusChange 
}: TwoFactorSetupDialogProps) {
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'disable'>('initial')
  const [loading, setLoading] = useState(false)
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [error, setError] = useState('')
  const [copiedCodes, setCopiedCodes] = useState(false)

  const handleDialogOpen = (open: boolean) => {
    if (open) {
      setStep(isEnabled ? 'disable' : 'initial')
      setError('')
      setVerificationCode('')
      setBackupCode('')
      setCopiedCodes(false)
    }
    onOpenChange(open)
  }

  const startSetup = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setTwoFactorSetup(data.data)
        setStep('setup')
      } else {
        setError(data.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!verificationCode || !twoFactorSetup) {
      setError('Please enter the verification code')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enable',
          secret: twoFactorSetup.secret,
          totpCode: verificationCode,
          backupCodes: twoFactorSetup.backupCodes
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStep('verify')
        toast.success('Two-factor authentication enabled successfully!')
        onStatusChange()
      } else {
        setError(data.error || 'Invalid verification code')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const disableTwoFactor = async () => {
    if (!verificationCode && !backupCode) {
      setError('Please enter a verification code or backup code')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable',
          totpCode: verificationCode || undefined,
          backupCode: backupCode || undefined
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Two-factor authentication disabled')
        onStatusChange()
        onOpenChange(false)
      } else {
        setError(data.error || 'Invalid verification code')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const copyBackupCodes = () => {
    if (twoFactorSetup?.backupCodes) {
      navigator.clipboard.writeText(twoFactorSetup.backupCodes.join('\n'))
      setCopiedCodes(true)
      toast.success('Backup codes copied to clipboard')
    }
  }

  const downloadBackupCodes = () => {
    if (twoFactorSetup?.backupCodes) {
      const text = `WebCraft 2FA Backup Codes\n\n${twoFactorSetup.backupCodes.join('\n')}\n\nKeep these codes safe. Each code can only be used once.`
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'webcraft-backup-codes.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup codes downloaded')
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Enable Two-Factor Authentication</h3>
                <p className="text-sm text-blue-700">
                  Add an extra layer of security to your account with TOTP authentication
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <h4 className="font-medium">Install an authenticator app</h4>
                  <p className="text-sm text-muted-foreground">
                    Download Google Authenticator, Authy, or any TOTP-compatible app
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <h4 className="font-medium">Scan QR code or enter secret key</h4>
                  <p className="text-sm text-muted-foreground">
                    Add WebCraft to your authenticator app
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <h4 className="font-medium">Enter verification code</h4>
                  <p className="text-sm text-muted-foreground">
                    Verify the setup with a code from your app
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'setup':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold">Scan QR Code</h3>
              <div className="flex justify-center p-4 bg-white border rounded-lg">
                {twoFactorSetup?.qrCode && (
                  <img 
                    src={twoFactorSetup.qrCode} 
                    alt="2FA QR Code" 
                    className="w-48 h-48"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Manual Entry Key</Label>
              <div className="flex gap-2">
                <Input 
                  value={twoFactorSetup?.manualEntryKey || ''} 
                  readOnly
                  className="font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorSetup?.manualEntryKey || '')
                    toast.success('Key copied to clipboard')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If you can't scan the QR code, enter this key manually
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center font-mono text-lg tracking-wider"
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'verify':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">2FA Enabled Successfully!</h3>
                <p className="text-muted-foreground">
                  Your account is now protected with two-factor authentication
                </p>
              </div>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <strong className="text-yellow-900">Important:</strong> Save your backup codes in a secure location. 
                You'll need them if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Backup Recovery Codes</Label>
                <Badge variant="secondary">{twoFactorSetup?.backupCodes.length} codes</Badge>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {twoFactorSetup?.backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-white rounded text-center border">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyBackupCodes}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copiedCodes ? 'Copied!' : 'Copy Codes'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadBackupCodes}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )

      case 'disable':
        return (
          <div className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>Warning:</strong> Disabling 2FA will make your account less secure. 
                You'll need to verify this action with your authenticator app or a backup code.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="disable-verification-code">Verification Code</Label>
                <Input
                  id="disable-verification-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center font-mono text-lg tracking-wider"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="text-center text-muted-foreground text-sm">
                or
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-code">Backup Code</Label>
                <Input
                  id="backup-code"
                  placeholder="Enter backup code"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="text-center font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Use one of your backup recovery codes
                </p>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const renderFooter = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={startSetup} disabled={loading}>
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Start Setup
            </Button>
          </div>
        )

      case 'setup':
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('initial')}>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={verifyAndEnable} 
                disabled={loading || !verificationCode}
              >
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Enable 2FA
              </Button>
            </div>
          </div>
        )

      case 'verify':
        return (
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )

      case 'disable':
        return (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={disableTwoFactor} 
              disabled={loading || (!verificationCode && !backupCode)}
            >
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {step === 'disable' ? 'Disable 2FA' : 'Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {step === 'disable' 
              ? 'Verify your identity to disable two-factor authentication' 
              : 'Secure your account with two-factor authentication'
            }
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
