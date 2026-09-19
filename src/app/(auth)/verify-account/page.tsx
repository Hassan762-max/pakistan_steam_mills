import type { Metadata } from "next";
import { VerifyAccountForm } from "@/components/auth/verify-account-form";

export const metadata: Metadata = {
  title: "Verify account",
};

export default async function VerifyAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <VerifyAccountForm initialToken={token} />;
}
