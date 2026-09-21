import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

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
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@asadas-erp.cr' },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: platformTenant.id,
      email: 'admin@asadas-erp.cr',
      name: 'Administrador SaaS',
      password: hashedPassword,
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

  // 4. Crear config de Hacienda para la ASADA de prueba
  await prisma.tenantConfig.upsert({
    where: { tenantId: asadaPrueba.id },
    update: {},
    create: {
      tenantId: asadaPrueba.id,
      haciendaUser: 'test@hacienda.go.cr',
      haciendaPassword: 'encrypted-placeholder',
      llaveCryptBase64: 'placeholder-base64-key',
      llavePin: 'encrypted-pin-placeholder',
      consecutive: 1,
    },
  });

  // 5. Crear usuario admin para la ASADA
  const asadaPassword = await bcrypt.hash('asada123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@asanrafael.cr' },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: asadaPrueba.id,
      email: 'admin@asanrafael.cr',
      name: 'Administrador ASADA',
      password: asadaPassword,
      role: 'ADMIN',
    },
  });

  // 6. Crear abonados de prueba
  const subscribers = [
    { nis: '001', name: 'Juan Carlos Pérez', category: 'DOMICILIAR' },
    { nis: '002', name: 'María López Solís', category: 'DOMICILIAR' },
    { nis: '003', name: 'Tienda Don Pedro', category: 'COMERCIAL' },
    { nis: '004', name: 'Restaurante La Esquina', category: 'COMERCIAL' },
    { nis: '005', name: 'Casa Comunal San Rafael', category: 'PUBLICO' },
  ];

  const createdSubscribers = [];
  for (const sub of subscribers) {
    const created = await prisma.subscriber.upsert({
      where: { tenantId_nis: { tenantId: asadaPrueba.id, nis: sub.nis } },
      update: {},
      create: {
        id: uuidv4(),
        tenantId: asadaPrueba.id,
        ...sub,
      },
    });
    createdSubscribers.push(created);
  }

  // 7. Crear medidores para cada abonado
  for (let i = 0; i < createdSubscribers.length; i++) {
    await prisma.meter.create({
      data: {
        id: uuidv4(),
        tenantId: asadaPrueba.id,
        subscriberId: createdSubscribers[i].id,
        number: `MED-${String(i + 1).padStart(4, '0')}`,
      },
    });
  }

  // 8. Crear tarifa activa con bloques progresivos
  const tariff = await prisma.tariff.create({
    data: {
      id: uuidv4(),
      tenantId: asadaPrueba.id,
      category: 'DOMICILIAR',
      name: 'Tarifa Residencial 2026',
      baseCharge: 3500,
      baseCubicMeters: 15,
      isActive: true,
    },
  });

  // Bloques progresivos
  await prisma.tariffBlock.createMany({
    data: [
      { id: uuidv4(), tariffId: tariff.id, min: 0, max: 15, pricePerUnit: 0 },
      { id: uuidv4(), tariffId: tariff.id, min: 16, max: 25, pricePerUnit: 550 },
      { id: uuidv4(), tariffId: tariff.id, min: 26, max: 40, pricePerUnit: 850 },
      { id: uuidv4(), tariffId: tariff.id, min: 41, max: 999999, pricePerUnit: 1200 },
    ],
  });

  // 9. Crear tarifa para comerciales
  const tariffComercial = await prisma.tariff.create({
    data: {
      id: uuidv4(),
      tenantId: asadaPrueba.id,
      category: 'COMERCIAL',
      name: 'Tarifa Comercial 2026',
      baseCharge: 8000,
      baseCubicMeters: 10,
      isActive: true,
    },
  });

  await prisma.tariffBlock.createMany({
    data: [
      { id: uuidv4(), tariffId: tariffComercial.id, min: 0, max: 10, pricePerUnit: 0 },
      { id: uuidv4(), tariffId: tariffComercial.id, min: 11, max: 30, pricePerUnit: 750 },
      { id: uuidv4(), tariffId: tariffComercial.id, min: 31, max: 999999, pricePerUnit: 1100 },
    ],
  });

  console.log('✅ Seed completado.');
  console.log('   - Tenant Admin:', platformTenant.name);
  console.log('   - Super Admin:', superAdmin.email, '/ admin123');
  console.log('   - ASADA:', asadaPrueba.name);
  console.log('   - Admin ASADA: admin@asanrafael.cr / asada123');
  console.log('   - Abonados:', createdSubscribers.length);
  console.log('   - Tarifas: 2 (Residencial + Comercial)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
