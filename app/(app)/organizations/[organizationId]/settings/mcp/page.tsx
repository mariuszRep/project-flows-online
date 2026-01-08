import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { MCPConnectionCard } from '@/features/mcp/components/mcp-connection-card';
import { MCPConnectionsList } from '@/features/mcp/components/mcp-connections-list';
import { listMCPConnections } from '@/features/mcp/mcp-actions';

interface MCPSettingsPageProps {
  params: Promise<{ organizationId: string }>;
}

export default async function MCPSettingsPage({ params }: MCPSettingsPageProps) {
  const { organizationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch existing connections
  const connections = await listMCPConnections(organizationId);

  return (
    <ContentWrapper variant="narrow">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">MCP Connections</h2>
          <p className="text-muted-foreground">
            Manage Model Context Protocol (MCP) connections for this organization. Generate tokens
            to connect MCP clients like Claude Desktop, Cline, or other compatible tools.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium">Generate New Connection</h3>
          <MCPConnectionCard organizationId={organizationId} />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium">Active Connections</h3>
          <MCPConnectionsList connections={connections} organizationId={organizationId} />
        </div>
      </div>
    </ContentWrapper>
  );
}
