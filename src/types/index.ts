export type CategoryType = 'Shirts' | 'Pants' | 'Shoes' | 'Watches' | 'Perfumes' | 'Accessories' | string;

export type OrderStatusType =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  description: string;
  subtitle?: string;
  active: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  dbId?: number;
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  originalPrice?: number;
  offerPrice?: number | null;
  discountPercent?: number;
  category: CategoryType;
  categoryId?: number;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  rating: number;
  reviewsCount: number;
  description: string;
  shortDescription: string;
  image: string;
  gallery: string[];
  inStock: boolean;
  stockQuantity?: number;
  offerType?: 'none' | 'percentage' | 'price';
  published?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  tags: string[];
  sku: string;
  fabricOrMaterial: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItemType {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderCustomerDetails {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes?: string;
}

export interface OrderItemSnapshot {
  id?: number;
  productId: string;
  productNameSnapshot: string;
  productImageSnapshot: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
  originalPriceSnapshot: number;
  subtotal: number;
}

export interface Order {
  id?: number;
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  customer: OrderCustomerDetails;
  items: CartItemType[];
  orderItems?: OrderItemSnapshot[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatusType;
  paymentMethod?: string;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  confirmedSalesOrders?: number;
  totalProducts: number;
  outOfStockProducts: number;
  publishedProducts: number;
  totalRevenue: number;
  confirmedRevenue?: number;
  deliveredRevenue: number;
  pendingOrderValue: number;
  cancelledOrderValue?: number;
  periods: {
    today: { sales: number; orders: number };
    thisWeek: { sales: number; orders: number };
    thisMonth: { sales: number; orders: number };
    allTime: { sales: number; orders: number };
  };
}

export interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
}

