import { redirect } from 'next/navigation';

interface MCPSettingsPageProps {
  params: Promise<{ organizationId: string }>;
}

export default async function MCPSettingsPage({ params }: MCPSettingsPageProps) {
  const { organizationId } = await params;
  redirect(`/organizations/${organizationId}/settings/mcp/connections`);
}
