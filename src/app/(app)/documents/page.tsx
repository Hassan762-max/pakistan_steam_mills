import { Suspense } from "react";
import { requirePageUser } from "@/lib/require-page-user";
import { listDocuments } from "@/server/services/documents";
import { hasPermission } from "@/server/authorization/rbac";
import { P } from "@/lib/permissions";
import { withPageAuth } from "@/lib/page-auth";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/ui/list-filters";
import { ServerPagination } from "@/components/ui/server-pagination";
import { StatusBadge, type StatusBadgeStatus } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArchiveDocumentButton, DocumentActions } from "./document-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await requirePageUser();

  const search = typeof sp.search === "string" ? sp.search : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const canCreate = hasPermission(user, P.DOCUMENTS_DOCUMENTS_CREATE);
  const canDelete = hasPermission(user, P.DOCUMENTS_DOCUMENTS_DELETE);

  const result = await withPageAuth(() =>
    listDocuments(user, {
      search,
      category: category === "all" ? undefined : category,
      page,
      pageSize: 20,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Controlled document registry for policies and operational files."
        actions={<DocumentActions canCreate={canCreate} />}
      />

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <ListFilters
          fields={[
            { name: "search", label: "Search", type: "search", placeholder: "Title or file name…" },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: [
                "policy",
                "hr",
                "safety",
                "quality",
                "finance",
                "technical",
                "other",
              ].map((c) => ({ value: c, label: c })),
            },
          ]}
        />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState title="No documents" description="Register a document to begin the catalog." />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell className="capitalize">{doc.category}</TableCell>
                    <TableCell className="font-mono text-xs">{doc.fileName}</TableCell>
                    <TableCell>
                      {doc.sizeBytes != null ? `${formatNumber(Math.round(doc.sizeBytes / 1024))} KB` : "—"}
                    </TableCell>
                    <TableCell>
                      {doc.uploadedBy
                        ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(doc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={(doc.status as StatusBadgeStatus) || "active"} />
                    </TableCell>
                    <TableCell>
                      <ArchiveDocumentButton id={doc.id} canDelete={canDelete} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ServerPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/documents"
            searchParams={{ search, category }}
          />
        </div>
      )}
    </div>
  );
}
