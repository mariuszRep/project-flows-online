import { MarketingNavbar } from '@/features/marketing/components/marketing-navbar'
import { MarketingFooter } from '@/features/marketing/components/marketing-footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
