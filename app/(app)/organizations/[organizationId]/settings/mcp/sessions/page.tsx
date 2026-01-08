import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { MCPSessionsList } from '@/features/mcp/components/mcp-sessions-list';
import { listMCPSessions } from '@/features/mcp/mcp-actions';

interface MCPSessionsPageProps {
  params: Promise<{ organizationId: string }>;
}

export default async function MCPSessionsPage({ params }: MCPSessionsPageProps) {
  const { organizationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const sessions = await listMCPSessions(organizationId);

  return (
    <ContentWrapper variant="full">
      <MCPSessionsList sessions={sessions} organizationId={organizationId} />
    </ContentWrapper>
  );
}
