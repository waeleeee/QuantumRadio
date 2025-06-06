import axios, { AxiosInstance } from 'axios';
import { Product, Category, User, AuthUser, Order, OrderItem } from '../types';

const API_BASE_URL = 'http://localhost/quantum_radio_api/index.php';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthUser> => {
    const response = await api.post('/auth', { email, mot_de_passe: password });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Invalid credentials');
    }
    return {
      email: response.data.user.email,
      role: response.data.user.role,
      token: response.data.token,
      nom: response.data.user.nom_utilisateur,
      prenom: '',
    };
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await api.get('/compte_utilisateurs/current');
    return {
      email: response.data.email,
      role: response.data.role,
      token: localStorage.getItem('token') || '',
      nom: response.data.nom,
      prenom: response.data.prenom,
    };
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
  },
};

// Products API
export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get('/produits');
    return response.data.map((item: any) => ({
      id: item.produit_id,
      name: item.nom_produit,
      description: item.description,
      price: parseFloat(item.prix),
      imageUrl: item.image_url,
      categoryId: item.categorie_id,
      category: item.nom_categorie ? { id: item.categorie_id, name: item.nom_categorie } : undefined,
    }));
  },

  getById: async (id: number): Promise<Product> => {
    const response = await api.get(`/produits/${id}`);
    if (response.data.error) throw new Error(response.data.error);
    return {
      id: response.data.produit_id,
      name: response.data.nom_produit,
      description: response.data.description,
      price: parseFloat(response.data.prix),
      imageUrl: response.data.image_url,
      categoryId: response.data.categorie_id,
      category: response.data.nom_categorie ? { id: response.data.categorie_id, name: response.data.nom_categorie } : undefined,
    };
  },

  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const response = await api.post('/produits', {
      nom_produit: product.name,
      description: product.description,
      prix: product.price,
      image_url: product.imageUrl || '',
      categorie_id: product.categoryId,
    });
    return {
      id: response.data.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: response.data.image_url || product.imageUrl || '',
      categoryId: product.categoryId,
    };
  },

  update: async (id: number, product: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/produits/${id}`, {
      nom_produit: product.name || '',
      description: product.description || '',
      prix: product.price || 0,
      image_url: product.imageUrl || '',
      categorie_id: product.categoryId || 1,
    });
    return {
      id,
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      imageUrl: response.data.image_url || product.imageUrl || '',
      categoryId: product.categoryId || 1,
    };
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/produits/${id}`);
  },

  deleteMany: async (ids: number[]): Promise<void> => {
    await api.delete('/produits/bulk', { data: { ids } });
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data.map((item: any) => ({
      id: item.id,
      name: item.name,
    }));
  },

  create: async (category: Omit<Category, 'id'>): Promise<Category> => {
    const response = await api.post('/categories', { name: category.name });
    return {
      id: response.data.id,
      name: category.name,
    };
  },

  update: async (id: number, category: Partial<Category>): Promise<Category> => {
    const response = await api.put('/categories', { id, name: category.name });
    return {
      id,
      name: category.name || '',
    };
  },

  delete: async (id: number): Promise<void> => {
    await api.delete('/categories', { data: { id } });
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/compte_utilisateurs');
    return response.data.map((item: any) => ({
      id: item.id,
      prenom: item.prenom,
      nom: item.nom,
      email: item.email,
      telephone: item.telephone,
      adresse: item.adresse || '',
      role: item.role,
      photo_profil: item.photo_profil || '',
      genre: item.genre || null,
    }));
  },

  getById: async (id: number): Promise<User> => {
    const response = await api.get(`/compte_utilisateurs/${id}`);
    if (response.data.error) throw new Error(response.data.error);
    return {
      id: response.data.id,
      prenom: response.data.prenom,
      nom: response.data.nom,
      email: response.data.email,
      telephone: response.data.telephone,
      adresse: response.data.adresse || '',
      role: response.data.role,
      photo_profil: response.data.photo_profil || '',
      genre: response.data.genre || null,
    };
  },

  create: async (user: Omit<User, 'id'> & { password: string }): Promise<User> => {
    const response = await api.post('/compte_utilisateurs', {
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      genre: user.genre || null,
      photo_profil: user.photo_profil || null,
      role: user.role,
      mot_de_passe: user.password,
    });
    if (response.data.error) throw new Error(response.data.error);
    return {
      id: response.data.id,
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      adresse: user.adresse || '',
      role: user.role,
      photo_profil: user.photo_profil || '',
      genre: user.genre || null,
    };
  },

  update: async (id: number, user: Partial<User> & { password?: string }): Promise<User> => {
    const response = await api.put(`/compte_utilisateurs/${id}`, {
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      genre: user.genre || null,
      photo_profil: user.photo_profil || null,
      role: user.role,
      mot_de_passe: user.password || undefined,
    });
    if (response.data.error) throw new Error(response.data.error);
    return {
      id,
      prenom: user.prenom || '',
      nom: user.nom || '',
      email: user.email || '',
      telephone: user.telephone || '',
      adresse: user.adresse || '',
      role: user.role || 'auditeur',
      photo_profil: user.photo_profil || '',
      genre: user.genre || null,
    };
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete(`/compte_utilisateurs/${id}`);
    if (response.data.error) throw new Error(response.data.error);
  },

  deleteMany: async (ids: number[]): Promise<void> => {
    for (const id of ids) {
      await usersApi.delete(id);
    }
  },
};

