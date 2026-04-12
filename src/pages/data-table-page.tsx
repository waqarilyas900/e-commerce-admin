import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/** Sample row shape for the table demo */
export type MockRecord = {
  id: string;
  name: string;
  status: "active" | "draft" | "archived";
  created_at: string;
};

const demoRows: MockRecord[] = [
  {
    id: "8b1e8c2a-4f3b-4c1a-9d2e-111111111101",
    name: "Accessories — cables",
    status: "active",
    created_at: "2026-04-01T12:00:00.000Z",
  },
  {
    id: "8b1e8c2a-4f3b-4c1a-9d2e-111111111102",
    name: "Keyboards — compact",
    status: "draft",
    created_at: "2026-04-03T09:30:00.000Z",
  },
  {
    id: "8b1e8c2a-4f3b-4c1a-9d2e-111111111103",
    name: "Monitors — 27 inch",
    status: "archived",
    created_at: "2026-04-05T16:45:00.000Z",
  },
  {
    id: "8b1e8c2a-4f3b-4c1a-9d2e-111111111104",
    name: "Audio — headsets",
    status: "active",
    created_at: "2026-04-08T11:20:00.000Z",
  },
  {
    id: "8b1e8c2a-4f3b-4c1a-9d2e-111111111105",
    name: "Hubs & docks",
    status: "active",
    created_at: "2026-04-10T08:15:00.000Z",
  },
];

type DemoState = "ok" | "loading" | "empty" | "error";

function statusVariant(
  s: MockRecord["status"],
): "success" | "secondary" | "outline" {
  if (s === "active") return "success";
  if (s === "draft") return "secondary";
  return "outline";
}

export function DataTablePage() {
  const [demoState, setDemoState] = useState<DemoState>("ok");
  const [rows, setRows] = useState<MockRecord[]>(demoRows);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const columns = useMemo<ColumnDef<MockRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (info) => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const v = info.getValue() as MockRecord["status"];
          return <Badge variant={statusVariant(v)}>{v}</Badge>;
        },
      },
      {
        accessorKey: "id",
        header: "ID",
        cell: (info) => (
          <code className="text-xs text-muted-foreground">
            {(info.getValue() as string).slice(0, 8)}…
          </code>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {new Date(info.getValue() as string).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  const tableData = demoState === "empty" ? [] : rows;
  const isLoading = demoState === "loading";
  const errorMessage = demoState === "error" ? "Failed to fetch resource." : null;

  const table = useReactTable({
    data: tableData,
    columns,
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  function handleCreate() {
    const name = newName.trim() || "Untitled row";
    const row: MockRecord = {
      id: crypto.randomUUID(),
      name,
      status: "draft",
      created_at: new Date().toISOString(),
    };
    setRows((r) => [row, ...r]);
    setNewName("");
    setCreateOpen(false);
    setDemoState("ok");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data"
        description="TanStack Table demo — search, pagination, and create dialog using local sample rows."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Preview loading and empty states:</span>
            {(["ok", "loading", "empty", "error"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={demoState === s ? "default" : "outline"}
                onClick={() => setDemoState(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <div>
            <CardTitle>Records</CardTitle>
            <CardDescription>
              Global search, pagination, and create dialog.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter rows…"
                className="pl-8"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                disabled={isLoading || !!errorMessage}
              />
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={isLoading || !!errorMessage}
            >
              <Plus className="h-4 w-4" />
              Create new
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <span>{errorMessage}</span>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/50"
                onClick={() => setDemoState("ok")}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          )}

          <div className="relative overflow-hidden rounded-lg border">
            {isLoading && (
              <div className="space-y-0 divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4">
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !errorMessage && table.getRowModel().rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium">No rows found</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try clearing the filter or create a record. Switch the preview control to &quot;ok&quot; if you are
                  testing the empty state.
                </p>
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => {
                    setGlobalFilter("");
                    setDemoState("ok");
                  }}
                >
                  Reset filter
                </Button>
              </div>
            )}

            {!isLoading && !errorMessage && table.getRowModel().rows.length > 0 && (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-4 py-3 text-left font-medium text-muted-foreground"
                        >
                          {h.isPlaceholder
                            ? null
                            : flexRender(
                                h.column.columnDef.header,
                                h.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && !errorMessage && table.getRowModel().rows.length > 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount() || 1} — {table.getFilteredRowModel().rows.length}{" "}
                row(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create record</DialogTitle>
            <DialogDescription>Adds a row in memory for this demo only — connect your API to persist records.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="row-name">Name</Label>
            <Input
              id="row-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Row label"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
