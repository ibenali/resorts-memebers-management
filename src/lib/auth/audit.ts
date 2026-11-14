import "server-only";
import { getDb, schema } from "@/lib/db";

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "login_ip_blocked"
  | "logout"
  | "password_changed"
  | "address_changed";

export async function audit(action: AuditAction, memberId: number | null, ip: string | null) {
  await getDb().insert(schema.auditLog).values({ action, memberId, ip });
}
