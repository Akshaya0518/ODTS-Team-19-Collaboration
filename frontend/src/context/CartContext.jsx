import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * The shopping cart lives in the browser (localStorage) until checkout.
 * Prices here are only for DISPLAY — the backend recalculates every price
 * and checks stock when the order is placed.
 */
const CartContext = createContext(null);
const STORAGE_KEY = 'odts_cart_v1';
export const MAX_QTY = 20;

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const clampQty = (qty, stock) => Math.max(1, Math.min(MAX_QTY, stock ?? MAX_QTY, Math.floor(Number(qty) || 1)));

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage may be unavailable (private mode) — the cart still works for this tab */
    }
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === product._id);
      if (existing) {
        return current.map((i) =>
          i.productId === product._id ? { ...i, quantity: clampQty(i.quantity + quantity, product.stock) } : i
        );
      }
      return [
        ...current,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          categoryName: product.category?.name,
          quantity: clampQty(quantity, product.stock),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems((current) =>
      current.map((i) => (i.productId === productId ? { ...i, quantity: clampQty(quantity, i.stock) } : i))
    );
  }, []);

  /** Refreshes price/stock with fresh data from the server. */
  const syncProduct = useCallback((product) => {
    setItems((current) =>
      current.map((i) =>
        i.productId === product._id
          ? { ...i, name: product.name, price: product.price, stock: product.stock, unavailable: false }
          : i
      )
    );
  }, []);

  const markUnavailable = useCallback((productId) => {
    setItems((current) => current.map((i) => (i.productId === productId ? { ...i, unavailable: true } : i)));
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((current) => current.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, count, subtotal, addItem, updateQuantity, removeItem, clear, syncProduct, markUnavailable };
  }, [items, addItem, updateQuantity, removeItem, clear, syncProduct, markUnavailable]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
