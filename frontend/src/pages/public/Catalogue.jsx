import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { categoryApi, productApi } from '../../services/endpoints';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { ProductCard } from '../../components/products/ProductParts';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination } from '../../components/ui';

export default function Catalogue() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounced(search);
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page')) || 1;

  const categories = useAsync(() => categoryApi.list(), []);
  const products = useAsync(() => productApi.list({ q, category, sort, page, limit: 12 }), [q, category, sort, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const handleAdd = (product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div>
      <PageHeader title="Product catalogue" subtitle="Search, filter and add products to your cart." />
      <div className="toolbar">
        <input
          className="input grow"
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
          data-testid="product-search"
        />
        <select className="select" value={category} onChange={(e) => updateParam('category', e.target.value)} aria-label="Category" data-testid="category-filter">
          <option value="">All categories</option>
          {(categories.data?.categories || []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => updateParam('sort', e.target.value)} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {products.loading && <Loader label="Loading products…" />}
      <ErrorMessage error={products.error} onRetry={products.reload} />
      {products.data && !products.loading && (
        <>
          {products.data.items.length === 0 ? (
            <EmptyState icon="🔍" title="No products found">
              Try a different search term or category.
            </EmptyState>
          ) : (
            <div className="product-grid">
              {products.data.items.map((p) => (
                <ProductCard key={p._id} product={p} onAdd={handleAdd} canAdd={!user || user.role === 'customer'} />
              ))}
            </div>
          )}
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            total={products.data.total}
            onPage={(p) => updateParam('page', String(p))}
          />
        </>
      )}
    </div>
  );
}
