# Next.js + Shadcn/UI Starter Template

A modern, production-ready template for building web applications with Next.js 14, TypeScript, and Shadcn/UI. This template provides a solid foundation with best practices, modern tooling, and a beautiful, accessible component library out of the box.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.0-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Shadcn/UI](https://img.shields.io/badge/Shadcn%2FUI-0.0.1-22c55e?logo=react&logoColor=white)](https://ui.shadcn.com/)

## ✨ Features

- ⚡ **Next.js 14** with App Router
- 🎨 **Shadcn/UI** components with dark mode
- 🎯 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🌓 **Next Themes** for dark/light mode
- 📏 **ESLint** and **Prettier** for code quality
- 🔄 **React Server Components** ready
- 📱 **Fully responsive** design
- 🔄 **Fast Refresh** for development
- 🛠 **Modern tooling** with `next/font` and `next/image`
- 🔐 **Supabase Authentication** with email/password, OAuth, and magic links

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/next-shadcn-starter.git
   cd next-shadcn-starter
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000) with your browser** to see the result.

## 🔐 Supabase Authentication Setup

This project includes integrated Supabase authentication with multiple authentication methods.

### Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Authentication Methods

The application supports the following authentication methods:

#### 1. **Email & Password Authentication**
- Sign up with email and password
- Sign in with email and password
- Secure password handling via Supabase

#### 2. **OAuth Providers**
- Google OAuth
- GitHub OAuth
- Configured in `app/actions/auth.ts`

#### 3. **Magic Link Authentication**
- Passwordless sign-in via email
- One-time password (OTP) delivery
- Automatic redirect after verification

### Key Files

- **`lib/supabase/client.ts`** - Browser-side Supabase client
- **`lib/supabase/server.ts`** - Server-side Supabase client
- **`lib/supabase/middleware.ts`** - Authentication middleware
- **`app/actions/auth.ts`** - Server actions for authentication
- **`components/`** - Authentication UI components
  - `login-form.tsx` - Login form component
  - `signup-form.tsx` - Sign-up form component
  - `oauth-buttons.tsx` - OAuth provider buttons

### Authentication Flow

1. User navigates to `/login` or `/signup`
2. Submits credentials or selects OAuth provider
3. Server action processes authentication via Supabase
4. Session is established and stored securely
5. User is redirected to `/portal` on success
6. Middleware validates session on protected routes

### Protected Routes

The `/portal` route is protected and requires authentication. Unauthenticated users are redirected to the login page via middleware.

### Getting Supabase Credentials

