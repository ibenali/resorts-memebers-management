"use server";

import { redirect } from "next/navigation";
import { audit } from "./audit";
import { getRequestInfo } from "./request-info";
import { destroyCurrentSession } from "./session";

export async function logoutAction() {
  const memberId = await destroyCurrentSession();
  if (memberId) {
    const { ip } = await getRequestInfo();
    await audit("logout", memberId, ip);
  }
  redirect("/login");
}
