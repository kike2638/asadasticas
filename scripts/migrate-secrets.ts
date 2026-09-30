// scripts/migrate-secrets.ts - Re-cifra secretos existentes al formato AES-256-GCM
// Úsalo UNA vez después de desplegar: lee los valores viejos (CBC) y los guarda
// cifrados con clave derivada por tenant. Idempotente: los ya migrados se saltan.
import { prisma } from "../src/lib/prisma";
import { cifrar, descifrar, esCifradoGCM } from "../src/lib/crypto";

const CAMPOS: { col: "llaveCryptBase64" | "llavePin" | "haciendaPassword" | "whatsappToken"; nombre: string }[] = [
  { col: "llaveCryptBase64", nombre: "p12" },
  { col: "llavePin", nombre: "pin" },
  { col: "haciendaPassword", nombre: "haciendaPassword" },
  { col: "whatsappToken", nombre: "whatsappToken" },
];

async function main() {
  const configs = await prisma.tenantConfig.findMany();
  console.log(`TenantConfig encontrados: ${configs.length}`);

  let migrados = 0;
  let yaOk = 0;
  let fallidos = 0;

  for (const cfg of configs) {
    for (const { col, nombre } of CAMPOS) {
      const valor = (cfg as any)[col] as string | null;
      if (!valor) continue;
      if (esCifradoGCM(valor)) { yaOk++; continue; }

      let enClaro = valor;
      try {
        enClaro = descifrar(valor, cfg.tenantId, nombre); // lee el legacy CBC
      } catch (e: any) {
        // si falla el legacy, es que estaba en texto plano (ej. el P12 antiguo)
        enClaro = valor;
      }
      try {
        await prisma.tenantConfig.update({ where: { tenantId: cfg.tenantId }, data: { [col]: cifrar(enClaro, cfg.tenantId, nombre) } as any });
        migrados++;
        console.log(`  OK ${cfg.tenantId} ${col}`);
      } catch (e: any) {
        fallidos++;
        console.log(`  ERROR ${cfg.tenantId} ${col}: ${e.message}`);
      }
    }
  }

  console.log(`\nMigrados: ${migrados} | ya en GCM: ${yaOk} | fallidos: ${fallidos}`);
  if (fallidos > 0) {
    console.log("Revisa los fallidos:Master Key distinta o datos corruptos.");
    process.exit(1);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
