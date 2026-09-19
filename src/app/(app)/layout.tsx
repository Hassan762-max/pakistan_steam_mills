import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/service";
import { filterNavigation } from "@/lib/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { listNotifications } from "@/server/services/notifications";
import { initials } from "@/lib/utils";
import { PendingApprovalPanel } from "@/components/auth/pending-approval-panel";

function needsRoleAssignment(user: { status: string; roles: { id: string }[] }) {
  return user.status === "pending_approval" || user.roles.length === 0;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "locked") redirect("/account-locked");
  if (user.status === "pending") redirect("/verify-account");

  if (needsRoleAssignment(user)) {
    return (
      <AppShell
        navItems={[]}
        notificationCount={0}
        title="Account pending"
        user={{
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          image: user.avatarUrl,
          initials: initials(user.firstName, user.lastName),
        }}
      >
        <PendingApprovalPanel
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          status={user.status}
        />
      </AppShell>
    );
  }

  const navItems = filterNavigation(user.permissions);
  let unread = 0;
  try {
    if (user.permissions.includes("notifications.notifications.view")) {
      const notes = await listNotifications(user, { pageSize: 1 });
      unread = notes.unreadCount ?? 0;
    }
  } catch {
    unread = 0;
  }

  return (
    <AppShell
      navItems={navItems}
      notificationCount={unread}
      user={{
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        image: user.avatarUrl,
        initials: initials(user.firstName, user.lastName),
      }}
    >
      {children}
    </AppShell>
  );
}
