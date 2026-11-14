import "server-only";
import { getDb, schema } from "@/lib/db";

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "login_ip_blocked"
  | "logout"
  | "password_changed"
  | "address_changed"
  | "admin_vacation_approved"
  | "admin_vacation_rejected"
  | "admin_feedback_status"
  | "admin_resort_saved"
  | "admin_season_added"
  | "admin_season_deleted";

export async function audit(action: AuditAction, memberId: number | null, ip: string | null) {
  await getDb().insert(schema.auditLog).values({ action, memberId, ip });
}
