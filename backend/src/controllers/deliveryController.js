const deliveryService = require('../services/deliveryService');
const { sendSuccess } = require('../utils/http');

async function assign(req, res) {
  const { delivery, reassigned } = await deliveryService.assign(req.user, req.valid.body);
  sendSuccess(res, {
    status: reassigned ? 200 : 201,
    message: `Delivery ${reassigned ? 'reassigned' : 'assigned'} to ${delivery.assignedTo.name}`,
    data: { delivery, reassigned },
  });
}

async function list(req, res) {
  const data = await deliveryService.listForUser(req.user, req.valid.query);
  sendSuccess(res, { data });
}

async function getOne(req, res) {
  const delivery = await deliveryService.getDetails(req.user, req.valid.params.id);
  sendSuccess(res, { data: { delivery } });
}

async function updateStatus(req, res) {
  const delivery = await deliveryService.updateStatus(req.user, req.valid.params.id, req.valid.body);
  sendSuccess(res, { message: `Status updated to ${delivery.order.status}`, data: { delivery } });
}

async function addNote(req, res) {
  const delivery = await deliveryService.addNote(req.user, req.valid.params.id, req.valid.body);
  sendSuccess(res, { status: 201, message: 'Note added', data: { delivery } });
}

module.exports = { assign, list, getOne, updateStatus, addNote };
