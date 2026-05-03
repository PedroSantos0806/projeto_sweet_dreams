export type OrderStatus = 'pending' | 'paid';
export type TransactionType = 'income' | 'expense';

export interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtTime: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: any; // Firestore Timestamp
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: any; // Firestore Timestamp
  orderId?: string;
  category?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  hasChangedPassword: boolean;
}
