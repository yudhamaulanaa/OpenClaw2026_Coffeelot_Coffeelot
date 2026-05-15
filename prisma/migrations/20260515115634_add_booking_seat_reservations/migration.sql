-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_contact" TEXT,
    "party_size" INTEGER NOT NULL,
    "booking_start" DATETIME NOT NULL,
    "booking_end" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "table_label" TEXT,
    "notes" TEXT,
    "arrived_at" DATETIME,
    "released_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "bookings_tenant_id_idx" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "bookings_outlet_id_idx" ON "bookings"("outlet_id");

-- CreateIndex
CREATE INDEX "bookings_booking_start_idx" ON "bookings"("booking_start");

-- CreateIndex
CREATE INDEX "bookings_booking_end_idx" ON "bookings"("booking_end");
