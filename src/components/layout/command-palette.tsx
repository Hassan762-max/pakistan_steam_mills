"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { FileSearch, Search } from "lucide-react";
import { NAVIGATION, type NavItem } from "@/lib/navigation";
import { getNavIcon } from "@/lib/nav-icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { searchAction } from "@/server/actions/search";

function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...flattenNav(item.children)] : [item],
  );
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: NavItem[];
}

type SearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  type: string;
  module: string;
};

export function CommandPalette({
  open,
  onOpenChange,
  items = NAVIGATION,
}: CommandPaletteProps) {
  const router = useRouter();
  const flatItems = React.useMemo(() => flattenNav(items), [items]);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchAction(query);
      if (!cancelled) {
        setHits(result.data ?? []);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-md sm:max-w-lg [&>button]:hidden">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:size-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:size-4"
        >
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search navigation, employees, inventory…"
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {searching ? "Searching…" : "No results found."}
            </Command.Empty>

            {hits.length > 0 ? (
              <Command.Group heading="Records">
                {hits.map((hit) => (
                  <Command.Item
                    key={`${hit.module}-${hit.id}`}
                    value={`${hit.title} ${hit.subtitle ?? ""} ${hit.href}`}
                    onSelect={() => runCommand(() => router.push(hit.href))}
                    className={cn(
                      "relative flex cursor-default select-none items-center gap-2 rounded-md text-sm outline-none data-[selected=true]:bg-muted",
                    )}
                  >
                    <FileSearch className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{hit.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {hit.type}
                        {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group heading="Navigate">
              {flatItems
                .filter((item) => {
                  if (!query.trim()) return true;
                  const q = query.toLowerCase();
                  return (
                    item.title.toLowerCase().includes(q) ||
                    item.href.toLowerCase().includes(q)
                  );
                })
                .map((item) => {
                  const Icon = getNavIcon(item.icon);
                  return (
                    <Command.Item
                      key={`${item.href}-${item.title}`}
                      value={`${item.title} ${item.href}`}
                      onSelect={() => runCommand(() => router.push(item.href))}
                      className={cn(
                        "relative flex cursor-default select-none items-center gap-2 rounded-md text-sm outline-none data-[selected=true]:bg-muted",
                      )}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{item.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{item.href}</span>
                    </Command.Item>
                  );
                })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
