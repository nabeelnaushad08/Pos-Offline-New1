import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Create all tables via raw SQL — works in packaged Electron (no prisma CLI needed)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'CASHIER',
      "phone" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "categories" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "color" TEXT DEFAULT '#6366f1',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "customers" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT NOT NULL UNIQUE,
      "email" TEXT,
      "address" TEXT,
      "notes" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "products" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "sku" TEXT NOT NULL UNIQUE,
      "barcode" TEXT UNIQUE,
      "description" TEXT,
      "categoryId" TEXT,
      "costPrice" REAL NOT NULL,
      "sellingPrice" REAL NOT NULL,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "minimumStock" INTEGER NOT NULL DEFAULT 5,
      "unit" TEXT NOT NULL DEFAULT 'pcs',
      "image" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "suppliers" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "contactPerson" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "address" TEXT,
      "notes" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "supplier_products" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "supplierId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("supplierId","productId")
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "purchases" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "purchaseNumber" TEXT NOT NULL UNIQUE,
      "supplierId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "subtotal" REAL NOT NULL,
      "discount" REAL NOT NULL DEFAULT 0,
      "total" REAL NOT NULL,
      "amountPaid" REAL NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'RECEIVED',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "purchase_items" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "purchaseId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitCost" REAL NOT NULL,
      "subtotal" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "supplier_payments" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "supplierId" TEXT NOT NULL,
      "purchaseId" TEXT,
      "amount" REAL NOT NULL,
      "method" TEXT NOT NULL DEFAULT 'CASH',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "sales" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "receiptNumber" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL,
      "customerId" TEXT,
      "subtotal" REAL NOT NULL,
      "discount" REAL NOT NULL DEFAULT 0,
      "tax" REAL NOT NULL DEFAULT 0,
      "total" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
      "cashAmount" REAL,
      "cardAmount" REAL,
      "change" REAL,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "notes" TEXT,
      "customerName" TEXT,
      "customerPhone" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "sale_items" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "saleId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "costPrice" REAL NOT NULL,
      "unitPrice" REAL NOT NULL,
      "subtotal" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "notifications" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "sentEmail" BOOLEAN NOT NULL DEFAULT false,
      "sentWhatsApp" BOOLEAN NOT NULL DEFAULT false,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "activity_logs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entityId" TEXT,
      "details" TEXT,
      "ipAddress" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "printer_settings" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL UNIQUE,
      "printerName" TEXT,
      "paperSize" TEXT NOT NULL DEFAULT '80mm',
      "headerTitle" TEXT,
      "logo" TEXT,
      "showLogo" BOOLEAN NOT NULL DEFAULT false,
      "footer" TEXT,
      "showFooter" BOOLEAN NOT NULL DEFAULT true,
      "copies" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "system_settings" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "systemName" TEXT NOT NULL DEFAULT 'POS System',
      "logo" TEXT,
      "currency" TEXT NOT NULL DEFAULT 'LKR',
      "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
      "timezone" TEXT NOT NULL DEFAULT 'Asia/Colombo',
      "taxRate" REAL NOT NULL DEFAULT 0,
      "theme" TEXT NOT NULL DEFAULT 'light',
      "address" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "kotEnabled" BOOLEAN NOT NULL DEFAULT false,
      "printerIp" TEXT,
      "printerEnabled" BOOLEAN NOT NULL DEFAULT false,
      "slogan" TEXT,
      "whatsApp" TEXT,
      "receiptNote" TEXT,
      "thankYouLine1" TEXT NOT NULL DEFAULT 'THANK YOU FOR YOUR VISIT',
      "thankYouLine2" TEXT NOT NULL DEFAULT 'COME AGAIN!',
      "printAgentUrl" TEXT NOT NULL DEFAULT 'http://localhost:3001',
      "licenseKey" TEXT,
      "licenseActivatedAt" DATETIME,
      "licenseType" TEXT NOT NULL DEFAULT 'TRIAL',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "employees" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "employeeId" TEXT NOT NULL UNIQUE,
      "fullName" TEXT NOT NULL,
      "nicNumber" TEXT UNIQUE,
      "dateOfBirth" DATETIME,
      "gender" TEXT,
      "contactNumber" TEXT,
      "email" TEXT,
      "address" TEXT,
      "emergencyContact" TEXT,
      "dateJoined" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "position" TEXT NOT NULL DEFAULT 'Cashier',
      "department" TEXT,
      "basicSalary" REAL NOT NULL DEFAULT 0,
      "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
      "photo" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "attendance" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "checkIn" DATETIME,
      "checkOut" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'PRESENT',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("employeeId","date")
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "payroll" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "month" INTEGER NOT NULL,
      "year" INTEGER NOT NULL,
      "basicSalary" REAL NOT NULL,
      "workingDays" INTEGER NOT NULL DEFAULT 0,
      "presentDays" INTEGER NOT NULL DEFAULT 0,
      "overtimeHours" REAL NOT NULL DEFAULT 0,
      "overtimeRate" REAL NOT NULL DEFAULT 0,
      "allowances" REAL NOT NULL DEFAULT 0,
      "deductions" REAL NOT NULL DEFAULT 0,
      "bonus" REAL NOT NULL DEFAULT 0,
      "advance" REAL NOT NULL DEFAULT 0,
      "netSalary" REAL NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "paidAt" DATETIME,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("employeeId","month","year")
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "performance_notes" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'NOTE',
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "expense_categories" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "color" TEXT NOT NULL DEFAULT '#6366f1',
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "expenses" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "categoryId" TEXT,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
      "reference" TEXT,
      "notes" TEXT,
      "receipt" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "investments" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'INITIAL',
      "amount" REAL NOT NULL,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "assets" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'EQUIPMENT',
      "purchaseCost" REAL NOT NULL,
      "currentValue" REAL NOT NULL,
      "purchaseDate" DATETIME NOT NULL,
      "notes" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "customer_credits" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerId" TEXT,
      "customerName" TEXT,
      "type" TEXT NOT NULL DEFAULT 'CREDIT',
      "amount" REAL NOT NULL,
      "saleId" TEXT,
      "notes" TEXT,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    // Verify connection works
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("[db-status] error:", error);
    return NextResponse.json({ connected: false, error: String(error) });
  }
}
