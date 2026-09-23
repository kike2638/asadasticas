import { headers } from "next/headers";

export async function getServerUser() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");
  const userEmail = headersList.get("x-user-email");

  if (!tenantId || !userId) {
    return null;
  }

  return {
    user: {
      id: userId,
      email: userEmail,
      tenantId,
      role: userRole,
    },
  };
}
