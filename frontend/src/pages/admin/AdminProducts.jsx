import { useState } from 'react';
import { categoryApi, productApi } from '../../services/endpoints';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, EmptyState, PageHeader, Pagination, Modal, ConfirmDialog, Field } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/format';

const EMPTY = { name: '', description: '', category: '', price: '', stock: '', imageUrl: '' };

/** Client-side checks; the server validates again. */
function validateProduct(f) {
  const e = {};
  if (!f.name || f.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!f.category) e.category = 'Choose a category';
  if (!(Number(f.price) > 0)) e.price = 'Price must be greater than 0';
  if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) e.stock = 'Stock must be a whole number, 0 or more';
  return e;
}

function ProductForm({ initial, categories, onSaved, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial._id);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const found = validateProduct(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl.trim(),
    };
    try {
      if (isEdit) await productApi.update(initial._id, body);
      else await productApi.create(body);
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onSaved();
    } catch (err) {
      setErrors(err.fieldErrors ? err.fieldErrors() : {});
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit product' : 'Add product'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={saving} data-testid="product-save">
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </>
      }
    >
      <form id="product-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Product name" htmlFor="p-name" error={errors.name} className="span-2">
          <input id="p-name" className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Category" htmlFor="p-cat" error={errors.category}>
          <select id="p-cat" className="select" value={form.category} onChange={set('category')}>
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id} disabled={!c.isActive}>
                {c.name}
                {!c.isActive ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Image URL (optional)" htmlFor="p-img" error={errors.imageUrl}>
          <input id="p-img" className="input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
        </Field>
        <Field label="Price (₹)" htmlFor="p-price" error={errors.price}>
          <input id="p-price" type="number" min="0.01" step="0.01" className="input" value={form.price} onChange={set('price')} />
        </Field>
        <Field label="Stock" htmlFor="p-stock" error={errors.stock}>
          <input id="p-stock" type="number" min="0" step="1" className="input" value={form.stock} onChange={set('stock')} />
        </Field>
        <Field label="Description" htmlFor="p-desc" error={errors.description} className="span-2">
          <textarea id="p-desc" className="textarea" value={form.description} onChange={set('description')} />
        </Field>
        {error && (
          <div className="span-2">
            <ErrorMessage error={error} />
          </div>
        )}
      </form>
    </Modal>
  );
}

export default function AdminProducts() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const q = useDebounced(search);
  const categories = useAsync(() => categoryApi.list({ includeInactive: 'true' }), []);
  const products = useAsync(
    () => productApi.list({ q, category, page, limit: 15, includeInactive: 'true', sort: 'name' }),
    [q, category, page]
  );
  const categoryList = categories.data?.categories || [];

  async function toggleActive(product) {
    try {
      await productApi.update(product._id, { isActive: !product.isActive });
      toast.success(product.isActive ? 'Product deactivated' : 'Product activated');
      setToggling(null);
      products.reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Product management"
        subtitle="Add, edit, restock and deactivate products."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(EMPTY)} data-testid="add-product">
            + Add product
          </button>
        }
      />
      <div className="card flush">
        <div className="toolbar" style={{ padding: '16px 16px 0' }}>
          <input className="input grow" type="search" placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search" />
          <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category">
            <option value="">All categories</option>
            {categoryList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {products.loading && <Loader />}
        <div style={{ padding: '0 16px' }}>
          <ErrorMessage error={products.error} onRetry={products.reload} />
        </div>
        {products.data && !products.loading && products.data.items.length === 0 && <EmptyState title="No products found" />}
        {products.data && !products.loading && products.data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Stock</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.data.items.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="small muted mono">{p._id}</div>
                      </td>
                      <td>{p.category?.name}</td>
                      <td className="text-right">{formatCurrency(p.price)}</td>
                      <td className={`text-right ${p.stock === 0 ? 'stock-out' : p.stock <= 5 ? 'stock-low' : ''}`}>{p.stock}</td>
                      <td>
                        <span className={`badge ${p.isActive ? 'tone-green' : 'tone-slate'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="nowrap">{formatDate(p.createdAt)}</td>
                      <td className="text-right nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditing({ ...p, category: p.category?._id || '', price: String(p.price), stock: String(p.stock), imageUrl: p.imageUrl || '' })}
                        >
                          Edit
                        </button>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => (p.isActive ? setToggling(p) : toggleActive(p))}>
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={products.data.page} totalPages={products.data.totalPages} total={products.data.total} onPage={setPage} />
          </>
        )}
      </div>

      {editing && (
        <ProductForm
          initial={editing}
          categories={categoryList}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            products.reload({ silent: true });
          }}
        />
      )}
      {toggling && (
        <ConfirmDialog
          title="Deactivate product?"
          message={`"${toggling.name}" will be hidden from the catalogue and cannot be ordered. Existing orders are not affected. You can activate it again later.`}
          confirmLabel="Deactivate"
          danger
          onCancel={() => setToggling(null)}
          onConfirm={() => toggleActive(toggling)}
        />
      )}
    </div>
  );
}
