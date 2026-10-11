/**
 * Every page of the app and who may open it.
 * Public pages use the shop layout; dashboards use the sidebar layout.
 */
import { Route, Routes } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';

import Home from '../pages/public/Home';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';
import ForgotPassword from '../pages/public/ForgotPassword';
import ResetPassword from '../pages/public/ResetPassword';
import Catalogue from '../pages/public/Catalogue';
import ProductDetails from '../pages/public/ProductDetails';
import Cart from '../pages/public/Cart';
import OrderConfirmation from '../pages/public/OrderConfirmation';
import NotFound from '../pages/public/NotFound';

import CustomerDashboard from '../pages/customer/CustomerDashboard';
import MyOrders from '../pages/customer/MyOrders';
import OrderDetails from '../pages/customer/OrderDetails';
import OrderTracking from '../pages/customer/OrderTracking';
import Notifications from '../pages/shared/Notifications';
import Profile from '../pages/shared/Profile';

import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminOrderDetails from '../pages/admin/AdminOrderDetails';
import AdminAssignments from '../pages/admin/AdminAssignments';
import AdminDeliveries from '../pages/admin/AdminDeliveries';
import DeliveryPersonnel from '../pages/admin/DeliveryPersonnel';
import Reports from '../pages/admin/Reports';

import DeliveryDashboard from '../pages/delivery/DeliveryDashboard';
import AssignedDeliveries from '../pages/delivery/AssignedDeliveries';
import DeliveryDetails from '../pages/delivery/DeliveryDetails';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public shop pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/products" element={<Catalogue />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route
          path="/order-confirmation/:orderId"
          element={
            <ProtectedRoute roles={['customer']}>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Logged-in pages with the sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />

          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/orders" element={<MyOrders />} />
            <Route path="/customer/orders/:orderId" element={<OrderDetails />} />
            <Route path="/customer/orders/:orderId/track" element={<OrderTracking />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:orderId" element={<AdminOrderDetails />} />
            <Route path="/admin/assignments" element={<AdminAssignments />} />
            <Route path="/admin/deliveries" element={<AdminDeliveries />} />
            <Route path="/admin/personnel" element={<DeliveryPersonnel />} />
            <Route path="/admin/reports" element={<Reports />} />
          </Route>

          <Route element={<ProtectedRoute roles={['delivery']} />}>
            <Route path="/delivery" element={<DeliveryDashboard />} />
            <Route path="/delivery/deliveries" element={<AssignedDeliveries />} />
            <Route path="/delivery/deliveries/:id" element={<DeliveryDetails />} />
          </Route>
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