1. Create a project at [Supabase](https://supabase.com)
2. Go to Project Settings → API
3. Copy your `Project URL` and `anon/public key`
4. Add them to your `.env.local` file
5. Enable desired authentication providers in Supabase dashboard

### Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

## 🔌 OAuth 2.1 MCP Server Configuration

## Overview

This project supports OAuth 2.1 authentication with Dynamic Client Registration (DCR) for MCP clients (VS Code, Cursor, JetBrains IDEs). However, **OAuth 2.1 server functionality is only available in production Supabase environments**, not in local Supabase CLI.

## Environment Configuration

### Local Development Limitations

**Important:** The OAuth 2.1 Authorization Server feature with Dynamic Client Registration is a **production-only Supabase feature**. Local Supabase (via CLI) does not support:

- OAuth 2.1 server endpoints
- Dynamic Client Registration (DCR)
- `.well-known/oauth-authorization-server` metadata
- OAuth authorization flows

### Local Development Alternatives

For local development, use one of these approaches:

#### Option 1: Service Role Key (Recommended for Local)
```bash
# Use Supabase service role key for local MCP testing
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# No OAuth configuration needed locally
```

#### Option 2: Production OAuth Testing
- Deploy to staging/production Supabase
- Configure OAuth 2.1 server in production dashboard
- Test OAuth flows against production endpoints
- Use service role key for local development

### Production Configuration

When deploying to production, configure these environment variables:

```env
# OAuth 2.1 Authorization Server
MCP_SERVER_URL=https://yourdomain.com
JWT_ISSUER=https://your-project-ref.supabase.co
JWT_AUDIENCE=https://yourdomain.com

# MCP Connection Security
MCP_ALLOWED_ORIGINS=https://yourdomain.com
MCP_EXPECTED_HOST=yourdomain.com

# Redis/KV for Session Management
KV_URL=rediss://your-kv-instance.upstash.io
REDIS_URL=rediss://your-kv-instance.upstash.io

# Rate Limiting
MCP_IP_RATE_LIMIT=20           # Requests per minute (pre-auth)
MCP_USER_RATE_LIMIT=100        # Requests per minute (post-auth)
```

### Production Supabase Dashboard Setup

**Note:** These steps are for production Supabase instances only, not local development.

1. **Navigate to OAuth Server Settings**
   - Open Production Supabase Dashboard
   - Go to: Authentication → OAuth Server

2. **Enable OAuth 2.1 Server**
   - Toggle "Enable OAuth 2.1 Server"
   - This activates the authorization server functionality

3. **Enable Dynamic Client Registration (DCR)**
   - Toggle "Allow Dynamic Client Registration"
   - Allows IDE clients to self-register without manual setup

4. **Configure Custom Scopes**
   Create the following OAuth scopes:
   - `mcp:execute` (required) - General MCP tool execution
   - `mcp:read` (optional) - Read-only MCP operations
   - `mcp:write` (optional) - Write MCP operations

### Local Development Setup

For local development, use the simplified approach:

```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Configure only essential variables for local development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# Use service role key for MCP authentication (local only)
# OAuth 2.1 endpoints will not be available locally
```

### Production OAuth 2.1 Endpoints

**Available in production Supabase only:**

Once enabled in production, these endpoints are automatically available:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| **Metadata** | `{SUPABASE_URL}/.well-known/oauth-authorization-server` | Discovery document with all OAuth configuration |
| **JWKS** | `{SUPABASE_URL}/.well-known/jwks.json` | Public keys for JWT signature verification |
| **Authorization** | `{SUPABASE_URL}/oauth/authorize` | OAuth authorization endpoint |
| **Token** | `{SUPABASE_URL}/oauth/token` | Token exchange endpoint |
| **Registration** | `{SUPABASE_URL}/oauth/register` | Dynamic client registration (DCR) |

### Local Development Endpoints

For local development, use standard Supabase endpoints:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| **Auth** | `http://localhost:54321/auth/v1` | Standard Supabase authentication |
| **API** | `http://localhost:54321/rest/v1` | Database API access |
| **Studio** | `http://localhost:54323` | Local Supabase dashboard |

### Production Verification Steps

**These steps work only in production Supabase:**

1. **Test Metadata Endpoint**
   ```bash
   curl https://your-project.supabase.co/.well-known/oauth-authorization-server
   ```
   Expected response includes: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `registration_endpoint`

2. **Test JWKS Endpoint**
   ```bash
   curl https://your-project.supabase.co/.well-known/jwks.json
   ```
   Expected response: JSON Web Key Set with public keys

3. **Test Dynamic Registration**
   ```bash
   curl -X POST https://your-project.supabase.co/oauth/register \
     -H "Content-Type: application/json" \
     -d '{
       "client_name": "MCP Test Client",
       "redirect_uris": ["http://localhost:3000/callback"],
       "grant_types": ["authorization_code"],
       "response_types": ["code"],
       "scope": "mcp:execute"
     }'
   ```

### Local Development Testing

For local development, test standard Supabase authentication:

1. **Test Local Supabase Health**
   ```bash
   curl http://localhost:54321/rest/v1/
   ```

2. **Test Service Role Authentication**
   ```bash
   curl http://localhost:54321/rest/v1/ \
     -H "apikey: your-service-role-key" \
     -H "Authorization: Bearer your-service-role-key"
   ```

3. **Start Local Development**
   ```bash
   # Start Supabase locally
   supabase start
   
   # Start Next.js development server
   npm run dev
   
   # Test MCP endpoints with service role key
   # OAuth 2.1 flows will not work locally
   ```

### MCP Client Configuration

**For Production OAuth 2.1:**
MCP clients (VS Code Claude Code, Cursor, etc.) will automatically:
1. Fetch OAuth metadata from `/.well-known/oauth-authorization-server`
2. Register as a client via the DCR endpoint
3. Initiate OAuth 2.1 Authorization Code + PKCE flow
4. Request `mcp:execute` scope
5. Receive and cache JWT tokens

**For Local Development:**
MCP clients should use service role key authentication:
1. Configure service role key in MCP client settings
2. Use standard Supabase endpoints (`http://localhost:54321`)
3. OAuth flows are not available locally

## Security Features

### Production OAuth 2.1 Security
- **JWT Validation**: Tokens validated with issuer, audience, and signature verification
- **Dynamic Client Registration**: Clients register securely with metadata validation
- **Scope-Based Access**: Granular permissions with `mcp:execute`, `mcp:read`, `mcp:write`
- **PKCE Flow**: Prevents authorization code interception attacks
- **Token Expiration**: Automatic token refresh and expiration handling

### Local Development Security
- **Service Role Key**: Use service role key for full access during development
- **Local Network**: Development endpoints accessible only from localhost
- **Environment Isolation**: Separate configurations for local and production

## Documentation

- [Supabase OAuth Server Documentation](https://supabase.com/docs/guides/auth/oauth-server)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-04)
- [Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [MCP Authentication Guide](https://modelcontextprotocol.io/docs/concepts/authentication)

## 🛠 Project Structure

```
.
├── src/
│   ├── app/                 # App Router
│   ├── components/          # Reusable components
│   │   ├── ui/             # Shadcn/UI components
│   │   └── theme/          # Theme components
│   ├── lib/                # Utility functions
│   └── styles/             # Global styles
├── public/                 # Static files
└── .github/                # GitHub configurations
```

## 📦 Adding New Components

This project uses Shadcn/UI's CLI to add new components:

```bash
npx shadcn-ui@latest add [component-name]
```

## 🔄 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-docs) from the creators of Next.js.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API.
- [Shadcn/UI Documentation](https://ui.shadcn.com/docs) - Learn how to use Shadcn/UI components.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Learn how to style your app with Tailwind.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
