"use server";

import { revalidatePath } from "next/cache";
import type { ChangePasswordState } from "@/components/change-password-form";
import { handleChangePassword } from "@/lib/auth/change-password-action";
import { requireMember } from "@/lib/auth/guard";
import { getRequestInfo } from "@/lib/auth/request-info";
import { updateAddress } from "@/lib/profile/service";
import { addressSchema } from "@/lib/validation/profile";

export type AddressState = { error?: "invalid"; savedAt?: number };

export async function updateAddressAction(
  _prev: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const { member } = await requireMember();
  const parsed = addressSchema.safeParse({
    street: formData.get("street"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
  });
  if (!parsed.success) return { error: "invalid" };

  const { ip } = await getRequestInfo();
  await updateAddress(member.id, parsed.data, ip);
  revalidatePath("/profil");
  return { savedAt: Date.now() };
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireMember();
  return handleChangePassword(session, formData);
}
