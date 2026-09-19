import { redirect } from "next/navigation";

/** Common typo / alias for the sign-in page */
export default function SigningAliasPage() {
  redirect("/login");
}
