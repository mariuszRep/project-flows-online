import { createClient } from '@/lib/supabase/server'
import type { AuthResult, OAuthProvider } from '@/types/auth'
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
} from '@/features/auth/validations'

/**
 * Auth Service - Business logic layer for authentication
 * Follows Service Layer Pattern: https://martinfowler.com/eaaCatalog/serviceLayer.html
 */

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  // Validate input
  const validation = signInSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  // Validate input
  const validation = signUpSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding?verified=true`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Send magic link to email
 */
export async function sendMagicLinkToEmail(email: string): Promise<AuthResult> {
  // Validate input
  const validation = magicLinkSchema.safeParse({ email })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: validation.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuthProvider(
  provider: OAuthProvider
): Promise<{ error: string | null; url?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null, url: data.url }
}

/**
 * Request password reset email
 */
export async function requestPasswordResetEmail(
  email: string
): Promise<AuthResult> {
  // Validate input
  const validation = passwordResetRequestSchema.safeParse({ email })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(
    validation.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    }
  )

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  password: string
): Promise<AuthResult> {
  // Validate input
  const validation = passwordUpdateSchema.safeParse({ password })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
