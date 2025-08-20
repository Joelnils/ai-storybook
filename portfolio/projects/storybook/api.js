// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// API Helper Class
class APIClient {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    // Get authentication headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.auth !== false),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            auth: false
        });
        
        if (response.success && response.data.token) {
            this.setToken(response.data.token);
        }
        
        return response;
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
            auth: false
        });
        
        if (response.success && response.data.token) {
            this.setToken(response.data.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // Story methods
    async generateStory(storyRequest) {
        return await this.request('/stories/generate', {
            method: 'POST',
            body: JSON.stringify(storyRequest)
        });
    }

    async getMyStories(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/stories?${queryString}` : '/stories';
        return await this.request(endpoint);
    }

    async getStory(storyId) {
        return await this.request(`/stories/${storyId}`);
    }

    async toggleFavorite(storyId) {
        return await this.request(`/stories/${storyId}/favorite`, {
            method: 'PUT'
        });
    }

    async deleteStory(storyId) {
        return await this.request(`/stories/${storyId}`, {
            method: 'DELETE'
        });
    }

    async generatePDF(storyId) {
        return await this.request(`/stories/${storyId}/pdf`, {
            method: 'POST'
        });
    }

    async generateEPUB(storyId) {
        return await this.request(`/stories/${storyId}/epub`, {
            method: 'POST'
        });
    }

    async generatePreview(storyId) {
        return await this.request(`/stories/${storyId}/preview`, {
            method: 'POST'
        });
    }

    // Premade stories methods
    async getPremadeStories(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/stories/premade?${queryString}` : '/stories/premade';
        return await this.request(endpoint, { auth: false });
    }

    // Payment methods
    async createPaymentIntent(premadeStoryId) {
        return await this.request('/payments/create-payment-intent', {
            method: 'POST',
            body: JSON.stringify({ premadeStoryId })
        });
    }

    // NEW: Custom story payment intent creation
    async createCustomStoryPaymentIntent(storyData) {
        return await this.request('/payments/create-custom-story-payment-intent', {
            method: 'POST',
            body: JSON.stringify({ storyData })
        });
    }

    // NEW: Generate story after payment confirmation  
    async generateStoryFromPayment(paymentIntentId) {
        return await this.request('/stories/generate-from-payment', {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId })
        });
    }

    async confirmPayment(paymentIntentId) {
        return await this.request('/payments/confirm-payment', {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId })
        });
    }

    async getPurchases() {
        return await this.request('/payments/purchases');
    }

    async getStripeConfig() {
        return await this.request('/payments/config', { auth: false });
    }

    // User methods
    async getUserStats() {
        return await this.request('/users/stats');
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    // Handle authentication errors globally
    async handleAuthError(error) {
        if (error.message.includes('401') || error.message.includes('token')) {
            this.setToken(null);
            // For testing, we'll auto-login
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('🔧 Test mode: Auto-logging in...');
                try {
                    await this.login({ email: 'test@example.com', password: 'test123' });
                    return true;
                } catch (loginError) {
                    console.warn('Auto-login failed:', loginError);
                }
            }
            this.showAuthModal();
            return true;
        }
        return false;
    }

    showAuthModal() {
        // Implementation for showing authentication modal
        console.log('User needs to authenticate');
        if (window.authManager) {
            window.authManager.showAuthModal();
        }
    }
}

// Create global API client instance
const api = new APIClient();

// Export for use in other files
window.api = api;