export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: number;
  category?: Category;
}

export interface Category {
  id: number;
  name: string;
}

export interface User {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  role: 'dmj' | 'auditeur';
  photo_profil?: string;
}

export interface Order {
  id: number;
  dmjId: number;
  date: string;
  status: 'en_attente' | 'shipped' | 'delivered';
  total: number;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface AuthUser {
  email: string;
  role: string;
  token: string;
  nom?: string;
  prenom?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}