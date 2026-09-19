import { requirePageUser } from "@/lib/require-page-user";
import { listPermissions } from "@/server/services/roles";
import { withPageAuth } from "@/lib/page-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function PermissionsPage() {
  const user = await requirePageUser();
  const permissions = await withPageAuth(() => listPermissions(user));

  const byModule = permissions.reduce<
    Record<string, Record<string, typeof permissions>>
  >((acc, p) => {
    acc[p.module] ??= {};
    acc[p.module][p.resource] ??= [];
    acc[p.module][p.resource].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions catalog"
        description="Read-only MODULE → RESOURCE → ACTION permission registry."
      />

      {permissions.length === 0 ? (
        <EmptyState title="No permissions" description="Permission catalog is empty." />
      ) : (
        <div className="space-y-4">
          {Object.entries(byModule).map(([module, resources]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle className="font-heading text-base capitalize">{module}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(resources).map(([resource, actions]) => (
                  <div key={resource}>
                    <p className="mb-2 text-sm font-medium capitalize text-muted-foreground">
                      {resource}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {actions.map((p) => (
                        <Badge key={p.id} variant="secondary" className="font-normal">
                          <span className="capitalize">{p.action}</span>
                          <span className="ml-1.5 text-muted-foreground">· {p.code}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
