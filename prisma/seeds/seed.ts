import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de plataforma...');

  // 1. Crear el Tenant de la Plataforma (Dueño del SaaS)
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'plataforma-admin' },
    update: {},
    create: {
      id: uuidv4(),
      slug: 'plataforma-admin',
      name: 'ASADAS Software (SaaS Admin)',
      plan: 'PRO',
      status: 'ACTIVE',
    },
  });

  // 2. Crear usuario Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@asadas-erp.cr' },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: platformTenant.id,
      email: 'admin@asadas-erp.cr',
      role: 'PLATFORM_OWNER',
    },
  });

  // 3. Crear una ASADA de prueba inicial
  const asadaPrueba = await prisma.tenant.upsert({
    where: { slug: 'asada-ejemplo' },
    update: {},
    create: {
      id: uuidv4(),
      slug: 'asada-ejemplo',
      name: 'ASADA San Rafael',
      plan: 'BASIC',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Seed completado.');
  console.log('   - Tenant Admin ID:', platformTenant.id);
  console.log('   - Usuario Super Admin:', superAdmin.email);
  console.log('   - Tenant Ejemplo:', asadaPrueba.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
