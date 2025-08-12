import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const availableProviders = []

  // Check if Google OAuth is properly configured
  if (process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
      process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret') {
    availableProviders.push('google')
  }

  // Check if GitHub OAuth is properly configured
  if (process.env.GITHUB_CLIENT_ID && 
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.GITHUB_CLIENT_ID !== 'your-github-client-id' &&
      process.env.GITHUB_CLIENT_SECRET !== 'your-github-client-secret') {
    availableProviders.push('github')
  }

  return NextResponse.json({ 
    providers: availableProviders,
    hasOAuth: availableProviders.length > 0 
  })
}
