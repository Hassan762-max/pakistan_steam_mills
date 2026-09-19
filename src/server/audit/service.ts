import { createHash } from "crypto";
import { db } from "@/server/db";

export type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  module: string;
  resource: string;
  resourceId?: string | null;
  description?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function serialize(value: unknown) {
  if (value == null) return null;
  return JSON.stringify(value);
}

/**
 * Tamper-resistant audit logging: each entry stores an integrity hash
 * over canonical fields + previous hash chain seed (auth secret).
 */
export async function writeAuditLog(input: AuditInput) {
  const beforeValue = serialize(input.beforeValue);
  const afterValue = serialize(input.afterValue);
  const createdAt = new Date();

  const canonical = [
    input.actorId ?? "",
    input.action,
    input.module,
    input.resource,
    input.resourceId ?? "",
    beforeValue ?? "",
    afterValue ?? "",
    createdAt.toISOString(),
  ].join("|");

  const integrityHash = createHash("sha256")
    .update(canonical + (process.env.AUTH_SECRET ?? "dev"))
    .digest("hex");

  return db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      module: input.module,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      description: input.description ?? null,
      beforeValue,
      afterValue,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      integrityHash,
      createdAt,
    },
  });
}

export async function verifyAuditIntegrity(id: string) {
  const entry = await db.auditLog.findUnique({ where: { id } });
  if (!entry || !entry.integrityHash) return false;

  const canonical = [
    entry.actorId ?? "",
    entry.action,
    entry.module,
    entry.resource,
    entry.resourceId ?? "",
    entry.beforeValue ?? "",
    entry.afterValue ?? "",
    entry.createdAt.toISOString(),
  ].join("|");

  const expected = createHash("sha256")
    .update(canonical + (process.env.AUTH_SECRET ?? "dev"))
    .digest("hex");

  return expected === entry.integrityHash;
}
