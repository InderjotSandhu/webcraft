# 🔐 OAuth Setup Guide - Phase 5 Enterprise Features

This guide helps you set up OAuth authentication with Google and GitHub for WebCraft Phase 5.

## 🎯 Quick Setup

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Configure OAuth consent screen:
   - Application name: `WebCraft`
   - Authorized domains: `localhost`
6. Create OAuth client ID:
   - Application type: `Web application`
   - Name: `WebCraft OAuth`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### 2. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in details:
   - Application name: `WebCraft`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy Client ID and generate Client Secret

### 3. Environment Variables

Update your `.env` file:

```bash
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth  
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 4. Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use online generator: https://generate-secret.vercel.app/32

## 🚀 Testing OAuth Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/login` 

3. Try the OAuth buttons:
   - "Continue with Google"
   - "Continue with GitHub"

4. Verify successful authentication and redirect to dashboard

## 📊 Phase 5 OAuth Features

### ✅ Implemented Features:
- [x] NextAuth.js integration
- [x] Google OAuth provider
- [x] GitHub OAuth provider  
- [x] Database schema with OAuth tables
- [x] Session management
- [x] Enhanced login UI with OAuth buttons
- [x] Fallback to email/password authentication

### 🔄 Next Steps:
- [ ] OAuth profile synchronization
- [ ] User account linking
- [ ] Enhanced user profiles with OAuth data
- [ ] Social login analytics
- [ ] Advanced security features

## 🛠️ Technical Implementation

### Database Schema
```sql
-- New OAuth tables added:
Account (provider, providerAccountId, tokens)
Session (sessionToken, expires)  
VerificationToken (identifier, token)

-- Updated User table:
User (emailVerified, image, OAuth profile data)
```

### NextAuth Configuration
- JWT strategy for sessions
- Prisma adapter for database storage
- Custom callbacks for enhanced user data
- Credential provider fallback support

## 🔒 Security Features

- ✅ PKCE flow for enhanced security
- ✅ HTTP-only session cookies
- ✅ CSRF protection  
- ✅ Secure token handling
- ✅ Session expiration management

---

**Phase 5 Progress**: OAuth Integration ✅ Complete
**Next Feature**: Team Collaboration System 🚧
