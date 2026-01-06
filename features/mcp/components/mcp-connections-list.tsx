'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { revokeMCPConnection, type Connection } from '../mcp-actions';

interface MCPConnectionsListProps {
  connections: Connection[];
  organizationId: string;
}

export function MCPConnectionsList({ connections, organizationId }: MCPConnectionsListProps) {
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = (connectionId: string) => {
    setRevokingId(connectionId);
    startTransition(async () => {
      const result = await revokeMCPConnection(connectionId, organizationId);

      if (result.success) {
        toast.success('Connection revoked successfully');
      } else {
        toast.error(result.error || 'Failed to revoke connection');
      }
      setRevokingId(null);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No active connections. Generate a token above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((connection) => (
            <TableRow key={connection.id}>
              <TableCell className="font-medium">{connection.name}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    connection.is_connected
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}
                >
                  {connection.is_connected ? 'Connected' : 'Disconnected'}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(connection.created_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {connection.last_used_at ? formatDate(connection.last_used_at) : 'Never'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(connection.expires_at)}
              </TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending && revokingId === connection.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke Connection</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to revoke this connection? This action cannot be
                        undone and the connection will no longer be able to access your
                        organization data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevoke(connection.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
