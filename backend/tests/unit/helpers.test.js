/**
 * UNIT TESTS — pure helpers and input validators (no database needed).
 */
const { formatOrderId, dateStamp, ORDER_ID_PATTERN } = require('../../src/utils/orderId');
const { toCsv } = require('../../src/utils/csv');
const { roundMoney, escapeRegex, getPagination } = require('../../src/utils/http');
const { calculateTotals, mergeCartLines, buildTimeline } = require('../../src/services/orderService');
const authV = require('../../src/validators/authValidators');
const orderV = require('../../src/validators/orderValidators');
const catalogV = require('../../src/validators/catalogValidators');

const validAddress = { line1: '12, Gandhi Street', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641002' };
const validRegistration = {
  name: 'Arun',
  email: 'arun@example.com',
  mobile: '9876543210',
  password: 'Secret@123',
  confirmPassword: 'Secret@123',
  address: validAddress,
};

describe('Order ID', () => {
  test('UT-ID-01 formats as ODTS-YYYYMMDD-NNNN', () => {
    expect(formatOrderId('20261009', 7)).toBe('ODTS-20261009-0007');
    expect(dateStamp(new Date(2026, 0, 5))).toBe('20260105');
    expect(ORDER_ID_PATTERN.test('ODTS-20261009-0007')).toBe(true);
  });

  test('UT-ID-02 keeps working past 9999 orders in a day (boundary)', () => {
    expect(formatOrderId('20261009', 10000)).toBe('ODTS-20261009-10000');
    expect(ORDER_ID_PATTERN.test('ODTS-20261009-10000')).toBe(true);
  });
});

describe('Money and cart helpers', () => {
  test('UT-MONEY-01 rounds to 2 decimals', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  test('UT-MONEY-02 delivery fee applies below the free-delivery threshold', () => {
    expect(calculateTotals([{ lineTotal: 998 }])).toEqual({ subtotal: 998, deliveryFee: 40, total: 1038 });
  });

  test('UT-MONEY-03 delivery is free exactly AT the threshold (boundary)', () => {
    expect(calculateTotals([{ lineTotal: 999 }])).toEqual({ subtotal: 999, deliveryFee: 0, total: 999 });
  });

  test('UT-CART-01 duplicate cart lines are merged', () => {
    expect(
      mergeCartLines([
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 1 },
        { productId: 'a', quantity: 3 },
      ])
    ).toEqual([
      { productId: 'a', quantity: 5 },
      { productId: 'b', quantity: 1 },
    ]);
  });
});

describe('Security helpers', () => {
  test('UT-SEC-01 regex special characters are escaped', () => {
    expect(escapeRegex('a.*b')).toBe('a\\.\\*b');
  });

  test('UT-SEC-02 CSV cells that look like formulas are neutralised', () => {
    const csv = toCsv([{ key: 'v', label: 'Value' }], [{ v: '=HYPERLINK("x")' }, { v: 'a,b' }]);
    expect(csv).toBe('Value\r\n"\'=HYPERLINK(""x"")"\r\n"a,b"');
  });

  test('UT-SEC-03 pagination limit is capped at 100', () => {
    expect(getPagination({ page: '2', limit: '5000' })).toEqual({ page: 2, limit: 100, skip: 100 });
  });
});

describe('Registration validator', () => {
  test('UT-VAL-01 accepts a valid registration (positive)', () => {
    expect(authV.register.safeParse(validRegistration).success).toBe(true);
  });

  test('UT-VAL-02 removes a "role" field sent by the browser (mass assignment)', () => {
    const result = authV.register.parse({ ...validRegistration, role: 'admin' });
    expect(result.role).toBeUndefined();
  });

  test('UT-VAL-03 password of 7 characters is rejected, 8 accepted (boundary)', () => {
    const seven = { ...validRegistration, password: 'Abc@123', confirmPassword: 'Abc@123' };
    const eight = { ...validRegistration, password: 'Abcd@123', confirmPassword: 'Abcd@123' };
    expect(authV.register.safeParse(seven).success).toBe(false);
    expect(authV.register.safeParse(eight).success).toBe(true);
  });

  test('UT-VAL-04 password without a number is rejected (negative)', () => {
    const r = authV.register.safeParse({ ...validRegistration, password: 'Password', confirmPassword: 'Password' });
    expect(r.success).toBe(false);
  });

  test('UT-VAL-05 mismatched confirm password is rejected', () => {
    const r = authV.register.safeParse({ ...validRegistration, confirmPassword: 'Other@123' });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].path).toEqual(['confirmPassword']);
  });

  test('UT-VAL-06 invalid email and mobile are rejected', () => {
    expect(authV.register.safeParse({ ...validRegistration, email: 'not-an-email' }).success).toBe(false);
    expect(authV.register.safeParse({ ...validRegistration, mobile: '12345' }).success).toBe(false);
  });
});

describe('Order and product validators', () => {
  const order = (quantity) => ({
    items: [{ productId: 'a'.repeat(24), quantity }],
    shippingAddress: { ...validAddress, recipientName: 'Arun', mobile: '9876543210' },
  });

  test('UT-VAL-07 quantity 0 and 21 rejected, 1 and 20 accepted (boundary)', () => {
    expect(orderV.createOrder.safeParse(order(0)).success).toBe(false);
    expect(orderV.createOrder.safeParse(order(1)).success).toBe(true);
    expect(orderV.createOrder.safeParse(order(20)).success).toBe(true);
    expect(orderV.createOrder.safeParse(order(21)).success).toBe(false);
  });

  test('UT-VAL-08 a price sent by the browser is ignored', () => {
    const parsed = orderV.createOrder.parse({ ...order(1), total: 1, items: [{ productId: 'a'.repeat(24), quantity: 1, price: 1 }] });
    expect(parsed.total).toBeUndefined();
    expect(parsed.items[0].price).toBeUndefined();
  });

  test('UT-VAL-09 product price must be > 0 and stock must be >= 0 (boundary)', () => {
    const base = { name: 'Pen', category: 'b'.repeat(24), price: 10, stock: 0 };
    expect(catalogV.createProduct.safeParse(base).success).toBe(true);
    expect(catalogV.createProduct.safeParse({ ...base, price: 0 }).success).toBe(false);
    expect(catalogV.createProduct.safeParse({ ...base, stock: -1 }).success).toBe(false);
    expect(catalogV.createProduct.safeParse({ ...base, stock: 1.5 }).success).toBe(false);
  });
});

describe('Tracking timeline', () => {
  const at = new Date('2026-10-09T10:00:00Z');
  const history = (...statuses) => statuses.map((status) => ({ status, at }));

  test('UT-TL-01 marks finished steps done and the current one current', () => {
    const steps = buildTimeline({ status: 'Shipped', statusHistory: history('Pending', 'Confirmed', 'Processing', 'Shipped') });
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(steps[0].label).toBe('Order Placed');
  });

  test('UT-TL-02 a delivered order shows every step done', () => {
    const steps = buildTimeline({
      status: 'Delivered',
      statusHistory: history('Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'),
    });
    expect(steps.every((s) => s.state === 'done')).toBe(true);
  });

  test('UT-TL-03 a cancelled order stops at the last reached step', () => {
    const steps = buildTimeline({ status: 'Cancelled', statusHistory: history('Pending', 'Confirmed', 'Cancelled') });
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'cancelled', 'cancelled', 'cancelled', 'cancelled']);
  });
});
