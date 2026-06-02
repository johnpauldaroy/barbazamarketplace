// Ecommerce API utilities

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const parseJsonSafely = async (response) => {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (_) {
        return text;
    }
};

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
    const timeoutMs = options.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const token = localStorage.getItem('auth_token');
    const shouldSendJsonHeader = !(options.body instanceof FormData);
    const headers = {
        Accept: 'application/json',
        ...(shouldSendJsonHeader ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };
    const url = `${API_BASE_URL}${endpoint}`;
    let response;

    try {
        response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers
        });
    } catch (err) {
        clearTimeout(timeoutId);
        // Commonly: backend down, wrong URL/port, or CORS blocked
        const msg = err?.message || String(err);
        if (err?.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw new Error(`Network error: ${msg}`);
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
        // Clear stale token on 401 so the app doesn't stay in a broken auth state
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
        }

        const body = await parseJsonSafely(response);
        const message =
            body?.message ||
            body?.error ||
            (typeof body === 'string' ? body : null) ||
            `${response.status} ${response.statusText}`;

        throw new Error(message);
    }

    return parseJsonSafely(response);
};

const buildQueryString = (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        searchParams.set(key, String(value));
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
};

/**
 * Format a price in cents to a currency string
 * @param {number} priceInCents - Price in cents
 * @param {object} currencyInfo - Currency configuration
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (priceInCents, currencyInfo = {}) => {
    const {
        symbol = 'PHP ',
        decimal_places = 2,
        position = 'before'
    } = currencyInfo;

    const price = (priceInCents / 100).toFixed(decimal_places);

    if (position === 'after') {
        return `${price}${symbol}`;
    }
    return `${symbol}${price}`;
};

/**
 * Fetch products from the API
 * @returns {Promise<Array>} Array of products
 */
export const fetchProducts = async (params = {}) => {
    return apiRequest(`/products${buildQueryString(params)}`);
};

/**
 * Fetch a single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<object|null>} Product object or null
 */
export const fetchProductById = async (id) => {
    const data = await apiRequest(`/products/${id}`);
    return data?.product || null;
};

// Authentication APIs
export const loginUser = async (credentials) => {
    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        const token = data.token || data.access_token;
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        const data = await apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        const token = data.token || data.access_token;
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await apiRequest('/logout', { method: 'POST' });
        localStorage.removeItem('auth_token');
    } catch (error) {
        console.error('Logout error:', error);
        // Still remove token on error
        localStorage.removeItem('auth_token');
    }
};

