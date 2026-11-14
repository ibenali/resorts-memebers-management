import "server-only";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/auth/audit";
import { getDb, schema } from "@/lib/db";
import type { AddressInput } from "@/lib/validation/profile";

export async function getProfile(memberId: number) {
  const [row] = await getDb()
    .select({
      memberNo: schema.members.memberNo,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      email: schema.members.email,
      street: schema.members.street,
      postalCode: schema.members.postalCode,
      city: schema.members.city,
      country: schema.members.country,
    })
    .from(schema.members)
    .where(eq(schema.members.id, memberId));
  return row ?? null;
}

export async function updateAddress(memberId: number, input: AddressInput, ip: string | null) {
  await getDb().update(schema.members).set(input).where(eq(schema.members.id, memberId));
  await audit("address_changed", memberId, ip);
}
