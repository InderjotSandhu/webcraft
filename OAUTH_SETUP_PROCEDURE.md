# OAuth Setup Procedure Guide

## Overview

This document provides step-by-step instructions for setting up OAuth authentication (Google and GitHub) for the WebCraft application. The system is designed to gracefully handle missing OAuth credentials by hiding OAuth buttons when providers are not properly configured.

## Current Implementation

### Architecture
- **Conditional Provider Loading**: OAuth providers only load when valid credentials are present
- **Dynamic UI Rendering**: OAuth buttons only appear when providers are properly configured
- **Graceful Fallback**: Application works perfectly with just email/password authentication when OAuth is not configured

### Files Modified
- `src/lib/auth.ts` - Auth configuration with conditional provider registration
- `src/app/api/auth/providers/route.ts` - API endpoint to check available providers
- `src/app/(auth)/login/page.tsx` - Login page with conditional OAuth rendering
- `src/app/(auth)/signup/page.tsx` - Signup page with conditional OAuth rendering

## OAuth Provider Setup

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click on project selector at the top
   - Create a new project or select existing one

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

5. **Copy Credentials**
   - Note down the Client ID and Client Secret

### GitHub OAuth Setup

1. **Go to GitHub Developer Settings**
   - Visit: https://github.com/settings/developers
   - Sign in to your GitHub account

2. **Create New OAuth App**
   - Click "New OAuth App"
   - Fill in the application details:
     - Application name: `WebCraft`
     - Homepage URL: `http://localhost:3000` (development) or your domain
     - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

3. **Generate Client Secret**
   - After creating the app, click "Generate a new client secret"
   - Copy both Client ID and Client Secret immediately

## Environment Configuration

### Update .env File

Replace the placeholder values in your `.env` file with the actual credentials:

```env
# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

# Development database (SQLite)
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="development-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers - Replace with real credentials
# Google OAuth
GOOGLE_CLIENT_ID="your-actual-google-client-id"
GOOGLE_CLIENT_SECRET="your-actual-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-actual-github-client-id"
GITHUB_CLIENT_SECRET="your-actual-github-client-secret"
```

### Security Notes

- **Never commit real credentials to version control**
- **Use different credentials for development and production**
- **Store production credentials securely (e.g., in deployment platform's environment variables)**

## Testing OAuth Integration

### Development Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Check provider availability**:
   - Visit: http://localhost:3000/api/auth/providers
   - Should return JSON with available providers

3. **Test login/signup pages**:
   - Visit: http://localhost:3000/login
   - OAuth buttons should appear if credentials are configured
   - OAuth buttons should be hidden if using placeholder credentials

### Verification Steps

1. **With Placeholder Credentials** (Default state):
   - OAuth buttons are hidden
   - Only email/password authentication is available
   - No console errors related to OAuth

2. **With Real Credentials**:
   - OAuth buttons appear on login and signup pages
   - Clicking OAuth buttons redirects to provider's authorization page
   - Successful authentication redirects back to dashboard

## Troubleshooting

### Common Issues

1. **OAuth buttons not appearing**:
   - Check if credentials are properly set in `.env`
   - Verify credentials are not placeholder values
   - Restart development server after changing `.env`

2. **OAuth redirect errors**:
   - Verify redirect URLs in OAuth app configuration match your domain
   - Check NEXTAUTH_URL is set correctly

3. **Provider authentication fails**:
   - Verify Client ID and Client Secret are correct
   - Check if OAuth app is properly configured on provider's side
   - Ensure required APIs are enabled (Google+ API for Google OAuth)

### Debug Mode

To debug OAuth issues:

1. **Check provider endpoint**:
   ```bash
   curl http://localhost:3000/api/auth/providers
   ```

2. **Check browser console** for any JavaScript errors

3. **Check server logs** for NextAuth debug information

## Production Deployment

### Environment Variables Setup

When deploying to production platforms (Vercel, Netlify, etc.):

1. **Set environment variables** in your deployment platform
2. **Update NEXTAUTH_URL** to your production domain
3. **Update OAuth app redirect URLs** to production URLs
4. **Use a strong NEXTAUTH_SECRET** for production

### Security Checklist

- [ ] Production OAuth apps created with production URLs
- [ ] Environment variables set in deployment platform
- [ ] NEXTAUTH_SECRET is cryptographically secure
- [ ] OAuth app settings reviewed for security
- [ ] Redirect URLs are HTTPS in production

## Maintenance

### Regular Tasks

1. **Monitor OAuth app quotas** and usage limits
2. **Rotate OAuth secrets** periodically
3. **Review OAuth app permissions** and scopes
4. **Update OAuth app information** as needed

### Updates Required When

- Domain changes (update redirect URLs)
- Moving between environments (update URLs and credentials)
- Adding new OAuth providers
- Changing authentication flows

## Support

For issues with this OAuth setup:

1. **Check this procedure document**
2. **Review troubleshooting section**
3. **Check provider documentation**:
   - [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
   - [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
4. **Review NextAuth.js documentation**: https://next-auth.js.org/

---

**Last Updated**: August 12, 2025
**Version**: 1.0
**Author**: WebCraft Development Team
