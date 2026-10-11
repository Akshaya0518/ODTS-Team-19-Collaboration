import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart, MAX_QTY } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { orderApi, productApi } from '../../services/endpoints';
import { ProductThumb } from '../../components/products/ProductParts';
import AddressFields from '../../components/forms/AddressFields';
import { EmptyState, ErrorMessage, Field, PageHeader, Alert } from '../../components/ui';
import { formatCurrency } from '../../utils/format';
import { MOBILE_RE, validateAddress } from '../../utils/validation';

/** Display-only estimate. The real numbers are calculated by the server when the order is placed. */
const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 999;

const newCheckoutKey = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Cart() {
  const { user } = useAuth();
  const cart = useCart();
  const { items, subtotal, updateQuantity, removeItem, syncProduct, markUnavailable } = cart;
  const toast = useToast();
  const navigate = useNavigate();
  const checkoutKey = useRef(newCheckoutKey());

  const [shipping, setShipping] = useState(() => ({
    recipientName: user?.name || '',
    mobile: user?.mobile || '',
    ...(user?.address || { line1: '', city: '', state: '', pincode: '' }),
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [placing, setPlacing] = useState(false);

  // Refresh price & stock of every cart item from the server once when the page opens.
  useEffect(() => {
    items.forEach((item) => {
      productApi
        .get(item.productId)
        .then((d) => syncProduct(d.product))
        .catch((err) => err.status === 404 && markUnavailable(item.productId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on open
  }, []);

  // Pre-fill the delivery address once the user is known.
  useEffect(() => {
    if (user?.role === 'customer') {
      setShipping((s) => ({
        recipientName: s.recipientName || user.name,
        mobile: s.mobile || user.mobile,
        line1: s.line1 || user.address?.line1 || '',
        city: s.city || user.address?.city || '',
        state: s.state || user.address?.state || '',
        pincode: s.pincode || user.address?.pincode || '',
      }));
    }
  }, [user]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        action={
          <Link to="/products" className="btn btn-primary">
            Browse products
          </Link>
        }
      >
        Add a few products and come back here to place your order.
      </EmptyState>
    );
  }

  const hasUnavailable = items.some((i) => i.unavailable || i.stock <= 0 || i.quantity > i.stock);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

  async function placeOrder(e) {
    e.preventDefault();
    const found = validateAddress(shipping, 'shippingAddress.');
    if (!shipping.recipientName || shipping.recipientName.trim().length < 2) found['shippingAddress.recipientName'] = 'Recipient name is required';
    if (!MOBILE_RE.test(shipping.mobile || '')) found['shippingAddress.mobile'] = 'Enter a valid 10-digit mobile number';
    setErrors(found);
    if (Object.keys(found).length) return;

    setPlacing(true);
    setError(null);
    try {
      const data = await orderApi.create({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: shipping,
        idempotencyKey: checkoutKey.current,
      });
      cart.clear();
      checkoutKey.current = newCheckoutKey();
      toast.success(`Order ${data.order.orderId} placed!`);
      navigate(`/order-confirmation/${data.order.orderId}`, { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors ? err.fieldErrors() : {});
      setError(err);
      if (err.status === 409) {
        // Stock changed — refresh the cart so the customer sees the real numbers.
        items.forEach((i) => productApi.get(i.productId).then((d) => syncProduct(d.product)).catch(() => markUnavailable(i.productId)));
      }
    } finally {
      setPlacing(false);
    }
  }

  const setField = (field) => (e) => setShipping((s) => ({ ...s, [field]: e.target.value }));

  return (
    <div>
      <PageHeader title="Your cart" subtitle={`${cart.count} item(s)`} />
      <div className="grid grid-main-side">
        <div className="card flush">
          <div className="table-wrap">
            <table className="table" data-testid="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th className="text-right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId} data-testid="cart-row">
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <div style={{ width: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <ProductThumb name={item.name} imageUrl={item.imageUrl} category={item.categoryName} />
                        </div>
                        <div>
                          <Link to={`/products/${item.productId}`}>{item.name}</Link>
                          {item.unavailable && <div className="stock-out small">No longer available — please remove</div>}
                          {!item.unavailable && item.quantity > item.stock && (
                            <div className="stock-low small">Only {item.stock} in stock</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="nowrap">{formatCurrency(item.price)}</td>
                    <td>
                      <div className="qty">
                        <button type="button" aria-label="Decrease" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                          −
                        </button>
                        <input aria-label={`Quantity of ${item.name}`} value={item.quantity} readOnly data-testid="cart-qty" />
                        <button
                          type="button"
                          aria-label="Increase"
                          disabled={item.quantity >= Math.min(MAX_QTY, item.stock)}
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="text-right nowrap">{formatCurrency(item.price * item.quantity)}</td>
                    <td className="text-right">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(item.productId)} aria-label={`Remove ${item.name}`}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form className="card stack" onSubmit={placeOrder} noValidate data-testid="checkout-form">
          <h2>Order summary</h2>
          <div>
            <div className="summary-line">
              <span className="muted">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-line">
              <span className="muted">Delivery</span>
              <span>{deliveryFee ? formatCurrency(deliveryFee) : 'Free'}</span>
            </div>
            <div className="summary-line total">
              <span>Estimated total</span>
              <span>{formatCurrency(subtotal + deliveryFee)}</span>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              Free delivery on orders of {formatCurrency(FREE_DELIVERY_THRESHOLD)} or more. Final prices are confirmed by
              the server when you place the order.
            </p>
          </div>

          {!user && (
            <>
              <Alert type="info">Log in as a customer to place your order. Your cart will be kept.</Alert>
              <Link to="/login" state={{ from: '/cart' }} className="btn btn-primary btn-block" data-testid="login-to-checkout">
                Log in to checkout
              </Link>
            </>
          )}
          {user && user.role !== 'customer' && <Alert type="warning">Only customer accounts can place orders.</Alert>}
          {user?.role === 'customer' && (
            <>
              <h3>Delivery details</h3>
              <div className="form-grid">
                <Field label="Recipient name" htmlFor="recipientName" error={errors['shippingAddress.recipientName']}>
                  <input id="recipientName" className="input" value={shipping.recipientName} onChange={setField('recipientName')} />
                </Field>
                <Field label="Mobile" htmlFor="shipMobile" error={errors['shippingAddress.mobile']}>
                  <input id="shipMobile" className="input" value={shipping.mobile} maxLength={10} onChange={setField('mobile')} />
                </Field>
              </div>
              <AddressFields value={shipping} onChange={(a) => setShipping((s) => ({ ...s, ...a }))} errors={errors} prefix="shippingAddress." />
              <ErrorMessage error={error} />
              {hasUnavailable && <Alert type="warning">Fix the highlighted items before placing the order.</Alert>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={placing || hasUnavailable} data-testid="place-order">
                {placing ? 'Placing order…' : 'Place order'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
