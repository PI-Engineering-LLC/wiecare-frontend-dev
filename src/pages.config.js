import AdminClients from './pages/AdminClients';
import AdminCourses from './pages/AdminCourses';
import AdminDashboard from './pages/AdminDashboard';
import AdminDocuments from './pages/AdminDocuments';
import AdminInvoices from './pages/AdminInvoices';
import AdminMaintenance from './pages/AdminMaintenance';
import AdminNotifications from './pages/AdminNotifications';
import AdminOrders from './pages/AdminOrders';
import AdminParts from './pages/AdminParts';
import AdminQuotes from './pages/AdminQuotes';
import AdminTraining from './pages/AdminTraining';
import AdminUsers from './pages/AdminUsers';
import AdminWarranty from './pages/AdminWarranty';
import Courses from './pages/Courses';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Invoices from './pages/Invoices';
import Maintenance from './pages/Maintenance';
import Notifications from './pages/Notifications';
import Orders from './pages/Orders';
import Quotes from './pages/Quotes';
import Settings from './pages/Settings';
import Training from './pages/Training';
import WarrantyClaims from './pages/WarrantyClaims';
import __Layout from './Layout.jsx';
import ClientAdminDashboard from './pages/ClientAdminDashboard';

export const PAGES = {
    "AdminClients": AdminClients,
    "ClientAdminDashboard": ClientAdminDashboard,
    "AdminCourses": AdminCourses,
    "AdminDashboard": AdminDashboard,
    "AdminDocuments": AdminDocuments,
    "AdminInvoices": AdminInvoices,
    "AdminMaintenance": AdminMaintenance,
    "AdminNotifications": AdminNotifications,
    "AdminOrders": AdminOrders,
    "AdminParts": AdminParts,
    "AdminQuotes": AdminQuotes,
    "AdminTraining": AdminTraining,
    "AdminUsers": AdminUsers,
    "AdminWarranty": AdminWarranty,
    "Courses": Courses,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "Invoices": Invoices,
    "Maintenance": Maintenance,
    "Notifications": Notifications,
    "Orders": Orders,
    "Quotes": Quotes,
    "Settings": Settings,
    "Training": Training,
    "WarrantyClaims": WarrantyClaims,
}

export const pagesConfig = {
    getMainPage: (isInternalAdmin) => isInternalAdmin ? 'AdminDashboard' : 'Dashboard',
    Pages: PAGES,
    Layout: __Layout,
    routeGuards: { // Renamed from 'roles' to 'routeGuards'
        // For platform-level admin pages, use platformRole: 'platform_admin'
        "AdminClients":       { platformRole: 'platform_admin' },
        "AdminCourses":       { platformRole: 'platform_admin' },
        "AdminDashboard":     { platformRole: 'platform_admin' },
        "AdminDocuments":     { platformRole: 'platform_admin' },
        "AdminInvoices":      { platformRole: 'platform_admin' },
        "AdminMaintenance":   { platformRole: 'platform_admin' },
        "AdminNotifications": { platformRole: 'platform_admin' },
        "AdminOrders":        { platformRole: 'platform_admin' },
        "AdminParts":         { platformRole: 'platform_admin' },
        "AdminQuotes":        { platformRole: 'platform_admin' },
        "AdminTraining":      { platformRole: 'platform_admin' },
        "AdminUsers":         { platformRole: 'platform_admin' },
        "AdminWarranty":      { platformRole: 'platform_admin' },
        // For client-specific admin pages, use allowedRoles: ['client_admin']
        "ClientAdminDashboard": { allowedRoles: ['client_admin'] },
        // Pages not listed here will be accessible by any authenticated user
        // You could also add specific permissions if needed, e.g.:
        // "Quotes": { permission: 'quote:view_own' },
    },
};