// Orders API
export const ordersApi = {
  getAll: async (): Promise<Order[]> => {
    const response = await api.get('/commandes');
    console.log('Raw orders API response:', response.data);
    const products = await productsApi.getAll();
    return response.data.map((item: any) => {
      const total = parseFloat(item.total);
      const simulatedItems: OrderItem[] = products.length > 0
        ? products.slice(0, Math.min(2, products.length)).map((product, index) => ({
            id: index + 1,
            orderId: item.id,
            productId: product.id,
            quantity: 1,
            unitPrice: total / Math.min(2, products.length),
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl || 'https://via.placeholder.com/150',
            },
          }))
        : [];
      return {
        id: item.id,
        dmjId: item.dmj_id,
        date: item.date,
        status: item.status,
        total,
        items: simulatedItems.length > 0 ? simulatedItems : [],
      };
    });
  },

  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/commandes/${id}`);
    if (response.data.error) throw new Error(response.data.error);
    console.log('Raw order by ID API response:', response.data);
    const products = await productsApi.getAll();
    const item = response.data;
    const total = parseFloat(item.total);
    const simulatedItems: OrderItem[] = products.length > 0
      ? products.slice(0, Math.min(2, products.length)).map((product, index) => ({
          id: index + 1,
          orderId: item.id,
          productId: product.id,
          quantity: 1,
          unitPrice: total / Math.min(2, products.length),
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl || 'https://via.placeholder.com/150',
          },
        }))
      : [];
    return {
      id: item.id,
      dmjId: item.dmj_id,
      date: item.date,
      status: item.status,
      total,
      items: simulatedItems.length > 0 ? simulatedItems : [],
    };
  },

  updateStatus: async (id: number, status: 'en_attente' | 'shipped' | 'delivered'): Promise<Order> => {
    const response = await api.put(`/commandes/${id}`, { status });
    return {
      id,
      dmjId: response.data.dmj_id || 0,
      date: response.data.date || new Date().toISOString(),
      status,
      total: parseFloat(response.data.total || 0),
      items: response.data.items?.map((item: any) => ({
        id: item.id,
        orderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        product: item.product
          ? { id: item.productId, name: item.product.name, price: parseFloat(item.unitPrice), imageUrl: item.product.imageUrl }
          : undefined,
      })) || [],
    };
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/commandes/${id}`);
  },
};

// Export CSV function
export const exportToCsv = (data: any[], filename: string): void => {
  if (!data || !data.length) {
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(item =>
      headers
        .map(header => {
          const value = item[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(',')
    ),
  ];
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};