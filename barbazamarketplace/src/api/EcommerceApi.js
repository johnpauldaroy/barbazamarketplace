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
            throw new Error(`Request timed out calling ${url}`);
        }
        throw new Error(`Network error calling ${url}: ${msg}`);
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
        const body = await parseJsonSafely(response);
        const message =
            body?.message ||
            body?.error ||
            (typeof body === 'string' ? body : null) ||
            `${response.status} ${response.statusText}`;

        throw new Error(`API Error calling ${url}: ${message}`);
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

export const getAdminDashboard = async () => apiRequest('/admin/dashboard');

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
            } else {
                formData.append(key, productData[key]);
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
export const getCategories = async () => {
    const data = await apiRequest('/categories');
    return data?.categories || [];
};
