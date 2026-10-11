const orderService = require('../services/orderService');
const { sendSuccess } = require('../utils/http');

async function create(req, res) {
  const { order, created } = await orderService.createOrder(req.user, req.valid.body);
  sendSuccess(res, {
    status: created ? 201 : 200,
    message: created ? `Order ${order.orderId} placed successfully` : `Order ${order.orderId} was already placed`,
    data: { order, created },
  });
}

async function listMine(req, res) {
  const data = await orderService.listCustomerOrders(req.user, req.valid.query);
  sendSuccess(res, { data });
}

async function listAll(req, res) {
  const data = await orderService.listAllOrders(req.valid.query);
  sendSuccess(res, { data });
}

async function getOne(req, res) {
  const order = await orderService.getOrderDetails(req.user, req.valid.params.orderId);
  sendSuccess(res, { data: { order } });
}

async function updateStatus(req, res) {
  const order = await orderService.adminUpdateStatus(req.user, req.valid.params.orderId, req.valid.body);
  sendSuccess(res, { message: `Order status changed to ${order.status}`, data: { order } });
}

async function cancel(req, res) {
  const order = await orderService.cancelOrder(req.user, req.valid.params.orderId, req.valid.body);
  sendSuccess(res, { message: `Order ${order.orderId} cancelled`, data: { order } });
}

async function track(req, res) {
  const tracking = await orderService.getTracking(req.user, req.valid.params.orderId);
  sendSuccess(res, { data: { tracking } });
}

module.exports = { create, listMine, listAll, getOne, updateStatus, cancel, track };
