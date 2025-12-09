import {
  Building2,
  FolderKanban,
  Database,
  CreditCard,
  Palette,
  CheckCircle2,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

const features = [
  {
    icon: Building2,
    title: 'Organization Management',
    description:
      'Multi-tenant architecture with role-based access control. Manage teams and permissions with ease.',
  },
  {
    icon: FolderKanban,
    title: 'Workspace System',
    description:
      'Isolated workspaces for each organization with granular permissions and access controls.',
  },
  {
    icon: Database,
    title: 'Supabase Integration',
    description:
      'Built on Supabase with authentication, PostgreSQL database, and Row Level Security out of the box.',
  },
  {
    icon: CreditCard,
    title: 'Stripe Integration',
    description:
      'Complete subscription management with Stripe. Handle billing, invoices, and payment methods seamlessly.',
  },
  {
    icon: Palette,
    title: 'Modern UI Stack',
    description:
      'Built with Next.js 15, shadcn/ui, and Tailwind CSS. Beautiful, responsive design with dark mode support.',
  },
  {
    icon: CheckCircle2,
    title: 'Production Ready',
    description:
      'TypeScript throughout, deployed on Vercel, and following best practices for security and performance.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 sm:py-24">
      <div className="container mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Launch
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete SaaS starter with all the features you need to get started
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <Icon className="h-12 w-12 text-primary" />
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
