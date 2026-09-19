import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/service";
import { PendingApprovalPanel } from "@/components/auth/pending-approval-panel";

export const metadata = { title: "Pending approval" };

export default async function PendingApprovalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "pending") redirect("/verify-account");
  if (user.status !== "pending_approval" && user.roles.length > 0) {
    redirect("/dashboard");
  }

  return (
    <PendingApprovalPanel
      firstName={user.firstName}
      lastName={user.lastName}
      email={user.email}
      status={user.status}
    />
  );
}
