'use client';

import { useState, useTransition } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { generateMCPToken } from '../mcp-actions';

interface MCPConnectionCardProps {
  organizationId: string;
}

export function MCPConnectionCard({ organizationId }: MCPConnectionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [tokenData, setTokenData] = useState<{
    token: string;
    connectionId: string;
    expiresAt: string;
  } | null>(null);
  const [connectionName, setConnectionName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateToken = () => {
    startTransition(async () => {
      const result = await generateMCPToken(organizationId, connectionName || undefined);

      if (result.success && result.token && result.connectionId && result.expiresAt) {
        setTokenData({
          token: result.token,
          connectionId: result.connectionId,
          expiresAt: result.expiresAt,
        });
        setConnectionName('');
        toast.success('Connection token generated successfully');
      } else {
        toast.error(result.error || 'Failed to generate token');
      }
    });
  };

  const handleCopyToken = async () => {
    if (!tokenData) return;

    try {
      await navigator.clipboard.writeText(tokenData.token);
      setCopied(true);
      toast.success('Token copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy token');
    }
  };

  const handleCopyConfig = async () => {
    if (!tokenData) return;

    const config = {
      mcpServers: {
        'project-flows-online': {
          disabled: false,
          serverUrl: `${window.location.origin}/api/mcp`,
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
          },
        },
      },
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast.success('Configuration copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy configuration');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Connection Token</CardTitle>
        <CardDescription>
          Create a new token to connect MCP clients to this organization. Tokens expire after 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!tokenData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="connection-name" className="text-sm font-medium">
                Connection Name (Optional)
              </label>
              <Input
                id="connection-name"
                placeholder="My MCP Connection"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button onClick={handleGenerateToken} disabled={isPending}>
              {isPending ? 'Generating...' : 'Generate Token'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Connection Token</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToken}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
                {tokenData.token}
              </pre>
              <p className="text-xs text-muted-foreground">
                Save this token securely. It won't be shown again.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">MCP Client Configuration</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyConfig}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Config
                </Button>
              </div>
              <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                {JSON.stringify(
                  {
                    mcpServers: {
                      'project-flows-online': {
                        disabled: false,
                        serverUrl: `${window.location.origin}/api/mcp`,
                        headers: {
                          Authorization: `Bearer ${tokenData.token}`,
                        },
                      },
                    },
                  },
                  null,
                  2
                )}
              </pre>
              <p className="text-xs text-muted-foreground">
                Add this configuration to your MCP client settings (e.g., Claude Desktop, Cline).
              </p>
            </div>

            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">Expires:</span>{' '}
                {new Date(tokenData.expiresAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => setTokenData(null)}
              className="w-full"
            >
              Generate Another Token
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
