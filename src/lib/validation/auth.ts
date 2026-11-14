import { z } from "zod";
import { authConfig } from "@/lib/auth/config";

export const loginSchema = z.object({
  memberNo: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((v) => v.toUpperCase()),
  password: z.string().min(1).max(authConfig.passwordMaxLength),
  next: z.string().max(500).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(authConfig.passwordMaxLength),
    newPassword: z.string().max(authConfig.passwordMaxLength),
    confirmPassword: z.string().max(authConfig.passwordMaxLength),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });
