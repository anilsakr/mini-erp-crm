// Mirrors the Prisma enums on the backend (apps/backend/prisma/schema.prisma).
// Kept as a hand-written copy rather than a shared package — simple enough
// at 4 modules that a shared types package would be over-engineering.
export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type MovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface ApiItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CustomerFollowUp {
  id: string;
  note: string;
  followUpDate: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  followUps?: CustomerFollowUp[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category: Category;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  warehouseId: string;
  warehouse: Warehouse;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  product?: { id: string; name: string; sku: string };
}

export interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  lineTotal: string;
  product: { id: string; name: string; sku: string };
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer: { id: string; name: string; businessName: string; mobile: string };
  status: ChallanStatus;
  totalQuantity: number;
  totalAmount: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  items: ChallanItem[];
}

export interface DashboardSummary {
  customers: { total: number; active: number };
  products: { total: number; lowStock: number };
  challans: { draft: number; confirmed: number; recent: Challan[] };
  recentStockMovements: StockMovement[];
}
