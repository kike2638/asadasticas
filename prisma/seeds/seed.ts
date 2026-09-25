import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de plataforma...');

  // 1. Crear el Tenant de la Plataforma (Dueño del SaaS) - SINPE superadmin 87607243
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
  // Config plataforma con tu SINPE real
  const existingPlatCfg = await prisma.tenantConfig.findUnique({ where: { tenantId: platformTenant.id } });
  if (!existingPlatCfg) {
    await prisma.tenantConfig.create({
      data: {
        tenantId: platformTenant.id,
        haciendaUser: 'admin@asadas-erp.cr',
        haciendaPassword: 'encrypted',
        llaveCryptBase64: 'placeholder',
        llavePin: 'encrypted',
        sinpeNumero: '87607243',
        sinpeNombre: 'AquaLectura CR - Superadmin',
        sinpeBanco: 'BNCR',
      },
    });
  } else if (!existingPlatCfg.sinpeNumero) {
    await prisma.tenantConfig.update({ where: { tenantId: platformTenant.id }, data: { sinpeNumero: '87607243', sinpeNombre: 'AquaLectura CR - Superadmin', sinpeBanco: 'BNCR' } });
  }

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

  // 3. Crear una ASADA de prueba inicial (con cédula jurídica real formato)
  const asadaPrueba = await prisma.tenant.upsert({
    where: { slug: 'asada-ejemplo' },
    update: { cedulaJuridica: '300208765432' },
    create: {
      id: uuidv4(),
      slug: 'asada-ejemplo',
      name: 'ASADA San Rafael',
      cedulaJuridica: '300208765432',
      plan: 'BASIC',
      status: 'ACTIVE',
    },
  });

  // 4. Crear config de Hacienda para la ASADA de prueba (tiquete electrónico es el estándar ASADA)
  await prisma.tenantConfig.upsert({
    where: { tenantId: asadaPrueba.id },
    update: { sinpeNumero: '88881234', sinpeNombre: 'ASADA San Rafael', sinpeBanco: 'BNCR' },
    create: {
      tenantId: asadaPrueba.id,
      haciendaUser: 'test@hacienda.go.cr',
      haciendaPassword: 'encrypted-placeholder',
      llaveCryptBase64: 'placeholder-base64-key',
      llavePin: 'encrypted-pin-placeholder',
      consecutivoFE: 1,
      consecutivoTE: 1,
      sucursal: '001',
      terminal: '00001',
      tprhDomiciliar: 1200,
      tprhComercial: 1800,
      hidrantesMensual: 750,
      sinpeNumero: '88881234',
      sinpeNombre: 'ASADA San Rafael',
      sinpeBanco: 'BNCR',
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

  // 6. Crear abonados de prueba con padrón AyA completo
  const subscribersData = [
    { nis: '001', name: 'Juan Carlos Pérez', category: 'DOMICILIAR' as const, identificacion: '102340567', email: 'juan.perez@example.cr', telefono: '88880001', direccion: 'San Rafael centro, 100m este plaza', rutaLectura: 'RUTA-01', lat: 10.015, lng: -84.215 },
    { nis: '002', name: 'María López Solís', category: 'DOMICILIAR' as const, identificacion: '203450678', email: 'maria.lopez@example.cr', telefono: '88880002', direccion: 'Calle principal, casa 15', rutaLectura: 'RUTA-01', lat: 10.018, lng: -84.218 },
    { nis: '003', name: 'Tienda Don Pedro', category: 'COMERCIAL' as const, identificacion: '3101123456', email: 'tienda@example.cr', telefono: '88880003', direccion: 'Frente al parque', rutaLectura: 'RUTA-02', lat: 10.012, lng: -84.212 },
    { nis: '004', name: 'Restaurante La Esquina', category: 'COMERCIAL' as const, identificacion: '3102234567', email: 'restaurante@example.cr', telefono: '88880004', rutaLectura: 'RUTA-02', lat: 10.020, lng: -84.220 },
    { nis: '005', name: 'Casa Comunal San Rafael', category: 'PUBLICO' as const, identificacion: '300208765432', email: 'comunal@example.cr', rutaLectura: 'RUTA-01', lat: 10.016, lng: -84.216 },
  ];

  const createdSubscribers = [];
  for (const sub of subscribersData) {
    const existing = await prisma.subscriber.findFirst({
      where: { tenantId: asadaPrueba.id, nis: sub.nis },
    });
    const created = existing || await prisma.subscriber.create({
      data: {
        id: uuidv4(),
        tenantId: asadaPrueba.id,
        nis: sub.nis,
        name: sub.name,
        category: sub.category,
        tipoIdentificacion: sub.identificacion?.length === 10 ? "02" : "01",
        identificacion: sub.identificacion,
        email: sub.email,
        telefono: sub.telefono,
        direccion: (sub as any).direccion,
        rutaLectura: (sub as any).rutaLectura,
        lat: (sub as any).lat,
        lng: (sub as any).lng,
        status: "ACTIVO",
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

  // 8. Crear tarifa activa con bloques progresivos ARESEP + TPRH + Hidrantes
  const tariff = await prisma.tariff.create({
    data: {
      id: uuidv4(),
      tenantId: asadaPrueba.id,
      category: 'DOMICILIAR',
      name: 'Tarifa Residencial ARESEP 2026',
      baseCharge: 3500,
      baseCubicMeters: 15,
      tprh: 1200,
      hidrantes: 750,
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
      name: 'Tarifa Comercial ARESEP 2026',
      baseCharge: 8000,
      baseCubicMeters: 10,
      tprh: 1800,
      hidrantes: 750,
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
