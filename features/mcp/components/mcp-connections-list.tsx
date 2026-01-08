'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MCPConnectionCard } from './mcp-connection-card';
import { revokeMCPConnection, type Connection } from '../mcp-actions';

interface MCPConnectionsListProps {
  connections: Connection[];
  organizationId: string;
}

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function MCPConnectionsList({ connections, organizationId }: MCPConnectionsListProps) {
  const [isPending, startTransition] = useTransition();
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkRevokeDialogOpen, setBulkRevokeDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [selectedRows, setSelectedRows] = useState<Connection[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [tableData, setTableData] = useState(connections);

  useEffect(() => {
    setTableData(connections);
  }, [connections]);

  const handleRevoke = (connection: Connection) => {
    setRevokingId(connection.id);
    startTransition(async () => {
      const result = await revokeMCPConnection(connection.id, organizationId);

      if (result.success) {
        toast.success('Connection revoked successfully');
        setTableData((prev) => prev.filter((item) => item.id !== connection.id));
        setDeleteDialogOpen(false);
        setConnectionToDelete(null);
        setSelectedRows((prev) => prev.filter((item) => item.id !== connection.id));
      } else {
        toast.error(result.error || 'Failed to revoke connection');
      }
      setRevokingId(null);
    });
  };

  const handleBulkRevoke = () => {
    if (selectedRows.length === 0) return;

    startTransition(async () => {
      let successCount = 0;
      let failCount = 0;
      const successIds: string[] = [];

      for (const connection of selectedRows) {
        const result = await revokeMCPConnection(connection.id, organizationId);
        if (result.success) {
          successCount += 1;
          successIds.push(connection.id);
        } else {
          failCount += 1;
        }
      }

      if (successCount > 0) {
        toast.success(`Revoked ${successCount} connection(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to revoke ${failCount} connection(s)`);
      }

      if (successIds.length > 0) {
        setTableData((prev) => prev.filter((item) => !successIds.includes(item.id)));
      }
      setBulkRevokeDialogOpen(false);
      setSelectedRows([]);
    });
  };

  const columns: ColumnDef<Connection>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.id}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_connected',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            row.original.is_connected
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
          }`}
        >
          {row.original.is_connected ? 'Connected' : 'Disconnected'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: 'last_used_at',
      header: 'Last Used',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.last_used_at ? formatDateTime(row.original.last_used_at) : 'Never'}
        </span>
      ),
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.expires_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const connection = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(connection.id);
                  toast.success('Connection ID copied to clipboard');
                }}
              >
                Copy connection ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setConnectionToDelete(connection);
                  setDeleteDialogOpen(true);
                }}
                disabled={isPending && revokingId === connection.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke connection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [isPending, revokingId]);

  const bulkActionButton = selectedRows.length > 0 ? (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setBulkRevokeDialogOpen(true)}
      disabled={isPending}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Revoke ({selectedRows.length})
    </Button>
  ) : null;

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        searchKey="name"
        searchPlaceholder="Filter by name..."
        title="MCP Connections"
        description="Manage Model Context Protocol (MCP) connections for this organization. Generate tokens to connect MCP clients like Claude Desktop, Cline, or other compatible tools."
        action={
          <Button
            size="sm"
            onClick={() => setAddConnectionOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Connection
          </Button>
        }
        enableRowSelection={true}
        onRowSelectionChange={setSelectedRows}
        bulkActions={bulkActionButton}
        emptyStateMessage="No active connections. Generate a token to get started."
      />

      <Dialog open={addConnectionOpen} onOpenChange={setAddConnectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Connection</DialogTitle>
            <DialogDescription>
              Generate a token for MCP clients. Tokens expire after 90 days.
            </DialogDescription>
          </DialogHeader>
          <MCPConnectionCard organizationId={organizationId} variant="dialog" />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke <strong>{connectionToDelete?.name}</strong> and immediately
              invalidate its access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => connectionToDelete && handleRevoke(connectionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRevokeDialogOpen} onOpenChange={setBulkRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {selectedRows.length} Connection(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access for the following connections:
            </AlertDialogDescription>
            <ul className="mt-2 list-disc list-inside">
              {selectedRows.slice(0, 5).map((connection) => (
                <li key={connection.id}>
                  <strong>{connection.name}</strong>
                </li>
              ))}
              {selectedRows.length > 5 && (
                <li>...and {selectedRows.length - 5} more</li>
              )}
            </ul>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke {selectedRows.length} Connection(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
