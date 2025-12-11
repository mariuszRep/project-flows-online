import Link from 'next/link'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <ForgotPasswordForm />
      <div className="text-center text-sm">
        Remember your password?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
