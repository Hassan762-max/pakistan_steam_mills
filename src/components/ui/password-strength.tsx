"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type PasswordStrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

export function evaluatePasswordStrength(password: string): {
  score: number;
  level: PasswordStrengthLevel;
  label: string;
} {
  if (!password) {
    return { score: 0, level: "empty", label: "Enter a password" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, level: "weak", label: "Weak" };
  if (score === 2) return { score, level: "fair", label: "Fair" };
  if (score === 3 || score === 4) return { score, level: "good", label: "Good" };
  return { score, level: "strong", label: "Strong" };
}

const levelStyles: Record<PasswordStrengthLevel, string> = {
  empty: "bg-muted",
  weak: "bg-destructive",
  fair: "bg-warning",
  good: "bg-info",
  strong: "bg-success",
};

export interface PasswordStrengthProps extends React.HTMLAttributes<HTMLDivElement> {
  password: string;
  showLabel?: boolean;
}

function PasswordStrength({
  password,
  showLabel = true,
  className,
  ...props
}: PasswordStrengthProps) {
  const { level, label, score } = evaluatePasswordStrength(password);
  const filled = level === "empty" ? 0 : Math.min(4, Math.max(1, score - 1));

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index < filled ? levelStyles[level] : "bg-muted",
            )}
          />
        ))}
      </div>
      {showLabel ? (
        <p
          className={cn(
            "text-xs",
            level === "weak" && "text-destructive",
            level === "fair" && "text-warning-foreground dark:text-warning",
            level === "good" && "text-info",
            level === "strong" && "text-success",
            level === "empty" && "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {label}
        </p>
      ) : null}
    </div>
  );
}

export { PasswordStrength };
