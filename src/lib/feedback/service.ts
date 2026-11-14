import "server-only";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { FeedbackInput } from "@/lib/validation/feedback";

/** Schutz vor versehentlichem Mehrfachsenden und Spam. */
export const FEEDBACK_LIMIT_PER_HOUR = 10;

export async function listOwnFeedback(memberId: number) {
  return getDb()
    .select({
      id: schema.feedback.id,
      category: schema.feedback.category,
      subject: schema.feedback.subject,
      message: schema.feedback.message,
      status: schema.feedback.status,
      createdAt: schema.feedback.createdAt,
      resortName: schema.resorts.name,
    })
    .from(schema.feedback)
    .leftJoin(schema.resorts, eq(schema.resorts.id, schema.feedback.resortId))
    .where(eq(schema.feedback.memberId, memberId))
    .orderBy(desc(schema.feedback.createdAt), desc(schema.feedback.id))
    .limit(50);
}

export type SubmitFeedbackResult = { ok: true } | { ok: false; error: "rate_limited" | "resort" };

export async function submitFeedback(
  memberId: number,
  input: FeedbackInput,
): Promise<SubmitFeedbackResult> {
  const db = getDb();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [recent] = await db
    .select({ n: count() })
    .from(schema.feedback)
    .where(and(eq(schema.feedback.memberId, memberId), gt(schema.feedback.createdAt, since)));
  if ((recent?.n ?? 0) >= FEEDBACK_LIMIT_PER_HOUR) return { ok: false, error: "rate_limited" };

  if (input.resortId !== null) {
    const [resort] = await db
      .select({ id: schema.resorts.id })
      .from(schema.resorts)
      .where(and(eq(schema.resorts.id, input.resortId), eq(schema.resorts.active, true)));
    if (!resort) return { ok: false, error: "resort" };
  }

  await db.insert(schema.feedback).values({ ...input, memberId });
  return { ok: true };
}
