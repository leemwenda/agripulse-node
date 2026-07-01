import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  listingId: number;
  listing: any;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  loading: boolean;
  addToCart: (listingId: number) => Promise<void>;
  removeFromCart: (listingId: number) => Promise<void>;
  refreshCart: () => void;
  isInCart: (listingId: number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(() => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    api.get('/cart')
      .then(r => setItems(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  async function addToCart(listingId: number) {
    await api.post('/cart', { listingId });
    refreshCart();
  }

  async function removeFromCart(listingId: number) {
    await api.delete(`/cart/${listingId}`);
    refreshCart();
  }

  function isInCart(listingId: number) {
    return items.some(i => i.listingId === listingId);
  }

  return (
    <CartContext.Provider value={{ items, count: items.length, loading, addToCart, removeFromCart, refreshCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
