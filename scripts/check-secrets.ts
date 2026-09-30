// scripts/check-secrets.ts - Verificación: confirma que ningún secreto quedó en texto plano
// Ejecutar después de la migración y como control periódico.
import { prisma } from "../src/lib/prisma";
import { esCifradoGCM, descifrar } from "../src/lib/crypto";

const CAMPOS: { col: "llaveCryptBase64" | "llavePin" | "haciendaPassword" | "whatsappToken"; nombre: string }[] = [
  { col: "llaveCryptBase64", nombre: "p12" },
  { col: "llavePin", nombre: "pin" },
  { col: "haciendaPassword", nombre: "haciendaPassword" },
  { col: "whatsappToken", nombre: "whatsappToken" },
];

async function main() {
  const configs = await prisma.tenantConfig.findMany({ include: { tenant: { select: { name: true } } } });
  let problemas = 0;

  for (const cfg of configs) {
    console.log(`\n${cfg.tenant.name} (${cfg.tenantId})`);
    for (const { col, nombre } of CAMPOS) {
      const valor = (cfg as any)[col] as string | null;
      if (!valor) { console.log(`  ${col.padEnd(18)} (vacío)`); continue; }
      if (!esCifradoGCM(valor)) { problemas++; console.log(`  ✗ ${col.padEnd(18)} EN TEXTO PLANO`); continue; }
      try {
        const claro = descifrar(valor, cfg.tenantId, nombre);
        // no imprimimos el valor, solo que descifra y de qué tipo es
        const tipo = /^[A-Za-z0-9+/]+={0,2}$/.test(claro) ? `base64 (${Buffer.from(claro, "base64").length} bytes)` : `texto (${claro.length} chars)`;
        console.log(`  ✓ ${col.padEnd(18)} cifrado GCM, descifra OK -> ${tipo}`);
      } catch (e: any) {
        problemas++;
        console.log(`  ✗ ${col.padEnd(18)} NO descifra: ${e.message}`);
      }
    }
  }

  console.log(problemas === 0 ? "\nTodo OK: ningún secreto en texto plano." : `\n${problemas} problema(s).`);
  process.exit(problemas === 0 ? 0 : 1);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
