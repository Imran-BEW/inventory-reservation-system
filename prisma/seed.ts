import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyRecord.deleteMany();

  // Create warehouses
  const [delhi, mumbai, bangalore] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Delhi Central", location: "New Delhi, India" },
    }),
    prisma.warehouse.create({
      data: { name: "Mumbai Hub", location: "Mumbai, India" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Tech", location: "Bangalore, India" },
    }),
  ]);

  console.log("✅ Warehouses created");

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5 Headphones",
        description:
          "Industry-leading noise canceling with Auto NC Optimizer. Up to 30-hour battery life.",
        imageUrl:
          "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400",
        price: 24990,
      },
    }),
    prisma.product.create({
      data: {
        name: "Apple AirPods Pro (2nd Gen)",
        description:
          "Active Noise Cancellation, Transparency mode, and Adaptive Audio.",
        imageUrl:
          "https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=400",
        price: 18990,
      },
    }),
    prisma.product.create({
      data: {
        name: "Samsung Galaxy Watch 6",
        description:
          "Advanced health monitoring, sleep coaching, and 40-hour battery.",
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
        price: 26999,
      },
    }),
    prisma.product.create({
      data: {
        name: "Logitech MX Master 3S",
        description:
          "8000 DPI sensor, silent clicks, and ergonomic design for all-day work.",
        imageUrl:
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
        price: 9995,
      },
    }),
    prisma.product.create({
      data: {
        name: "iPad Air (M2 Chip)",
        description:
          "Supercharged by the M2 chip. Versatile, portable, and powerful.",
        imageUrl:
          "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400",
        price: 59900,
      },
    }),
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard Keychron K2",
        description:
          "Compact TKL layout with hot-swappable switches and RGB backlight.",
        imageUrl:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
        price: 6999,
      },
    }),
  ]);

  console.log("✅ Products created");

  // Create stock entries (some scarce to test race conditions)
  const stockData = [
    // Sony headphones
    { productId: products[0].id, warehouseId: delhi.id, total: 15, reserved: 0 },
    { productId: products[0].id, warehouseId: mumbai.id, total: 8, reserved: 0 },
    { productId: products[0].id, warehouseId: bangalore.id, total: 3, reserved: 0 }, // scarce!

    // AirPods Pro
    { productId: products[1].id, warehouseId: delhi.id, total: 20, reserved: 0 },
    { productId: products[1].id, warehouseId: mumbai.id, total: 1, reserved: 0 }, // very scarce!
    { productId: products[1].id, warehouseId: bangalore.id, total: 12, reserved: 0 },

    // Samsung Watch
    { productId: products[2].id, warehouseId: delhi.id, total: 10, reserved: 0 },
    { productId: products[2].id, warehouseId: mumbai.id, total: 6, reserved: 0 },
    { productId: products[2].id, warehouseId: bangalore.id, total: 2, reserved: 0 }, // scarce!

    // Logitech mouse
    { productId: products[3].id, warehouseId: delhi.id, total: 50, reserved: 0 },
    { productId: products[3].id, warehouseId: bangalore.id, total: 30, reserved: 0 },

    // iPad
    { productId: products[4].id, warehouseId: delhi.id, total: 5, reserved: 0 },
    { productId: products[4].id, warehouseId: mumbai.id, total: 3, reserved: 0 },

    // Keyboard
    { productId: products[5].id, warehouseId: delhi.id, total: 25, reserved: 0 },
    { productId: products[5].id, warehouseId: mumbai.id, total: 18, reserved: 0 },
    { productId: products[5].id, warehouseId: bangalore.id, total: 1, reserved: 0 }, // very scarce!
  ];

  await prisma.stock.createMany({ data: stockData });

  console.log("✅ Stock entries created");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
