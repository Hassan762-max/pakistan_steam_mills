"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveDocumentAction, createDocumentAction } from "@/server/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
const CATEGORIES = [
  "policy",
  "hr",
  "safety",
  "quality",
  "finance",
  "technical",
  "other",
];

export function DocumentActions({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Register document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register document metadata</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const fileName = String(fd.get("fileName"));
            startTransition(async () => {
              const result = await createDocumentAction({
                title: String(fd.get("title")),
                fileName,
                filePath: `/uploads/${fileName}`,
                category: String(fd.get("category")),
                accessLevel: String(fd.get("accessLevel") || "internal"),
                mimeType: String(fd.get("mimeType") || "") || undefined,
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Document registered");
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fileName">File name</Label>
            <Input id="fileName" name="fileName" required placeholder="policy-handbook.pdf" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue="other"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accessLevel">Access level</Label>
            <Input id="accessLevel" name="accessLevel" defaultValue="internal" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mimeType">MIME type</Label>
            <Input id="mimeType" name="mimeType" placeholder="application/pdf" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveDocumentButton({
  id,
  canDelete,
}: {
  id: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!canDelete) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await archiveDocumentAction(id);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Document archived");
            router.refresh();
          }
        });
      }}
    >
      Archive
    </Button>
  );
}
