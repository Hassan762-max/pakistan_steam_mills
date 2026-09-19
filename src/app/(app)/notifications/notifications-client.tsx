"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import type { DataTableColumnDef } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type Props = {
  notifications: NotificationRow[];
  unreadCount: number;
};

export function NotificationsClient({ notifications, unreadCount }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function markOne(id: string) {
    setPending(true);
    const result = await markNotificationReadAction(id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  async function markAll() {
    setPending(true);
    const result = await markAllNotificationsReadAction();
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("All notifications marked read");
    router.refresh();
  }

  const columns = React.useMemo<DataTableColumnDef<NotificationRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Notification",
        cell: ({ row }) => (
          <div className="max-w-md space-y-0.5">
            <div className="flex items-center gap-2">
              {!row.original.isRead ? (
                <Badge variant="accent" className="text-[10px]">
                  New
                </Badge>
              ) : null}
              <span className={row.original.isRead ? "font-medium" : "font-semibold"}>
                {row.original.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{row.original.message}</p>
          </div>
        ),
      },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.link ? (
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link href={row.original.link}>Open</Link>
              </Button>
            ) : null}
            {!row.original.isRead ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => markOne(row.original.id)}
              >
                Mark read
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [pending],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {unreadCount > 0 ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={markAll}>
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={notifications}
        searchPlaceholder="Search notifications…"
        emptyTitle="You're all caught up"
        emptyDescription="No notifications in your inbox."
        getRowId={(r) => r.id}
      />
    </div>
  );
}
