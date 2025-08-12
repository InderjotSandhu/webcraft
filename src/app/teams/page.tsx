'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Settings, MoreVertical, Crown, Shield, Eye, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSession } from 'next-auth/react'
import { TeamWithRelations, TeamRole } from '@/types'
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog'
import { InviteUserDialog } from '@/components/teams/InviteUserDialog'

export default function TeamsPage() {
  const { data: session, status } = useSession()
  const [teams, setTeams] = useState<TeamWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamWithRelations | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTeams()
    }
  }, [status])

  const fetchTeams = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/teams')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch teams')
      }

      setTeams(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeamCreated = (newTeam: TeamWithRelations) => {
    setTeams(prev => [newTeam, ...prev])
    setShowCreateDialog(false)
  }

  const handleInviteSent = () => {
    setShowInviteDialog(false)
    // Optionally refresh teams to show updated invitation count
    fetchTeams()
  }

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'MEMBER':
        return <UserCheck className="h-4 w-4 text-green-500" />
      case 'VIEWER':
        return <Eye className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'MEMBER':
        return 'bg-green-100 text-green-800'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getUserRole = (team: TeamWithRelations): TeamRole => {
    const membership = team.members.find(member => member.userId === session?.user?.id)
    return membership?.role || 'VIEWER'
  }

  const canManageTeam = (team: TeamWithRelations): boolean => {
    const role = getUserRole(team)
    return role === 'OWNER' || role === 'ADMIN'
  }

  const canInviteUsers = (team: TeamWithRelations): boolean => {
    const role = getUserRole(team)
    if (role === 'OWNER' || role === 'ADMIN') return true
    
    // Check team settings for member invites
    const settings = team.settings as any
    return settings?.allowMemberInvites === true && role === 'MEMBER'
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading teams...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to manage your teams.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-2">Collaborate with your team members on projects</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={fetchTeams}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No teams yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first team</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const userRole = getUserRole(team)
            const canManage = canManageTeam(team)
            const canInvite = canInviteUsers(team)

            return (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {team.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className={getRoleColor(userRole)}>
                        <span className="flex items-center space-x-1">
                          {getRoleIcon(userRole)}
                          <span className="text-xs font-medium">{userRole}</span>
                        </span>
                      </Badge>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canInvite && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedTeam(team)
                                  setShowInviteDialog(true)
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Invite Members
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Settings className="h-4 w-4 mr-2" />
                              Team Settings
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Team Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{team._count?.members || 0} members</span>
                      <span>{team.invitations.length} pending invites</span>
                    </div>

                    {/* Team Members */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Members</h4>
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                            <AvatarImage src={member.user.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.user.name?.charAt(0) || member.user.email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(team._count?.members || 0) > 5 && (
                          <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              +{(team._count?.members || 0) - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Projects
                      </Button>
                      {canInvite && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTeam(team)
                            setShowInviteDialog(true)
                          }}
                        >
                          Invite
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTeamCreated={handleTeamCreated}
      />

      {selectedTeam && (
        <InviteUserDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          team={selectedTeam}
          onInviteSent={handleInviteSent}
        />
      )}
    </div>
  )
}
