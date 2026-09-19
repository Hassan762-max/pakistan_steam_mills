import type { Metadata } from "next";
import { dmSans, spaceGrotesk } from "@/lib/fonts";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pakistan Steel Mills Management System",
    template: "%s · PSM Management",
  },
  description:
    "Enterprise management platform for Pakistan Steel Mills — production, inventory, HR, procurement, and operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
