import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { MCPConnectionsList } from '@/features/mcp/components/mcp-connections-list';
import { listMCPConnections } from '@/features/mcp/mcp-actions';

interface MCPConnectionsPageProps {
  params: Promise<{ organizationId: string }>;
}

export default async function MCPConnectionsPage({ params }: MCPConnectionsPageProps) {
  const { organizationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const connections = await listMCPConnections(organizationId);

  return (
    <ContentWrapper variant="full">
      <MCPConnectionsList connections={connections} organizationId={organizationId} />
    </ContentWrapper>
  );
}
