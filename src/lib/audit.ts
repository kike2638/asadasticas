// src/lib/audit.ts - Auditoría mínima sin tabla extra (usa console + futuro AuditLog)
// Para producción: migrar a tabla AuditLog con prisma

export type AuditAction = "CREATE_INVOICE" | "REGISTER_PAYMENT" | "CREATE_READING" | "IMPORT_CSV" | "CASH_CLOSE" | "LOGIN" | "REVERSE_PAYMENT";

export async function auditLog(tenantId: string, userId: string, action: AuditAction, entity: string, meta?: any) {
  const entry = {
    ts: new Date().toISOString(),
    tenantId,
    userId,
    action,
    entity,
    meta,
  };
  console.log(`[AUDIT] ${action} ${entity} by ${userId.slice(0, 8)}`, JSON.stringify(meta ?? {}).slice(0, 200));
  // TODO: prisma.auditLog.create({ data: { tenantId, userId, action, entity, meta } })
  return entry;
}

export function requireRole(userRole: string, allowed: string[]): boolean {
  return allowed.includes(userRole);
}
