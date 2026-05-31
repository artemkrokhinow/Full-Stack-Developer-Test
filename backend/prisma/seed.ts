import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.inventoryLog.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding products with UUIDs...');
  
  const products = [
    {
      id: 'e2a0c648-9b87-4d92-a16e-1d6bbd280b11',
      name: 'Cyber Sneakers v1.0',
      price: 19999, // $199.99 in cents
      stock: 8,
      category: 'Footwear',
      badge: 'Limited Drop',
      description: 'Futuristic performance footwear featuring neon cyan light tracks and magnetic strapping. Engineered with carbon fiber structural arches for maximum impact isolation and response.'
    },
    {
      id: 'd4a0c648-9b87-4d92-a16e-1d6bbd280b22',
      name: 'Holographic Matrix Visor',
      price: 8999, // $89.99 in cents
      stock: 15,
      category: 'Accessories',
      badge: 'Popular',
      description: 'Augmented reality sunglasses with real-time UI layouts and UV reflection filters. Displays active notifications and network channels directly into your vision loop.'
    },
    {
      id: 'c3a0c648-9b87-4d92-a16e-1d6bbd280b33',
      name: 'Neural Cybernetic Jacket',
      price: 29999, // $299.99 in cents
      stock: 5,
      category: 'Apparel',
      badge: 'Trending',
      description: 'Thermo-regulating windbreaker featuring liquid polymer heating filaments. Outfitted with electro-chromic stripes that shift colors based on body temperature and ambient sounds.'
    },
    {
      id: 'b2a0c648-9b87-4d92-a16e-1d6bbd280b44',
      name: 'Tactical Hackers Backpack',
      price: 13999, // $139.99 in cents
      stock: 20,
      category: 'Bags',
      badge: 'Essential',
      description: 'Sleek, modular tactical bag with built-in Faraday signal blocking pockets and an integrated USB-C power bank link. Features an ergonomic load distribution frame.'
    },
    {
      id: 'a1a0c648-9b87-4d92-a16e-1d6bbd280b55',
      name: 'OLED Holographic Watch',
      price: 24999, // $249.99 in cents
      stock: 12,
      category: 'Accessories',
      badge: 'New Release',
      description: 'Wristband watch displaying time and system logs via a projected micro-hologram. Features a titanium alloy structure and biometric monitoring sensors.'
    }
  ];

  for (const prod of products) {
    const product = await prisma.product.create({
      data: {
        id: prod.id,
        name: prod.name,
        price: prod.price,
        stock: prod.stock,
        category: prod.category,
        badge: prod.badge,
        description: prod.description
      }
    });

    // Write inventory seed log using change and reason fields
    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        change: product.stock,
        reason: 'INITIAL_SEED'
      }
    });
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
