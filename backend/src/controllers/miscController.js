/** Controllers for notifications, users, dashboards and reports. */
const notificationService = require('../services/notificationService');
const userService = require('../services/userService');
const dashboardService = require('../services/dashboardService');
const reportService = require('../services/reportService');
const { toCsv } = require('../utils/csv');
const { sendSuccess } = require('../utils/http');

/* Notifications */
async function listNotifications(req, res) {
  sendSuccess(res, { data: await notificationService.listForUser(req.user._id, req.valid.query) });
}
async function markNotificationRead(req, res) {
  const notification = await notificationService.markRead(req.user._id, req.valid.params.id);
  sendSuccess(res, { message: 'Marked as read', data: { notification } });
}
async function markAllNotificationsRead(req, res) {
  sendSuccess(res, { message: 'All notifications marked as read', data: await notificationService.markAllRead(req.user._id) });
}

/* Users */
async function updateProfile(req, res) {
  const user = await userService.updateProfile(req.user, req.valid.body);
  sendSuccess(res, { message: 'Profile updated', data: { user } });
}
async function listUsers(req, res) {
  sendSuccess(res, { data: await userService.listUsers(req.valid.query) });
}
async function listDeliveryPersonnel(_req, res) {
  sendSuccess(res, { data: { personnel: await userService.listDeliveryPersonnel() } });
}
async function createDeliveryPerson(req, res) {
  const user = await userService.createDeliveryPerson(req.valid.body);
  sendSuccess(res, { status: 201, message: 'Delivery person account created', data: { user } });
}
async function setUserActive(req, res) {
  const user = await userService.setActive(req.valid.params.id, req.valid.body.isActive, req.user);
  sendSuccess(res, { message: user.isActive ? 'Account activated' : 'Account deactivated', data: { user } });
}

/* Dashboards — each role gets its own numbers */
async function dashboard(req, res) {
  const builders = {
    admin: dashboardService.adminStats,
    customer: dashboardService.customerStats,
    delivery: dashboardService.deliveryStats,
  };
  const stats = await builders[req.user.role](req.user);
  sendSuccess(res, { data: { role: req.user.role, stats } });
}

/* Reports (JSON or CSV download) */
function sendReport(res, report, columns, filename) {
  if (res.req.valid.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(`\uFEFF${toCsv(columns, report.rows)}`); // BOM so Excel shows ₹ and names correctly
  }
  return sendSuccess(res, { data: report });
}
async function orderReport(req, res) {
  const report = await reportService.orderReport(req.valid.query);
  sendReport(res, report, reportService.ORDER_CSV_COLUMNS, 'odts-order-report.csv');
}
async function deliveryReport(req, res) {
  const report = await reportService.deliveryReport(req.valid.query);
  sendReport(res, report, reportService.DELIVERY_CSV_COLUMNS, 'odts-delivery-report.csv');
}

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateProfile,
  listUsers,
  listDeliveryPersonnel,
  createDeliveryPerson,
  setUserActive,
  dashboard,
  orderReport,
  deliveryReport,
};
