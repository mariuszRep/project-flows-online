'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { bulkDeleteMCPSessions, deleteMCPSession, type MCPSession } from '../mcp-actions';

interface MCPSessionsListProps {
  sessions: MCPSession[];
  organizationId: string;
}

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function MCPSessionsList({ sessions, organizationId }: MCPSessionsListProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<MCPSession | null>(null);
  const [selectedRows, setSelectedRows] = useState<MCPSession[]>([]);
  const [tableData, setTableData] = useState(sessions);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setTableData(sessions);
  }, [sessions]);

  const handleDelete = (session: MCPSession) => {
    setDeletingId(session.sessionId);
    startTransition(async () => {
      const result = await deleteMCPSession(session.sessionId, session.userId, organizationId);

      if (result.success) {
        toast.success('Session deleted successfully');
        setTableData((prev) => prev.filter((item) => item.sessionId !== session.sessionId));
        setDeleteDialogOpen(false);
        setSessionToDelete(null);
        setSelectedRows((prev) => prev.filter((item) => item.sessionId !== session.sessionId));
      } else {
        toast.error(result.error || 'Failed to delete session');
      }
      setDeletingId(null);
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;

    startTransition(async () => {
      const { successCount, failCount, successIds } = await bulkDeleteMCPSessions(
        selectedRows.map((session) => ({ sessionId: session.sessionId, userId: session.userId })),
        organizationId
      );

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} session(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} session(s)`);
      }

      if (successIds.length > 0) {
        const removedIds = new Set(successIds);
        setTableData((prev) => prev.filter((item) => !removedIds.has(item.sessionId)));
      }

      setBulkDeleteDialogOpen(false);
      setSelectedRows([]);
    });
  };

  const columns: ColumnDef<MCPSession>[] = useMemo(() => [
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
      accessorKey: 'sessionId',
      header: 'Session ID',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.sessionId}</span>
          <span className="text-xs text-muted-foreground">User {row.original.userId}</span>
        </div>
      ),
    },
    {
      accessorKey: 'connectionName',
      header: 'Connection',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {row.original.connectionName || 'Unknown connection'}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.connectionId || 'No connection ID'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: () => (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
          Active
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const session = row.original;
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
                  navigator.clipboard.writeText(session.sessionId);
                  toast.success('Session ID copied to clipboard');
                }}
              >
                Copy session ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setSessionToDelete(session);
                  setDeleteDialogOpen(true);
                }}
                disabled={isPending && deletingId === session.sessionId}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [deletingId, isPending]);

  const bulkActionButton = selectedRows.length > 0 ? (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setBulkDeleteDialogOpen(true)}
      disabled={isPending}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete ({selectedRows.length})
    </Button>
  ) : null;

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        searchKey="sessionId"
        searchPlaceholder="Filter by session ID..."
        title="MCP Sessions"
        description="Review active MCP sessions for this organization and revoke access when needed."
        enableRowSelection={true}
        onRowSelectionChange={setSelectedRows}
        bulkActions={bulkActionButton}
        emptyStateMessage="No active sessions found."
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will terminate the selected session and revoke its access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && handleDelete(sessionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRows.length} Session(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access for the following sessions:
            </AlertDialogDescription>
            <ul className="mt-2 list-disc list-inside">
              {selectedRows.slice(0, 5).map((session) => (
                <li key={session.sessionId}>
                  <strong>{session.sessionId}</strong>
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
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedRows.length} Session(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