export const getCurrentUser = async () => {
    try {
        return await apiRequest('/user');
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
};

export const updateUserPassword = async (payload) => {
    try {
        return await apiRequest('/user/password', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Update user password error:', error);
        throw error;
    }
};

// Order APIs
export const createOrder = async (orderData) => {
    try {
        return await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    } catch (error) {
        console.error('Create order error:', error);
        throw error;
    }
};

export const getUserOrders = async () => {
    const data = await apiRequest('/orders');
    return data?.orders || [];
};

export const updateOrderStatus = async (id, status) => {
    try {
        return await apiRequest(`/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    } catch (error) {
        console.error('Update order status error:', error);
        throw error;
    }
};

export const getAdminDashboard = async (params = {}) => {
    const qs = buildQueryString(params);
    return apiRequest(`/admin/dashboard${qs}`);
};

export const fetchAdminReports = async (params = {}) => {
    const qs = buildQueryString(params);
    return apiRequest(`/admin/reports${qs}`);
};

export const fetchMerchantOrders = async (params = {}) => {
    return apiRequest(`/merchant/orders${buildQueryString(params)}`);
};

export const updateMerchantOrderStatus = async (id, status) => {
    try {
        return await apiRequest(`/merchant/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    } catch (error) {
        console.error('Update merchant order status error:', error);
        throw error;
    }
};

// Admin user management
export const fetchAdminUsers = async (params = {}) => {
    return apiRequest(`/admin/users${buildQueryString(params)}`);
};

export const createAdminUser = async (userData) => {
    try {
        return await apiRequest('/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    } catch (error) {
        console.error('Create admin user error:', error);
        throw error;
    }
};

export const updateAdminUser = async (id, userData) => {
    try {
        return await apiRequest(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    } catch (error) {
        console.error('Update admin user error:', error);
        throw error;
    }
};

export const deleteAdminUser = async (id) => {
    try {
        return await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Delete admin user error:', error);
        throw error;
    }
};

// Product management (admin)
export const createProduct = async (productData) => {
    try {
        const formData = new FormData();
        Object.keys(productData).forEach(key => {
            if (key === 'image' && productData[key] instanceof File) {
                formData.append('image', productData[key]);
            } else if (productData[key] !== null && productData[key] !== undefined) {
                formData.append(key, productData[key]);
            } else {
                // Skip nullish values so optional fields are not sent as "undefined".
            }
        });
        return await apiRequest('/products', {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error('Create product error:', error);
        throw error;
    }
};

export const updateProduct = async (id, productData) => {
    try {
        const formData = new FormData();
        Object.keys(productData).forEach(key => {
            if (key === 'image' && productData[key] instanceof File) {
                formData.append('image', productData[key]);
            } else if (productData[key] !== null && productData[key] !== undefined) {
                formData.append(key, productData[key]);
            }
        });
        formData.append('_method', 'PUT');
        return await apiRequest(`/products/${id}`, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error('Update product error:', error);
        throw error;
    }
};

export const bulkImportProducts = async (products) => {
    try {
        return await apiRequest('/products/bulk-import', {
            method: 'POST',
            body: JSON.stringify({ products }),
        });
    } catch (error) {
        console.error('Bulk import error:', error);
        throw error;
    }
};

export const deleteProduct = async (id) => {
    try {
        return await apiRequest(`/products/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Delete product error:', error);
        throw error;
    }
};

/**
 * Get product categories
 * @returns {Promise<Array>} Array of categories
 */
export const getCategories = async (params = {}) => {
    const data = await apiRequest(`/categories${buildQueryString(params)}`);
    return data?.categories || [];
};

export const createCategory = async (payload) => {
    try {
        return await apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Create category error:', error);
        throw error;
    }
};

export const updateCategory = async (name, payload) => {
    try {
        return await apiRequest(`/categories/${encodeURIComponent(name)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Update category error:', error);
        throw error;
    }
};

export const deleteCategory = async (name) => {
    try {
        return await apiRequest(`/categories/${encodeURIComponent(name)}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Delete category error:', error);
        throw error;
    }
};

// Admin store + merchant management
export const fetchAdminStores = async () => {
    return apiRequest('/admin/stores');
};

export const createAdminStore = async (payload) => {
    try {
        const formData = new FormData();
        Object.keys(payload || {}).forEach((key) => {
            const value = payload[key];
            if (value === null || value === undefined) return;
            if (value instanceof File) {
                formData.append(key, value);
                return;
            }
            formData.append(key, value);
        });

        return await apiRequest('/admin/stores', {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error('Create admin store error:', error);
        throw error;
    }
};

export const updateAdminStore = async (storeId, payload) => {
    try {
        const formData = new FormData();
        Object.keys(payload || {}).forEach((key) => {
            const value = payload[key];
            if (value === null || value === undefined) return;
            if (value instanceof File) {
                formData.append(key, value);
                return;
            }
            formData.append(key, value);
        });
        formData.append('_method', 'PUT');

        return await apiRequest(`/admin/stores/${storeId}`, {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error('Update admin store error:', error);
        throw error;
    }
};

export const deactivateAdminStore = async (storeId) => {
    try {
        return await apiRequest(`/admin/stores/${storeId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Deactivate admin store error:', error);
        throw error;
    }
};

export const activateAdminStore = async (storeId) => {
    try {
        return await apiRequest(`/admin/stores/${storeId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'active' }),
        });
    } catch (error) {
        console.error('Activate admin store error:', error);
        throw error;
    }
};

export const createStoreMerchant = async (storeId, payload) => {
    try {
        return await apiRequest(`/admin/stores/${storeId}/merchants`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Create store merchant error:', error);
        throw error;
    }
};

export const updateAdminMerchant = async (userId, payload) => {
    try {
        return await apiRequest(`/admin/merchants/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Update admin merchant error:', error);
        throw error;
    }
};

// Merchant portal APIs
export const fetchMerchantStore = async () => {
    return apiRequest('/merchant/store');
};

export const updateMerchantStore = async (payload) => {
    try {
        const formData = new FormData();
        Object.keys(payload || {}).forEach((key) => {
            const value = payload[key];
            if (value === null || value === undefined) return;
            if (value instanceof File) {
                formData.append(key, value);
                return;
            }
            formData.append(key, value);
        });
        formData.append('_method', 'PUT');

        return await apiRequest('/merchant/store', {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error('Update merchant store error:', error);
        throw error;
    }
};

export const fetchMerchantProducts = async (params = {}) => {
    return apiRequest(`/merchant/products${buildQueryString(params)}`);
};

export const createMerchantProduct = async (productData) => {
    try {
        const formData = new FormData();
        Object.keys(productData).forEach(key => {
            if (key === 'image' && productData[key] instanceof File) {
                formData.append('image', productData[key]);
            } else if (productData[key] !== null && productData[key] !== undefined) {
                formData.append(key, productData[key]);
            }
        });
        return await apiRequest('/merchant/products', {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error('Create merchant product error:', error);
        throw error;
    }
};

export const updateMerchantProduct = async (id, productData) => {
    try {
        const formData = new FormData();
        Object.keys(productData).forEach(key => {
            if (key === 'image' && productData[key] instanceof File) {
                formData.append('image', productData[key]);
            } else if (productData[key] !== null && productData[key] !== undefined) {
                formData.append(key, productData[key]);
            }
        });
        formData.append('_method', 'PUT');
        return await apiRequest(`/merchant/products/${id}`, {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error('Update merchant product error:', error);
        throw error;
    }
};

export const deleteMerchantProduct = async (id) => {
    try {
        return await apiRequest(`/merchant/products/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Delete merchant product error:', error);
        throw error;
    }
};

export const fetchMerchantCategories = async () => {
    const data = await apiRequest('/merchant/categories');
    return data?.categories || [];
};

export const createMerchantCategory = async (payload) => {
    try {
        return await apiRequest('/merchant/categories', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Create merchant category error:', error);
        throw error;
    }
};

// Public store browsing + inquiry APIs
export const fetchStores = async (params = {}) => {
    return apiRequest(`/stores${buildQueryString(params)}`);
};

export const fetchStoreBySlug = async (slug) => {
    const data = await apiRequest(`/stores/${slug}`);
    return data?.store || null;
};

export const submitStoreInquiry = async (slug, payload) => {
    try {
        return await apiRequest(`/stores/${slug}/inquiries`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Submit store inquiry error:', error);
        throw error;
    }
};

// Product review APIs
export const fetchProductReviews = async (productId, params = {}) => {
    return apiRequest(`/products/${productId}/reviews${buildQueryString(params)}`);
};

export const fetchMyProductReview = async (productId) => {
    return apiRequest(`/products/${productId}/reviews/me`);
};

export const upsertProductReview = async (productId, payload) => {
    try {
        return await apiRequest(`/products/${productId}/reviews`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Upsert product review error:', error);
        throw error;
    }
};

export const deleteMyProductReview = async (productId) => {
    try {
        return await apiRequest(`/products/${productId}/reviews/me`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Delete product review error:', error);
        throw error;
    }
};

export const reportProductReview = async (reviewId, payload) => {
    try {
        return await apiRequest(`/reviews/${reviewId}/report`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Report product review error:', error);
        throw error;
    }
};

// Order feedback (token-gated) APIs
export const fetchOrderFeedbackLink = async (token) => {
    return apiRequest(`/feedback-links/${encodeURIComponent(token)}`);
};

export const submitOrderFeedback = async (token, payload) => {
    try {
        return await apiRequest(`/feedback-links/${encodeURIComponent(token)}/submit`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Submit order feedback error:', error);
        throw error;
    }
};

// Admin review moderation APIs
export const fetchAdminReviews = async (params = {}) => {
    return apiRequest(`/admin/reviews${buildQueryString(params)}`);
};

export const updateAdminReviewVisibility = async (reviewId, payload) => {
    try {
        return await apiRequest(`/admin/reviews/${reviewId}/visibility`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Update admin review visibility error:', error);
        throw error;
    }
};

export const updateAdminReviewReportStatus = async (reportId, status) => {
    try {
        return await apiRequest(`/admin/review-reports/${reportId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    } catch (error) {
        console.error('Update admin review report status error:', error);
        throw error;
    }
};

// Merchant inquiry inbox APIs
export const fetchMerchantInquiries = async (params = {}) => {
    return apiRequest(`/merchant/inquiries${buildQueryString(params)}`);
};

export const updateMerchantInquiryStatus = async (id, status) => {
    try {
        return await apiRequest(`/merchant/inquiries/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    } catch (error) {
        console.error('Update merchant inquiry status error:', error);
        throw error;
    }
};
