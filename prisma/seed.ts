import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tenantId = "demo-tenant-kopi-jagoan";
const outletId = "demo-outlet-booth-ciputat";
const userId = "demo-user-owner";
const customerId = "demo-customer-regular";

const productIds = {
  esKopiSusu: "demo-product-es-kopi-susu",
  americano: "demo-product-americano",
  matchaLatte: "demo-product-matcha-latte",
  croissant: "demo-product-croissant",
  rotiBakar: "demo-product-roti-bakar",
} as const;

const inventoryIds = {
  bijiKopi: "demo-inventory-biji-kopi",
  susu: "demo-inventory-susu",
  matchaPowder: "demo-inventory-matcha-powder",
  cup16oz: "demo-inventory-cup-16oz",
  esBatu: "demo-inventory-es-batu",
} as const;

async function main() {
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {
      name: "Kopi Jagoan",
      businessType: "coffee_shop",
      status: "active",
      timezone: "Asia/Jakarta",
    },
    create: {
      id: tenantId,
      name: "Kopi Jagoan",
      businessType: "coffee_shop",
      status: "active",
      timezone: "Asia/Jakarta",
    },
  });

  await prisma.user.upsert({
    where: { email: "owner.demo@coffeelot.local" },
    update: { name: "Owner Demo" },
    create: {
      id: userId,
      email: "owner.demo@coffeelot.local",
      name: "Owner Demo",
    },
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { role: "owner" },
    create: {
      id: "demo-tenant-user-owner",
      tenantId,
      userId,
      role: "owner",
    },
  });

  await prisma.outlet.upsert({
    where: { id: outletId },
    update: {
      name: "Booth Ciputat",
      address: "Ciputat, Tangerang Selatan",
    },
    create: {
      id: outletId,
      tenantId,
      name: "Booth Ciputat",
      address: "Ciputat, Tangerang Selatan",
    },
  });

  const products = [
    { id: productIds.esKopiSusu, name: "Es Kopi Susu", category: "Kopi", price: 18000 },
    { id: productIds.americano, name: "Americano", category: "Kopi", price: 15000 },
    { id: productIds.matchaLatte, name: "Matcha Latte", category: "Non-Kopi", price: 22000 },
    { id: productIds.croissant, name: "Croissant", category: "Snack", price: 20000 },
    { id: productIds.rotiBakar, name: "Roti Bakar", category: "Snack", price: 15000 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        category: product.category,
        price: product.price,
        isActive: true,
      },
      create: {
        ...product,
        tenantId,
        outletId: null,
        isActive: true,
      },
    });
  }

  const inventoryItems = [
    { id: inventoryIds.bijiKopi, name: "Biji Kopi", unit: "gram", currentStock: 2000, minimumStock: 500 },
    { id: inventoryIds.susu, name: "Susu", unit: "ml", currentStock: 5000, minimumStock: 2000 },
    { id: inventoryIds.matchaPowder, name: "Matcha Powder", unit: "gram", currentStock: 500, minimumStock: 200 },
    { id: inventoryIds.cup16oz, name: "Cup 16oz", unit: "pcs", currentStock: 200, minimumStock: 50 },
    { id: inventoryIds.esBatu, name: "Es Batu", unit: "gram", currentStock: 10000, minimumStock: 3000 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        unit: item.unit,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
      },
      create: {
        ...item,
        tenantId,
        outletId,
      },
    });
  }

  const recipes = [
    [productIds.esKopiSusu, inventoryIds.bijiKopi, 18],
    [productIds.esKopiSusu, inventoryIds.susu, 120],
    [productIds.esKopiSusu, inventoryIds.cup16oz, 1],
    [productIds.esKopiSusu, inventoryIds.esBatu, 150],
    [productIds.americano, inventoryIds.bijiKopi, 18],
    [productIds.americano, inventoryIds.cup16oz, 1],
    [productIds.americano, inventoryIds.esBatu, 150],
    [productIds.matchaLatte, inventoryIds.matchaPowder, 15],
    [productIds.matchaLatte, inventoryIds.susu, 150],
    [productIds.matchaLatte, inventoryIds.cup16oz, 1],
    [productIds.matchaLatte, inventoryIds.esBatu, 100],
  ] as const;

  for (const [productId, inventoryItemId, qtyUsed] of recipes) {
    await prisma.productRecipe.upsert({
      where: { productId_inventoryItemId: { productId, inventoryItemId } },
      update: { qtyUsed },
      create: {
        id: `demo-recipe-${productId}-${inventoryItemId}`,
        tenantId,
        productId,
        inventoryItemId,
        qtyUsed,
      },
    });
  }

  await prisma.customer.upsert({
    where: { id: customerId },
    update: {
      name: "Pelanggan Demo",
      phone: "+6280000000000",
      email: "pelanggan.demo@coffeelot.local",
    },
    create: {
      id: customerId,
      tenantId,
      name: "Pelanggan Demo",
      phone: "+6280000000000",
      email: "pelanggan.demo@coffeelot.local",
    },
  });

  await prisma.order.upsert({
    where: { tenantId_invoiceNumber: { tenantId, invoiceNumber: "INV-DEMO-0001" } },
    update: {
      orderStatus: "paid",
      prepStatus: "completed",
      orderChannel: "cashier",
      paymentMethod: "qris",
      subtotal: 33000,
      discount: 0,
      total: 33000,
      notes: "Sample paid order for local demo seed.",
    },
    create: {
      id: "demo-order-0001",
      tenantId,
      outletId,
      customerId,
      invoiceNumber: "INV-DEMO-0001",
      orderStatus: "paid",
      prepStatus: "completed",
      orderChannel: "cashier",
      paymentMethod: "qris",
      subtotal: 33000,
      discount: 0,
      total: 33000,
      notes: "Sample paid order for local demo seed.",
      items: {
        create: [
          {
            id: "demo-order-item-0001-es-kopi-susu",
            tenantId,
            productId: productIds.esKopiSusu,
            productName: "Es Kopi Susu",
            qty: 1,
            unitPrice: 18000,
            totalPrice: 18000,
          },
          {
            id: "demo-order-item-0001-americano",
            tenantId,
            productId: productIds.americano,
            productName: "Americano",
            qty: 1,
            unitPrice: 15000,
            totalPrice: 15000,
          },
        ],
      },
    },
  });

  console.log("Demo seed completed for Kopi Jagoan / Booth Ciputat.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
