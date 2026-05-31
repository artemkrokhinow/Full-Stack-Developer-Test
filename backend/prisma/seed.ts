import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.inventoryLog.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding products with UUIDs...');
  
  const products = [
    {
      id: 'e2a0c648-9b87-4d92-a16e-1d6bbd280b11',
      name: 'T-Shirt',
      price: 2999,
      stock: 100,
      category: 'Apparel',
      badge: 'Essential',
      description: 'Basic cotton t-shirt.'
    },
    {
      id: 'd4a0c648-9b87-4d92-a16e-1d6bbd280b22',
      name: 'Hoodie',
      price: 5999,
      stock: 50,
      category: 'Apparel',
      badge: 'Popular',
      description: 'Black zip hoodie.'
    },
    {
      id: 'c3a0c648-9b87-4d92-a16e-1d6bbd280b33',
      name: 'Mouse',
      price: 7999,
      stock: 15,
      category: 'Accessories',
      badge: 'Trending',
      description: 'Wireless gaming mouse.'
    },
    {
      id: 'b2a0c648-9b87-4d92-a16e-1d6bbd280b44',
      name: 'Keyboard',
      price: 12999,
      stock: 10,
      category: 'Accessories',
      badge: 'Essential',
      description: 'Mechanical keyboard.'
    },
    {
      id: 'a1a0c648-9b87-4d92-a16e-1d6bbd280b55',
      name: 'Sneakers',
      price: 14999,
      stock: 5,
      category: 'Footwear',
      badge: 'New Release',
      description: 'Running sneakers.'
    },
    {
      id: 'f5a0c648-9b87-4d92-a16e-1d6bbd280b66',
      name: 'Cap',
      price: 3999,
      stock: 1,
      category: 'Accessories',
      badge: 'Limited Drop',
      description: 'Limited edition cap.'
    },
    {
      id: 'g6a0c648-9b87-4d92-a16e-1d6bbd280b77',
      name: 'Watch',
      price: 19999,
      stock: 0,
      category: 'Accessories',
      badge: 'Sold Out',
      description: 'Smart watch.'
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
