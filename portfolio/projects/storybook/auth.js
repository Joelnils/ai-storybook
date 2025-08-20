// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        if (api.isAuthenticated()) {
            try {
                const response = await api.getCurrentUser();
                if (response.success) {
                    this.currentUser = response.data;
                    this.updateUIForAuthenticatedUser();
                }
            } catch (error) {
                console.warn('Failed to get current user:', error);
                api.setToken(null);
            }
        }
        
        // Auto-login for testing (localhost only)
        if (!api.isAuthenticated() && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.log('🔧 Test mode: Auto-logging in test user...');
            try {
                const success = await this.login('test@example.com', 'test123');
                if (success) {
                    console.log('✅ Auto-login successful');
                    this.showNotification('Auto-inloggad för test! 🧪', 'info');
                }
            } catch (error) {
                console.warn('Auto-login failed:', error);
            }
        }
        
        this.updateAuthUI();
    }

    async login(email, password, rememberMe = false) {
        try {
            const response = await api.login({ email, password, rememberMe });
            if (response.success) {
                this.currentUser = response.data.user;
                this.updateUIForAuthenticatedUser();
                this.hideAuthModal();
                this.showNotification('Inloggning lyckades!', 'success');
                return true;
            }
        } catch (error) {
            this.showNotification(`Inloggning misslyckades: ${error.message}`, 'error');
            return false;
        }
    }

    async register(name, email, password) {
        try {
            const response = await api.register({ name, email, password });
            if (response.success) {
                this.currentUser = response.data.user;
                this.updateUIForAuthenticatedUser();
                this.hideAuthModal();
                this.showNotification('Konto skapat! Välkommen!', 'success');
                return true;
            }
        } catch (error) {
            this.showNotification(`Registrering misslyckades: ${error.message}`, 'error');
            return false;
        }
    }

    async logout() {
        try {
            await api.logout();
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
            this.showNotification('Du har loggats ut', 'info');
        } catch (error) {
            console.warn('Logout error:', error);
        }
    }

    updateUIForAuthenticatedUser() {
        const authButtons = document.querySelectorAll('.auth-required');
        authButtons.forEach(btn => {
            btn.style.display = 'inline-block';
        });

        const guestButtons = document.querySelectorAll('.guest-only');
        guestButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        // Update user display
        if (this.currentUser) {
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(el => {
                el.textContent = this.currentUser.name || this.currentUser.email;
            });
        }

        // Update generate button for authenticated state
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.innerHTML = '🪄 Skapa Min Personliga Saga (€7.99)';
            generateBtn.onclick = null; // Remove auth modal onclick
            generateBtn.type = 'submit'; // Restore submit functionality
            generateBtn.disabled = false;
        }
    }

    updateUIForLoggedOutUser() {
        const authButtons = document.querySelectorAll('.auth-required');
        authButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        const guestButtons = document.querySelectorAll('.guest-only');
        guestButtons.forEach(btn => {
            btn.style.display = 'inline-block';
        });

        // Update generate button for non-authenticated state
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.innerHTML = '🔐 Logga in för att skapa sagor (€7.99)';
            generateBtn.type = 'button'; // Prevent form submission
            generateBtn.disabled = false;
            generateBtn.onclick = (e) => {
                e.preventDefault();
                this.showAuthModal();
            };
        }
    }

    updateAuthUI() {
        if (api.isAuthenticated() && this.currentUser) {
            this.updateUIForAuthenticatedUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    }

    showAuthModal() {
        let modal = document.getElementById('authModal');
        if (!modal) {
            modal = this.createAuthModal();
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="authManager.hideAuthModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2 id="modalTitle">Logga in</h2>
                        <button class="close-btn" onclick="authManager.hideAuthModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="auth-tabs">
                            <button class="tab-btn active" onclick="authManager.showLoginTab()">Logga in</button>
                            <button class="tab-btn" onclick="authManager.showRegisterTab()">Skapa konto</button>
                        </div>
                        
                        <form id="loginForm" class="auth-form">
                            <div class="form-group">
                                <label for="loginEmail">E-post</label>
                                <input type="email" id="loginEmail" required>
                            </div>
                            <div class="form-group">
                                <label for="loginPassword">Lösenord</label>
                                <input type="password" id="loginPassword" required>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="rememberMe">
                                    Kom ihåg mig
                                </label>
                            </div>
                            <button type="submit" class="btn-primary">Logga in</button>
                        </form>
                        
                        <form id="registerForm" class="auth-form" style="display: none;">
                            <div class="form-group">
                                <label for="registerName">Namn</label>
                                <input type="text" id="registerName" required>
                            </div>
                            <div class="form-group">
                                <label for="registerEmail">E-post</label>
                                <input type="email" id="registerEmail" required>
                            </div>
                            <div class="form-group">
                                <label for="registerPassword">Lösenord (minst 8 tecken)</label>
                                <input type="password" id="registerPassword" required minlength="8">
                            </div>
                            <button type="submit" class="btn-primary">Skapa konto</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #authModal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            
            .modal-content {
                background: white;
                border-radius: 20px;
                width: 90%;
                max-width: 400px;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 2rem 2rem 1rem;
                border-bottom: 2px solid #fef3e2;
            }
            
            .modal-header h2 {
                font-family: 'Fredoka', cursive;
                color: #f59e0b;
                margin: 0;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 2rem;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-body {
                padding: 2rem;
            }
            
            .auth-tabs {
                display: flex;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .tab-btn {
                flex: 1;
                padding: 0.8rem;
                border: 2px solid #fbbf24;
                background: white;
                color: #f59e0b;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            
            .tab-btn.active {
                background: #fbbf24;
                color: white;
            }
            
            .auth-form .form-group {
                margin-bottom: 1.5rem;
            }
            
            .auth-form label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
                color: #374151;
            }
            
            .auth-form input {
                width: 100%;
                padding: 1rem;
                border: 2px solid #fef3e2;
                border-radius: 10px;
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            .auth-form input:focus {
                outline: none;
                border-color: #fbbf24;
            }
            
            .checkbox-label {
                display: flex !important;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
            }
            
            .checkbox-label input {
                width: auto !important;
                margin: 0;
            }
        `;
        document.head.appendChild(style);

        // Add event listeners
        modal.querySelector('#loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = modal.querySelector('#loginEmail').value;
            const password = modal.querySelector('#loginPassword').value;
            const rememberMe = modal.querySelector('#rememberMe').checked;
            await this.login(email, password, rememberMe);
        });

        modal.querySelector('#registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = modal.querySelector('#registerName').value;
            const email = modal.querySelector('#registerEmail').value;
            const password = modal.querySelector('#registerPassword').value;
            await this.register(name, email, password);
        });

        return modal;
    }

    showLoginTab() {
        const modal = document.getElementById('authModal');
        modal.querySelector('#modalTitle').textContent = 'Logga in';
        modal.querySelector('#loginForm').style.display = 'block';
        modal.querySelector('#registerForm').style.display = 'none';
        modal.querySelectorAll('.tab-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index === 0);
        });
    }

    showRegisterTab() {
        const modal = document.getElementById('authModal');
        modal.querySelector('#modalTitle').textContent = 'Skapa konto';
        modal.querySelector('#loginForm').style.display = 'none';
        modal.querySelector('#registerForm').style.display = 'block';
        modal.querySelectorAll('.tab-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index === 1);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10001;
                    max-width: 400px;
                    margin-bottom: 10px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    animation: slideInRight 0.3s ease;
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    gap: 0.8rem;
                }
                
                .notification-success {
                    background: #10b981;
                    color: white;
                }
                
                .notification-error {
                    background: #ef4444;
                    color: white;
                }
                
                .notification-info {
                    background: #3b82f6;
                    color: white;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    font-size: 1.2rem;
                    cursor: pointer;
                    margin-left: auto;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
}

// Create global auth manager
const authManager = new AuthManager();
window.authManager = authManager;