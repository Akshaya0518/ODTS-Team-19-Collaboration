const User = require('../models/User');
const Delivery = require('../models/Delivery');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('./authService');
const { FINAL_STATUSES } = require('../utils/orderStatus');
const { getPagination, paginated, escapeRegex } = require('../utils/http');

/** Only name, mobile and address can be changed by the user — never email, role or status. */
async function updateProfile(user, data) {
  const current = await User.findById(user._id);
  if (!current) throw ApiError.notFound('User not found');
  current.set(data); // data was already filtered by the validator: only name, mobile, address
  return current.save();
}

async function listUsers(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
  }
  const pg = getPagination(query);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    User.countDocuments(filter),
  ]);
  return paginated(items, total, pg);
}

/** Delivery staff with their active / completed delivery counts (for the admin page). */
async function listDeliveryPersonnel() {
  const people = await User.find({ role: 'delivery' }).sort({ name: 1 }).lean();
  const deliveries = await Delivery.find({ assignedTo: { $in: people.map((p) => p._id) } })
    .populate('order', 'status')
    .lean();

  const stats = new Map(people.map((p) => [String(p._id), { active: 0, completed: 0, cancelled: 0 }]));
  for (const d of deliveries) {
    const s = stats.get(String(d.assignedTo));
    if (!s || !d.order) continue;
    if (d.order.status === 'Delivered') s.completed += 1;
    else if (d.order.status === 'Cancelled') s.cancelled += 1;
    else if (!FINAL_STATUSES.includes(d.order.status)) s.active += 1;
  }
  return people.map((p) => {
    delete p.passwordHash;
    return { ...p, stats: stats.get(String(p._id)) };
  });
}

async function createDeliveryPerson({ name, email, mobile, password }) {
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  const passwordHash = await hashPassword(password);
  return User.create({ name, email, mobile, passwordHash, role: 'delivery' });
}

/** Activate / deactivate customers or delivery staff. Admin accounts are protected. */
async function setActive(targetId, isActive, admin) {
  if (String(targetId) === String(admin._id)) throw ApiError.badRequest('You cannot deactivate your own account');
  const user = await User.findById(targetId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.forbidden('Administrator accounts cannot be changed here');
  user.isActive = isActive;
  await user.save();
  return user;
}

module.exports = {
  updateProfile,
  listUsers,
  listDeliveryPersonnel,
  createDeliveryPerson,
  setActive,
};
