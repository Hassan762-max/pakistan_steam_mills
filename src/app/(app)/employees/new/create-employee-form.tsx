"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createEmployeeAction } from "@/server/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; label: string };

export function CreateEmployeeForm({
  departments,
  designations,
  plants,
}: {
  departments: Option[];
  designations: Option[];
  plants: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEmployeeAction({
        employeeNumber: String(fd.get("employeeNumber")),
        firstName: String(fd.get("firstName")),
        lastName: String(fd.get("lastName")),
        email: String(fd.get("email") || "") || undefined,
        phone: String(fd.get("phone") || "") || undefined,
        departmentId: String(fd.get("departmentId") || "") || undefined,
        designationId: String(fd.get("designationId") || "") || undefined,
        plantId: String(fd.get("plantId") || "") || undefined,
        employmentType: String(fd.get("employmentType") || "permanent"),
        grade: String(fd.get("grade") || "") || undefined,
        joiningDate: String(fd.get("joiningDate") || "") || undefined,
        cnic: String(fd.get("cnic") || "") || undefined,
        gender: String(fd.get("gender") || "") || undefined,
        city: String(fd.get("city") || "") || undefined,
        address: String(fd.get("address") || "") || undefined,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to create employee");
        return;
      }
      toast.success("Employee created");
      router.push(`/employees/${result.data?.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="employeeNumber">Employee number</Label>
            <Input id="employeeNumber" name="employeeNumber" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="joiningDate">Joining date</Label>
            <Input id="joiningDate" name="joiningDate" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnic">CNIC</Label>
            <Input id="cnic" name="cnic" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Input id="gender" name="gender" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plantId">Plant</Label>
            <select
              id="plantId"
              name="plantId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="">Select plant</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Department</Label>
            <select
              id="departmentId"
              name="departmentId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="designationId">Designation</Label>
            <select
              id="designationId"
              name="designationId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="">Select designation</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employmentType">Employment type</Label>
            <Input id="employmentType" name="employmentType" defaultValue="permanent" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade">Grade</Label>
            <Input id="grade" name="grade" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create employee"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
