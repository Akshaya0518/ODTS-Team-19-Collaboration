import { useState } from 'react';
import { categoryApi } from '../../services/endpoints';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Loader, ErrorMessage, EmptyState, PageHeader, Modal, ConfirmDialog, Field } from '../../components/ui';

function CategoryForm({ initial, onSaved, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: initial.name || '', description: initial.description || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Name must be at least 2 characters' });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (initial._id) await categoryApi.update(initial._id, form);
      else await categoryApi.create(form);
      toast.success(initial._id ? 'Category updated' : 'Category created');
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
      title={initial._id ? 'Edit category' : 'Add category'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="category-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="category-form" className="stack" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="c-name" error={errors.name}>
          <input id="c-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="c-desc" error={errors.description}>
          <textarea id="c-desc" className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <ErrorMessage error={error} />
      </form>
    </Modal>
  );
}

export default function AdminCategories() {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const { data, loading, error, reload } = useAsync(() => categoryApi.list({ includeInactive: 'true' }), []);

  async function toggle(category) {
    try {
      await categoryApi.update(category._id, { isActive: !category.isActive });
      toast.success(category.isActive ? 'Category deactivated' : 'Category activated');
      setToggling(null);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Product categories"
        subtitle="Deactivated categories cannot be chosen for new or edited products."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
            + Add category
          </button>
        }
      />
      <div className="card flush">
        {loading && <Loader />}
        <div style={{ padding: error ? 16 : 0 }}>
          <ErrorMessage error={error} onRetry={reload} />
        </div>
        {data && data.categories.length === 0 && <EmptyState title="No categories yet" />}
        {data && data.categories.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th className="text-right">Active products</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td className="muted">{c.description || '—'}</td>
                    <td className="text-right">{c.productCount}</td>
                    <td>
                      <span className={`badge ${c.isActive ? 'tone-green' : 'tone-slate'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="text-right nowrap">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(c)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => (c.isActive ? setToggling(c) : toggle(c))}>
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <CategoryForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload({ silent: true });
          }}
        />
      )}
      {toggling && (
        <ConfirmDialog
          title="Deactivate category?"
          message={`"${toggling.name}" will no longer be available for new products. Its ${toggling.productCount} existing product(s) stay as they are.`}
          confirmLabel="Deactivate"
          danger
          onCancel={() => setToggling(null)}
          onConfirm={() => toggle(toggling)}
        />
      )}
    </div>
  );
}
