/**
 * UNIT TESTS — order status rules (no database needed).
 * Module 3: Delivery tracking and status updates.
 */
const {
  ORDER_STATUS: S,
  assertTransitionAllowed,
  nextStatusesFor,
  trackingLabel,
} = require('../../src/utils/orderStatus');

const allowed = (args) => assertTransitionAllowed({ hasAssignment: true, isAssignee: true, ...args });

describe('assertTransitionAllowed', () => {
  test('UT-ST-01 admin can confirm a pending order (positive)', () => {
    expect(allowed({ from: S.PENDING, to: S.CONFIRMED, role: 'admin' })).toBe(true);
  });

  test('UT-ST-02 assigned delivery person can mark Shipped -> Out for Delivery (positive)', () => {
    expect(allowed({ from: S.SHIPPED, to: S.OUT_FOR_DELIVERY, role: 'delivery' })).toBe(true);
  });

  test('UT-ST-03 unknown status is rejected with 400 (negative)', () => {
    expect(() => allowed({ from: S.PENDING, to: 'Teleported', role: 'admin' })).toThrow(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  test('UT-ST-04 same status twice is rejected with 409 (boundary)', () => {
    expect(() => allowed({ from: S.SHIPPED, to: S.SHIPPED, role: 'admin' })).toThrow(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  test('UT-ST-05 skipping steps (Pending -> Delivered) is rejected with 409 (negative)', () => {
    expect(() => allowed({ from: S.PENDING, to: S.DELIVERED, role: 'admin' })).toThrow(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  test('UT-ST-06 nothing can change after Delivered (boundary)', () => {
    expect(() => allowed({ from: S.DELIVERED, to: S.CANCELLED, role: 'admin' })).toThrow(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  test('UT-ST-07 customer cannot confirm an order -> 403 (authorization)', () => {
    expect(() => allowed({ from: S.PENDING, to: S.CONFIRMED, role: 'customer' })).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  test('UT-ST-08 delivery person who is not the assignee -> 403 (authorization)', () => {
    expect(() =>
      allowed({ from: S.SHIPPED, to: S.OUT_FOR_DELIVERY, role: 'delivery', isAssignee: false })
    ).toThrow(expect.objectContaining({ statusCode: 403 }));
  });

  test('UT-ST-09 cannot ship without an assigned delivery person -> 409 (negative)', () => {
    expect(() =>
      allowed({ from: S.PROCESSING, to: S.SHIPPED, role: 'admin', hasAssignment: false })
    ).toThrow(expect.objectContaining({ statusCode: 409 }));
  });

  test('UT-ST-10 customer can cancel Pending but not Processing', () => {
    expect(allowed({ from: S.PENDING, to: S.CANCELLED, role: 'customer' })).toBe(true);
    expect(() => allowed({ from: S.PROCESSING, to: S.CANCELLED, role: 'customer' })).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
  });
});

describe('nextStatusesFor / trackingLabel', () => {
  test('UT-ST-11 lists only the moves a role may make', () => {
    expect(nextStatusesFor(S.PENDING, 'admin')).toEqual([S.CONFIRMED, S.CANCELLED]);
    expect(nextStatusesFor(S.PENDING, 'customer')).toEqual([S.CANCELLED]);
    expect(nextStatusesFor(S.PROCESSING, 'delivery')).toEqual([]);
    expect(nextStatusesFor(S.OUT_FOR_DELIVERY, 'delivery')).toEqual([S.DELIVERED]);
  });

  test('UT-ST-12 Pending is shown to customers as "Order Placed"', () => {
    expect(trackingLabel(S.PENDING)).toBe('Order Placed');
    expect(trackingLabel(S.CONFIRMED)).toBe('Order Confirmed');
    expect(trackingLabel(S.CANCELLED)).toBe('Cancelled');
  });
});
