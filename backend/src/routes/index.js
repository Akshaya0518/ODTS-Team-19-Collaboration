/**
 * ALL API ROUTES IN ONE PLACE.
 * Read each line as: METHOD  URL  ->  [who may call it]  ->  [input check]  ->  controller
 */
const express = require('express');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const { asyncHandler: h } = require('../utils/http');
const { z, idParams, orderIdParams, pagination } = require('../validators/common');
const authV = require('../validators/authValidators');
const catalogV = require('../validators/catalogValidators');
const orderV = require('../validators/orderValidators');
const deliveryV = require('../validators/deliveryValidators');
const userV = require('../validators/userValidators');
const reportV = require('../validators/reportValidators');
const auth = require('../controllers/authController');
const catalog = require('../controllers/catalogController');
const orders = require('../controllers/orderController');
const deliveries = require('../controllers/deliveryController');
const misc = require('../controllers/miscController');

const router = express.Router();
const admin = [authenticate, authorize('admin')];

router.get('/health', (_req, res) => res.json({ success: true, message: 'ODTS API is running' }));

/* ---------------- AUTH (ODTS-1, ODTS-3, ODTS-4) ---------------- */
router.post('/auth/register', authLimiter, validate(authV.register), h(auth.register));
router.post('/auth/login', authLimiter, validate(authV.login), h(auth.login));
router.post('/auth/logout', h(auth.logout));
router.get('/auth/me', authenticate, h(auth.me));
router.post('/auth/forgot-password', authLimiter, validate(authV.forgotPassword), h(auth.forgotPassword));
router.post('/auth/reset-password', authLimiter, validate(authV.resetPassword), h(auth.resetPassword));

/* ---------------- PRODUCTS (ODTS-5, ODTS-8) ---------------- */
router.get('/products', optionalAuthenticate, validate(catalogV.listProductsQuery, 'query'), h(catalog.listProducts));
router.get('/products/:id', optionalAuthenticate, validate(idParams, 'params'), h(catalog.getProduct));
router.post('/products', ...admin, validate(catalogV.createProduct), h(catalog.createProduct));
router.patch('/products/:id', ...admin, validate(idParams, 'params'), validate(catalogV.updateProduct), h(catalog.updateProduct));

/* ---------------- CATEGORIES (ODTS-9) ---------------- */
router.get('/categories', optionalAuthenticate, validate(catalogV.listCategoriesQuery, 'query'), h(catalog.listCategories));
router.post('/categories', ...admin, validate(catalogV.createCategory), h(catalog.createCategory));
router.patch('/categories/:id', ...admin, validate(idParams, 'params'), validate(catalogV.updateCategory), h(catalog.updateCategory));

/* ---------------- ORDERS (ODTS-12 and order placement) ---------------- */
router.post('/orders', authenticate, authorize('customer'), validate(orderV.createOrder), h(orders.create));
router.get('/orders/mine', authenticate, authorize('customer'), validate(orderV.listOrdersQuery, 'query'), h(orders.listMine));
router.get('/orders', ...admin, validate(orderV.listOrdersQuery, 'query'), h(orders.listAll));
router.get('/orders/:orderId', authenticate, validate(orderIdParams, 'params'), h(orders.getOne));
router.get('/orders/:orderId/tracking', authenticate, validate(orderIdParams, 'params'), h(orders.track));
router.patch('/orders/:orderId/status', ...admin, validate(orderIdParams, 'params'), validate(orderV.updateStatus), h(orders.updateStatus));
router.post('/orders/:orderId/cancel', authenticate, authorize('customer', 'admin'), validate(orderIdParams, 'params'), validate(orderV.cancelOrder), h(orders.cancel));

/* ---------------- DELIVERIES (ODTS-13, ODTS-14, ODTS-15) ---------------- */
router.post('/deliveries/assign', ...admin, validate(deliveryV.assign), h(deliveries.assign));
router.get('/deliveries', authenticate, authorize('admin', 'delivery'), validate(deliveryV.listQuery, 'query'), h(deliveries.list));
router.get('/deliveries/:id', authenticate, authorize('admin', 'delivery'), validate(idParams, 'params'), h(deliveries.getOne));
router.patch('/deliveries/:id/status', authenticate, authorize('admin', 'delivery'), validate(idParams, 'params'), validate(deliveryV.updateStatus), h(deliveries.updateStatus));
router.post('/deliveries/:id/notes', authenticate, authorize('admin', 'delivery'), validate(idParams, 'params'), validate(deliveryV.addNote), h(deliveries.addNote));

/* ---------------- NOTIFICATIONS (ODTS-16) ---------------- */
const notificationQuery = z.object({ unreadOnly: z.enum(['true', 'false']).optional(), ...pagination });
router.get('/notifications', authenticate, validate(notificationQuery, 'query'), h(misc.listNotifications));
router.patch('/notifications/read-all', authenticate, h(misc.markAllNotificationsRead));
router.patch('/notifications/:id/read', authenticate, validate(idParams, 'params'), h(misc.markNotificationRead));

/* ---------------- USERS ---------------- */
router.patch('/users/me', authenticate, validate(userV.updateProfile), h(misc.updateProfile));
router.get('/users', ...admin, validate(userV.listUsersQuery, 'query'), h(misc.listUsers));
router.get('/users/delivery-personnel', ...admin, h(misc.listDeliveryPersonnel));
router.post('/users/delivery-personnel', ...admin, validate(userV.createDeliveryPerson), h(misc.createDeliveryPerson));
router.patch('/users/:id/status', ...admin, validate(idParams, 'params'), validate(userV.setActive), h(misc.setUserActive));

/* ---------------- DASHBOARD + REPORTS (ODTS-17, ODTS-18) ---------------- */
router.get('/dashboard', authenticate, h(misc.dashboard));
router.get('/reports/orders', ...admin, validate(reportV.orderReportQuery, 'query'), h(misc.orderReport));
router.get('/reports/deliveries', ...admin, validate(reportV.deliveryReportQuery, 'query'), h(misc.deliveryReport));

module.exports = router;
