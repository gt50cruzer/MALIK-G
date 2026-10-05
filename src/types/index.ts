export type CategoryType = 'Shirts' | 'Pants' | 'Shoes' | 'Watches' | 'Perfumes' | 'Accessories';

export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  category: CategoryType;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  rating: number;
  reviewsCount: number;
  description: string;
  shortDescription: string;
  image: string;
  gallery: string[];
  inStock: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  tags: string[];
  sku: string;
  fabricOrMaterial: string;
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
  email?: string;
  city: string;
  address: string;
  notes?: string;
}

export interface Order {
  orderNumber: string;
  createdAt: string;
  customer: OrderCustomerDetails;
  items: CartItemType[];
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  paymentMethod: 'Cash on Delivery' | 'Bank Transfer / WhatsApp';
}

export interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
}
