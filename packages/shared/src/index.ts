export const COFFEELOT_APP_NAME = "Coffeelot";

export type TenantContext = {
  tenantId: string;
  outletId: string;
};

export const ROLES = ["owner", "manager", "cashier"] as const;
export type Role = (typeof ROLES)[number];

export const BUSINESS_TYPES = ["coffee_shop", "food_stall", "booth", "cart", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const TENANT_STATUSES = ["active", "inactive"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const ORDER_STATUSES = ["draft", "pending_payment", "paid", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PREP_STATUSES = ["new", "preparing", "ready", "completed"] as const;
export type PrepStatus = (typeof PREP_STATUSES)[number];

export const ORDER_CHANNELS = ["cashier", "manual", "chat", "connector"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const PAYMENT_METHODS = ["cash", "qris", "transfer", "va_bca", "va_bni", "ovo", "gopay", "dana", "shopee_pay"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DOKU_PAYMENT_METHODS = ["qris", "va_bca", "va_bni", "ovo", "gopay", "dana", "shopee_pay"] as const;
export type DokuPaymentMethod = (typeof DOKU_PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "expired", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const MOVEMENT_TYPES = ["sale", "restock", "adjustment", "waste"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const AGENT_RUN_STATUSES = ["running", "completed", "failed"] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const AGENT_OUTPUT_TYPES = ["report", "alert", "recommendation", "promo", "briefing"] as const;
export type AgentOutputType = (typeof AGENT_OUTPUT_TYPES)[number];

export const AGENT_TRIGGER_TYPES = ["scheduled", "event", "on_demand"] as const;
export type AgentTriggerType = (typeof AGENT_TRIGGER_TYPES)[number];

export type ApiErrorCode =
  | "INVALID_PAYLOAD"
  | "NOT_FOUND"
  | "MISSING_CONTEXT"
  | "INACTIVE_PRODUCT"
  | "INSUFFICIENT_STOCK"
  | "INVALID_CALLBACK"
  | "PAYMENT_NOT_FOUND"
  | "DOKU_MCP_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type Money = number;
export type Quantity = number;

export type PosProduct = {
  id: string;
  name: string;
  category: string;
  price: Money;
  isActive: boolean;
  recipes?: Array<{
    inventoryItemId: string;
    qtyUsed: Quantity;
    inventoryItem?: {
      id: string;
      name: string;
      unit: string;
      currentStock: Quantity;
      minimumStock: Quantity;
    };
  }>;
};

export type CartItemInput = {
  productId?: string;
  name?: string;
  qty: number;
  unitPrice?: Money;
  notes?: string;
};

export type CreateOrderInput = {
  paymentMethod: PaymentMethod;
  discount?: Money;
  customerId?: string;
  notes?: string;
  orderChannel?: OrderChannel;
  tableLabel?: string;
  items: CartItemInput[];
};

export type KitchenOrder = {
  id: string;
  invoiceNumber: string | null;
  orderStatus: OrderStatus;
  prepStatus: PrepStatus;
  orderChannel: OrderChannel;
  tableLabel: string | null;
  total: Money;
  createdAt: string;
  items: Array<{
    productName: string;
    qty: number;
    notes: string | null;
  }>;
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isDokuPaymentMethod(value: string): value is DokuPaymentMethod {
  return (DOKU_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isPrepStatus(value: string): value is PrepStatus {
  return (PREP_STATUSES as readonly string[]).includes(value);
}
