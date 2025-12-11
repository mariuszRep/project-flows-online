'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { OAuthProvider } from '@/types/auth'
import {
  signInWithPassword,
  signUpWithPassword,
  signOutUser,
  sendMagicLinkToEmail,
  signInWithOAuthProvider,
  requestPasswordResetEmail,
  updateUserPassword,
} from '@/services/auth-service'

/**
 * Auth Actions - Next.js Server Actions
 * Thin wrappers around service layer that handle framework-specific concerns
 * (revalidation, redirects, FormData parsing)
 */

export async function signIn(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  const result = await signInWithPassword(email, password)

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath('/', 'layout')
  // Let portal page handle redirect logic based on user's org/workspace status
  redirect('/portal')
}

export async function signUp(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  const result = await signUpWithPassword(email, password)

  if (result.error) {
    return { error: result.error }
  }

  return { error: null }
}

export async function signOut() {
  await signOutUser()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function sendMagicLink(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()

  const result = await sendMagicLinkToEmail(email)

  if (result.error) {
    return { error: result.error }
  }

  return { error: null }
}

export async function signInWithOAuth(provider: OAuthProvider) {
  const result = await signInWithOAuthProvider(provider)

  if (result.error) {
    return { error: result.error }
  }

  if (result.url) {
    redirect(result.url)
  }
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()

  const result = await requestPasswordResetEmail(email)

  if (result.error) {
    return { error: result.error }
  }

  return { error: null }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string

  const result = await updateUserPassword(password)

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath('/', 'layout')
  redirect('/portal')
}
