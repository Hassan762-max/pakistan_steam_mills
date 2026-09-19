"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type FilterField = {
  name: string;
  label: string;
  type: "search" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  allLabel?: string;
};

type ListFiltersProps = {
  fields: FilterField[];
};

export function ListFilters({ fields }: ListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updates: Record<string, string> = {};
    for (const field of fields) {
      updates[field.name] = String(fd.get(field.name) ?? "");
    }
    apply(updates);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {fields.map((field) => {
        if (field.type === "search") {
          return (
            <div key={field.name} className="min-w-[200px] flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={field.name}>
                {field.label}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={field.name}
                  name={field.name}
                  defaultValue={searchParams.get(field.name) ?? ""}
                  placeholder={field.placeholder ?? "Search…"}
                  className="pl-8"
                />
              </div>
            </div>
          );
        }

        const current = searchParams.get(field.name) ?? "all";
        return (
          <div key={field.name} className="w-full space-y-1.5 sm:w-44">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            <Select
              defaultValue={current}
              onValueChange={(value) => apply({ [field.name]: value })}
              name={field.name}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.allLabel ?? "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{field.allLabel ?? "All"}</SelectItem>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name={field.name} value={current === "all" ? "" : current} />
          </div>
        );
      })}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Filtering…" : "Apply"}
      </Button>
    </form>
  );
}
