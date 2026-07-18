const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// @ts-ignore
const request = async (method, path, { data, params } = {}, isFormData = false) => {
// console.log("Data entries:", [...data.entries()]);
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  }
  const activeClientId = localStorage.getItem('activeClientId');
  const headers = new Headers();
  if (activeClientId) { 
    headers.set('X-Tenant-Id', activeClientId);
  }
  if (!isFormData) headers.set('Content-Type', 'application/json'); //multipart/form-data for csv
  let res = await fetch(url.toString(), {
    method,
    credentials: 'include',
    headers,
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
  });

  // Token expired — try to refresh once
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      // If refresh failed, throw error to trigger logout in AuthContext
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }

    // Retry original request with new token and headers
    const newHeaders =  new Headers();
    if (activeClientId) {
      newHeaders.set('X-Tenant-Id', activeClientId);
    }
    if (!isFormData) newHeaders.set('Content-Type', 'application/json');

    res = await  fetch(url.toString(), {
      method,
      credentials: 'include',
      headers: newHeaders,
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

async function tryRefresh() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', 
  });

  if (!res.ok) return false;

  const data = await res.json();
  return true;
}

export const api = {
  // Auth
  login: (data) => request('POST', '/auth/login', { data }),
  changePassword: (data) => request('POST', '/auth/change-password', { data }),
  forgotPassword: (data) => request('POST', '/auth/forgot-password', { data }),
  resetPassword: (data) => request('POST', '/auth/reset-password', { data }),
  acceptInvite: (data) => request('POST', '/auth/accept-invite', { data }),
  setupMfa: () => request('POST', '/auth/setup-mfa'),
  verifyMfa: (data) => request('POST', '/auth/verify-mfa', { data }),
  disableMfa: (data) => request('POST', '/auth/disable-mfa', { data }),

  logout: async () => {
    await request('POST', '/auth/logout');
    api.clearLoggedInUser(); // Ensure this clears any cached user data as well
    window.location.href = '/login'; // Redirect after logout
  },

  // Invite
  inviteUser: (data) => request('POST', '/invites', { data }),
  getInvites: (filters) => request('GET', '/invites', { params: filters }),
  getInvite: (id) => request('GET', `/invites/${id}`),
  resendInvite: (id) => request('POST', `/invites/${id}/resend`),
  revokeInvite: (id) => request('POST', `/invites/${id}/revoke`),

  //Roles
  getRoles: (filters) => request('GET', '/roles', { params: filters }),
  createRole: (data) => request('POST', '/roles', { data }),
  updateRole: (id, data) => request('PATCH', `/roles/${id}`, { data }),
  deleteRole: (id) => request('DELETE', `/roles/${id}`),
  setRolePermissions: (id, data) => request('PUT', `/roles/${id}/permissions`, { data }),

  //Departments
  getDepartments: (filters) => request('GET', '/departments', { params: filters }),
  getDepartment: (id) => request('GET', `departments/${id}`),
  createDepartment: (data) => request('POST', 'departments', { data }),
  updateDeparment: (id, data) => request('PUT', `departments/${id}`, { data }),

  //Permissions
  getPermissions: (filters) => request('GET', '/permissions', { params: filters }),
  createPermission: (data) => request('POST', '/permissions', { data }),
  updatePermission: (id, data) => request('PATCH', `/permissions/${id}`, { data }),
  deletePermission: (id) => request('DELETE', `/permissions/${id}`),


  // Users (admin)
  me: () => request('GET', '/users/me'),
  updateMe: (data) => request('PATCH', '/users/me', { data }),
  getUsers: (filters) => request('GET', '/users', { params: filters }),
  getUser: (id) => request('GET', `/users/${id}`),
  updateUser: (id, data) => request('PATCH', `/users/${id}`, { data }),
  addUserToClient: (userId, clientId, data) => request('POST', `/users/${userId}/clients/${clientId}`, { data }),
  updateUserClientRoles: (userId, clientId, data) => request('PUT', `/users/${userId}/clients/${clientId}/roles`, { data }),
  removeUserFromClient: (userId, clientId) => request('DELETE', `/users/${userId}/clients/${clientId}`),


  // Clients
  getClients: (params) => request('GET', '/clients', { params }),
  getClient: (id) => request('GET', `/clients/${id}`),
  createClient: (data) => request('POST', '/clients', { data }),
  updateClient: (id, data) => request('PATCH', `/clients/${id}`, { data }),
  deleteClient: (id) => request('DELETE', `/clients/${id}`),


  // Memberships 
  getClientMemberships: (params) => request('GET', '/memberships', { params }),
  createClientMembership: (data) => request('POST', '/memberships', { data }),
  deleteClientMembership: (id) => request('DELETE', `/memberships/${id}`),


  // Quotes
  getQuotes: (params) => request('GET', '/quotes', { params }),
  getQuote: (id) => request('GET', `/quotes/${id}`),
  createQuote: (data) => request('POST', '/quotes', { data }),
  updateQuote: (id, data) => request('PATCH', `/quotes/${id}`, { data }),
  deleteQuote: (id) => request('DELETE', `/quotes/${id}`),

  // Orders
  getOrders: (params) => request('GET', '/orders', { params }),
  updateOrder: (id, data) => request('PATCH', `/orders/${id}`, { data }),
  getAllSubOrders: () => request('GET', '/orders/sub-orders'),
  getSubOrders: (params) => request('GET', `/orders/sub-orders`, { params }),
  createOrder: (data) => request('POST', '/orders', { data }),
  createSubOrder: (id, data) => request('POST', `/orders/${id}/sub-orders`, { data }),
  updateSubOrder: (id, data) => request('PATCH', `/orders/sub-orders/${id}`, { data }),

  // Invoices
  getInvoices: (params) => request('GET', '/invoices', { params }),
  getInvoice: (id) => request('GET', `/invoices/${id}`),
  createInvoice: (data) => request('POST', '/invoices', { data }),
  updateInvoice: (id, data) => request('PATCH', `/invoices/${id}`, { data }),
  // recordPayment: (id, data) => request('POST', `/invoices/${id}/payment`, { data }),
  deleteInvoice: (id) => request('DELETE', `/invoices/${id}`),

  //payments createPaymentSession
  createPaymentSession: (data) => request('POST', '/payments/ipospays/createPaymentSession', { data }),
  recordPayment: (data) => request('POST', '/payments/recordPayment', { data }),
  getPayments: (params) => request('GET', '/payments', { params }),
  // Parts
  getParts: (params) => request('GET', '/parts', { params }),
  createParts: (data) => request('POST', '/parts', { data }),
  updatePart: (id, data) => request('PATCH', `/parts/${id}`, { data }),
  deletePart: (id) => request('DELETE', `/parts/${id}`),
  getPartOrders: (params) => request('GET', '/parts/orders', { params }),
  createPartOrder: (data) => request('POST', '/parts/orders', { data }),
  // Batch parts import
  importParts: async (file) => {
    const form = new FormData();
    form.append('file', file);
    // for (let key of form.entries()) {
    //   console.log('FormData entry:', key[0], key[1]);
    // }
    return request('POST', '/parts/imports', {  data: form }, true);
  },
  // Import status
  getPartImport: (id) => request('GET', `/parts/imports/${id}`),

  // Maintenance
  getMaintenance: (params) => request('GET', '/maintenance', { params }),
  createMaintenance: (data) => request('POST', '/maintenance', { data }),
  updateMaintenance: (id, data) => request('PATCH', `/maintenance/${id}`, { data }),

  // Training
  getTrainings: (params) => request('GET', '/training', { params }),
  createTraining: (data) => request('POST', '/training', { data }),
  updateTraining: (id, data) => request('PATCH', `/training/${id}`, { data }),
  deleteTraining: (id) => request('DELETE', `/training/${id}`),
  getTrainingRequests: (params) => request('GET', '/training/requests', { params }),
  createTrainingRequests: (data) => request('POST', '/training/requests', { data }),
  updateTrainingRequest: (id, data) => request('PATCH', `/training/requests/${id}`, { data }),
  register: (data) => request('POST', '/training/register', { data }),
  getRegistrations: (params) => request('GET', '/training/registrations', { params }),
  createRegistrations: (data) => request('POST', '/training/registrations', { data }),
  updateRegistrations: (id, data) => request('PATCH', `/training/registrations/${id}`, { data }),

  // Courses
  getCourses: (params) => request('GET', '/courses', { params }),
  createCourse: (data) => request('POST', '/courses', { data }),
  updateCourse: (id, data) => request('PATCH', `/courses/${id}`, { data }),
  deleteCourse: (id) => request('DELETE', `/courses/${id}`),
  getAllCourseProgress: (params) => request('GET', `/courses/progress`, { params }),
  getCourseProgress: (id, params) => request('GET', `/courses/${id}/progress`, { params }),
  createCourseProgress: (id, data) => request('POST', `/courses/${id}/progress`, { data }),
  updateProgress: (cid, id, data) => request('PATCH', `/courses/${cid}/progress/${id}`, { data }),

  // Documents
  getDs: (params) => request('GET', '/documents', { params }), // List and filter documents
  getD: (id) => request('GET', `/documents/${id}`), // Get single document metadata
  createD: (data) => request('POST', '/documents', { data }), // Create document entry in DB
  updateD: (id, data) => request('PATCH', `/documents/${id}`, { data }), // Update document metadata
  deleteD: (id) => request('DELETE', `/documents/${id}`), // Soft-delete document
  downloadD: (id) => request('GET', `/documents/${id}/download`), // Get signed URL for document download
  // Warranty
  getWarrantyClaims: (params) => request('GET', '/warranty', { params }),
  createWarrantyClaim: (data) => request('POST', '/warranty', { data }),
  updateWarrantyClaim: (id, data) => request('PATCH', `/warranty/${id}`, { data }),

  // Notifications
  getNotifications: (params) => request('GET', '/notifications', { params }),
  createNotifications: (data) => request('POST', '/notifications', { data }), // Send to specific user
  createClientNotifications: (data) => request('POST', '/notifications/client', { data }), // Send to all users in a client
  markRead: (id) => request('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request('POST', '/notifications/mark-all-read'),
  deleteNotif: (id) => request('DELETE', `/notifications/${id}`),
  clearReadNotifs: () => request('DELETE', '/notifications/clear-read'),


  // File upload
  uploadFile: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('POST', '/upload', { form }, true);
  },
  getPresignedUploadUrl: (data) => request('POST', '/upload', { data }),
  uploadFileToS3: async (data) => {
    const res = await fetch(data.file_url, {
      method: 'PUT',
      headers: {
        'Content-Type': data.file.type
      },
      body: data.file
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => null);
      const errorMessage = errorBody || res.statusText;
      throw new Error(`Cloud storage upload failed (${res.status}): ${errorMessage}`);
    }
    console.log('File successfully uploaded to cloud storage.');
    return { success: true, status: res.status };
  },
  getS3FileUrl: (data) => request('POST', '/upload/view-private', { data }),

  clearLoggedInUser: () => {
    localStorage.removeItem('activeClientId')
  },
};
