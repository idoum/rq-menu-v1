import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data (in development only)
  console.log('🧹 Cleaning up existing data...');
  await prisma.tenantBranding.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create demo tenant
  console.log('🏢 Creating demo tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'demo',
      name: 'Restaurant Demo',
    },
  });

  // Create branding for demo tenant
  console.log('🎨 Creating demo branding...');
  await prisma.tenantBranding.create({
    data: {
      tenantId: tenant.id,
      primaryColor: '#ef4444',
      secondaryColor: '#6B7280',
      accentColor: '#f97316',
      fontFamily: 'system',
      tagline: 'Délicieuse cuisine depuis 1995',
    },
  });

  // Create owner user
  console.log('👤 Creating owner user...');
  const passwordHash = await bcrypt.hash('Demo12345!', 12);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'demo@demo.com',
      passwordHash,
      name: 'Demo Owner',
      role: UserRole.OWNER,
    },
  });

  // Create staff user
  console.log('👤 Creating staff user...');
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'staff@demo.com',
      passwordHash: await bcrypt.hash('Staff12345!', 12),
      name: 'Demo Staff',
      role: UserRole.STAFF,
    },
  });

  // Create menu
  console.log('📋 Creating menu...');
  const menu = await prisma.menu.create({
    data: {
      tenantId: tenant.id,
      name: 'Menu Principal',
      isActive: true,
      sortOrder: 0,
    },
  });

  // Create categories
  console.log('📂 Creating categories...');
  const categoryEntrees = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      name: 'Entrées',
      description: 'Nos délicieuses entrées pour commencer votre repas',
      sortOrder: 0,
    },
  });

  const categoryPlats = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      name: 'Plats',
      description: 'Nos plats signature préparés avec soin',
      sortOrder: 1,
    },
  });

  const categoryDesserts = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      name: 'Desserts',
      description: 'Pour terminer en beauté',
      sortOrder: 2,
    },
  });

  const categoryBoissons = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      menuId: menu.id,
      name: 'Boissons',
      description: 'Nos boissons fraîches et chaudes',
      sortOrder: 3,
    },
  });

  // Create items for Entrées
  console.log('🍽️ Creating menu items...');
  await prisma.item.createMany({
    data: [
      {
        tenantId: tenant.id,
        categoryId: categoryEntrees.id,
        name: 'Salade César',
        description: 'Laitue romaine, croûtons, parmesan, sauce César maison',
        price: 12.50,
        isAvailable: true,
        sortOrder: 0,
        isVegetarian: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryEntrees.id,
        name: 'Soupe à l\'oignon',
        description: 'Gratinée au fromage, croûtons dorés',
        price: 9.00,
        isAvailable: true,
        sortOrder: 1,
        isVegetarian: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryEntrees.id,
        name: 'Tartare de saumon',
        description: 'Saumon frais, avocat, sésame, sauce ponzu',
        price: 16.00,
        isAvailable: true,
        sortOrder: 2,
        isGlutenFree: true,
      },
    ],
  });

  // Create items for Plats
  await prisma.item.createMany({
    data: [
      {
        tenantId: tenant.id,
        categoryId: categoryPlats.id,
        name: 'Entrecôte grillée',
        description: '300g, sauce au poivre, frites maison',
        price: 28.00,
        isAvailable: true,
        sortOrder: 0,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryPlats.id,
        name: 'Risotto aux champignons',
        description: 'Riz arborio, champignons de saison, parmesan',
        price: 22.00,
        isAvailable: true,
        sortOrder: 1,
        isVegetarian: true,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryPlats.id,
        name: 'Filet de dorade',
        description: 'Poêlé, légumes du marché, beurre citronné',
        price: 25.00,
        isAvailable: true,
        sortOrder: 2,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryPlats.id,
        name: 'Burger Signature',
        description: 'Bœuf Angus, cheddar affiné, bacon, oignons caramélisés',
        price: 19.00,
        isAvailable: false,
        sortOrder: 3,
      },
    ],
  });

  // Create items for Desserts
  await prisma.item.createMany({
    data: [
      {
        tenantId: tenant.id,
        categoryId: categoryDesserts.id,
        name: 'Crème brûlée',
        description: 'Vanille de Madagascar',
        price: 9.00,
        isAvailable: true,
        sortOrder: 0,
        isVegetarian: true,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryDesserts.id,
        name: 'Fondant au chocolat',
        description: 'Cœur coulant, glace vanille',
        price: 11.00,
        isAvailable: true,
        sortOrder: 1,
        isVegetarian: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryDesserts.id,
        name: 'Tarte tatin',
        description: 'Pommes caramélisées, crème fraîche',
        price: 10.00,
        isAvailable: true,
        sortOrder: 2,
        isVegetarian: true,
      },
    ],
  });

  // Create items for Boissons
  await prisma.item.createMany({
    data: [
      {
        tenantId: tenant.id,
        categoryId: categoryBoissons.id,
        name: 'Eau minérale',
        description: 'Plate ou gazeuse, 75cl',
        price: 4.50,
        isAvailable: true,
        sortOrder: 0,
        isVegan: true,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryBoissons.id,
        name: 'Coca-Cola',
        description: '33cl',
        price: 4.00,
        isAvailable: true,
        sortOrder: 1,
        isVegan: true,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryBoissons.id,
        name: 'Café expresso',
        description: '100% Arabica',
        price: 3.00,
        isAvailable: true,
        sortOrder: 2,
        isVegan: true,
        isGlutenFree: true,
      },
      {
        tenantId: tenant.id,
        categoryId: categoryBoissons.id,
        name: 'Thé',
        description: 'Sélection de thés premium',
        price: 4.00,
        isAvailable: true,
        sortOrder: 3,
        isVegan: true,
        isGlutenFree: true,
      },
    ],
  });

  // Create zones
  console.log('📍 Creating zones...');
  const zoneTerrace = await prisma.zone.create({
    data: {
      tenantId: tenant.id,
      slug: 'terrasse',
      name: 'Terrasse',
    },
  });

  const zoneSalle = await prisma.zone.create({
    data: {
      tenantId: tenant.id,
      slug: 'salle',
      name: 'Salle principale',
    },
  });

  const zoneBar = await prisma.zone.create({
    data: {
      tenantId: tenant.id,
      slug: 'bar',
      name: 'Bar',
    },
  });

  // Create QR codes
  console.log('📱 Creating QR codes...');
  await prisma.qrCode.createMany({
    data: [
      {
        tenantId: tenant.id,
        zoneId: zoneTerrace.id,
        label: 'Terrasse - Table 1',
        targetPath: '/?zone=terrasse&table=1',
      },
      {
        tenantId: tenant.id,
        zoneId: zoneTerrace.id,
        label: 'Terrasse - Table 2',
        targetPath: '/?zone=terrasse&table=2',
      },
      {
        tenantId: tenant.id,
        zoneId: zoneSalle.id,
        label: 'Salle - Table 1',
        targetPath: '/?zone=salle&table=1',
      },
      {
        tenantId: tenant.id,
        zoneId: zoneSalle.id,
        label: 'Salle - Table 2',
        targetPath: '/?zone=salle&table=2',
      },
      {
        tenantId: tenant.id,
        zoneId: zoneBar.id,
        label: 'Comptoir Bar',
        targetPath: '/?zone=bar',
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📝 Demo credentials:');
  console.log('   Email: demo@demo.com');
  console.log('   Password: Demo12345!');
  console.log('');
  console.log('   Staff Email: staff@demo.com');
  console.log('   Staff Password: Staff12345!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
