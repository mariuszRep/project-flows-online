import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim() !== '') {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim() !== '') {
    return `https://${process.env.VERCEL_URL}`
  }

  if (process.env.VERCEL_BRANCH_URL && process.env.VERCEL_BRANCH_URL.trim() !== '') {
    return `https://${process.env.VERCEL_BRANCH_URL}`
  }

  // If we are in a Vercel deployment but VERCEL_URL is missing, this is a fallback
  if (process.env.VERCEL === '1') {
    // Try to construct likely URL if possible, or just warn
    // But for now, let's stick to localhost as last resort
  }

  return 'http://localhost:3000'
}
