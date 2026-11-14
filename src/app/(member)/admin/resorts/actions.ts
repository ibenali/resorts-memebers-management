"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addSeason, deleteSeason, saveResort } from "@/lib/admin/service";
import { audit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { getRequestInfo } from "@/lib/auth/request-info";
import { idSchema, resortSchema, seasonSchema } from "@/lib/validation/admin";

export type ResortFormState = { error?: "invalid" | "slug_taken" };
export type SeasonFormState = { error?: "invalid" | "overlap" | "resort"; addedAt?: number };

function revalidateResorts() {
  revalidatePath("/admin", "layout");
  revalidatePath("/resorts", "layout");
  revalidatePath("/urlaub/neu");
}

export async function saveResortAction(
  id: number | null,
  _prev: ResortFormState,
  formData: FormData,
): Promise<ResortFormState> {
  const { member } = await requireAdmin();
  const parsed = resortSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    location: formData.get("location"),
    country: formData.get("country"),
    description: formData.get("description"),
    amenities: formData.get("amenities") ?? "",
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
    contactPhone: formData.get("contactPhone") ?? undefined,
    contactEmail: formData.get("contactEmail") ?? undefined,
    imageUrl: formData.get("imageUrl") ?? undefined,
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "invalid" };

  const result = await saveResort(parsed.data, id);
  if (!result.ok) return { error: result.error };

  const { ip } = await getRequestInfo();
  await audit("admin_resort_saved", member.id, ip);
  revalidateResorts();
  redirect(`/admin/resorts/${result.id}?result=saved`);
}

export async function addSeasonAction(
  resortId: number,
  _prev: SeasonFormState,
  formData: FormData,
): Promise<SeasonFormState> {
  const { member } = await requireAdmin();
  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { error: "invalid" };

  const result = await addSeason(resortId, parsed.data);
  if (!result.ok) return { error: result.error };

  const { ip } = await getRequestInfo();
  await audit("admin_season_added", member.id, ip);
  revalidateResorts();
  return { addedAt: Date.now() };
}

export async function deleteSeasonAction(formData: FormData): Promise<void> {
  const { member } = await requireAdmin();
  const resortId = idSchema.safeParse(formData.get("resortId"));
  const seasonId = idSchema.safeParse(formData.get("seasonId"));
  if (!resortId.success || !seasonId.success) redirect("/admin/resorts");

  if (await deleteSeason(resortId.data, seasonId.data)) {
    const { ip } = await getRequestInfo();
    await audit("admin_season_deleted", member.id, ip);
  }
  revalidateResorts();
  redirect(`/admin/resorts/${resortId.data}?result=season_deleted`);
}
