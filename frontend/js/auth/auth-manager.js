/**
 * RED ORBIT Authentication Manager
 * 
 * FLIGHT RULES:
 * - Modular: No dependencies on main app
 * - Secure: All auth checks server-side via Netlify
 * - Scalable: Can add SSO, 2FA later
 * - Clean: Single responsibility - auth only
 */

import { BETA_CONFIG, getTrialEndDate, getBetaMessage } from './beta-config.js';

export class AuthManager {
    constructor() {
        this.user = null;
        this.trialStart = null;
        this.trialEnd = null;
        this.isInitialized = false;
        
        // Check for Netlify Identity
        if (typeof netlifyIdentity === 'undefined') {
            console.error('Netlify Identity not loaded');
            return;
        }
        
        this.init();
    }
    
    /**
     * Initialize authentication system
     */
    init() {
        netlifyIdentity.init();
        
        // Set up event listeners
        netlifyIdentity.on('login', user => this.handleLogin(user));
        netlifyIdentity.on('logout', () => this.handleLogout());
        netlifyIdentity.on('error', err => this.handleError(err));
        
        // Check current user
        this.user = netlifyIdentity.currentUser();
        this.isInitialized = true;
        
        if (this.user) {
            this.loadTrialInfo();
        }
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.user !== null;
    }
    
    /**
     * Check if trial is still active
     */
    isTrialActive() {
        if (!this.trialEnd) return false;
        return new Date() < new Date(this.trialEnd);
    }
    
    /**
     * Get days remaining in trial
     */
    getTrialDaysRemaining() {
        if (!this.trialEnd) return 0;
        const msPerDay = 24 * 60 * 60 * 1000;
        const remaining = new Date(this.trialEnd) - new Date();
        return Math.max(0, Math.ceil(remaining / msPerDay));
    }
    
    /**
     * Handle successful login
     */
    handleLogin(user) {
        this.user = user;
        
        // Store trial info
        const metadata = user.user_metadata || {};
        this.trialStart = metadata.trial_start || new Date().toISOString();
        this.trialEnd = metadata.trial_end || this.calculateTrialEnd();
        
        // Store locally for quick access
        this.saveToLocalStorage();
        
        // Track login for analytics
        this.trackEvent('login', {
            email: user.email,
            organization: metadata.organization
        });
        
        // Redirect to main app
        if (window.location.pathname === '/login.html') {
            window.location.href = '/';
        }
    }
    
    /**
     * Handle logout
     */
    handleLogout() {
        this.user = null;
        this.trialStart = null;
        this.trialEnd = null;
        
        // Clear local storage
        this.clearLocalStorage();
        
        // Redirect to login
        window.location.href = '/login.html';
    }
    
    /**
     * Handle auth errors
     */
    handleError(error) {
        console.error('Auth error:', error);
        
        // Log error for monitoring
        this.trackEvent('auth_error', {
            error: error.message
        });
    }
    
    /**
     * Calculate trial end date using beta config
     */
    calculateTrialEnd() {
        return getTrialEndDate(new Date());
    }
    
    /**
     * Load trial info from user metadata or localStorage
     */
    loadTrialInfo() {
        if (this.user && this.user.user_metadata) {
            const metadata = this.user.user_metadata;
            this.trialStart = metadata.trial_start || localStorage.getItem('redOrbitTrialStart');
            this.trialEnd = metadata.trial_end || localStorage.getItem('redOrbitTrialEnd');
        }
        
        // Fallback to localStorage
        if (!this.trialStart) {
            this.trialStart = localStorage.getItem('redOrbitTrialStart');
        }
        if (!this.trialEnd) {
            this.trialEnd = localStorage.getItem('redOrbitTrialEnd');
        }
    }
    
    /**
     * Save auth state to localStorage for persistence
     */
    saveToLocalStorage() {
        if (this.user) {
            localStorage.setItem('redOrbitUser', JSON.stringify({
                email: this.user.email,
                id: this.user.id
            }));
            localStorage.setItem('redOrbitTrialStart', this.trialStart);
            localStorage.setItem('redOrbitTrialEnd', this.trialEnd);
        }
    }
    
    /**
     * Clear localStorage
     */
    clearLocalStorage() {
        localStorage.removeItem('redOrbitUser');
        localStorage.removeItem('redOrbitTrialStart');
        localStorage.removeItem('redOrbitTrialEnd');
    }
    
    /**
     * Track events for analytics (can connect to your analytics service)
     */
    trackEvent(eventName, data = {}) {
        // For now, just console log
        // Later: Send to Mixpanel, Segment, etc.
        console.log(`[Analytics] ${eventName}:`, data);
        
        // Could also send to your backend
        if (window.location.hostname !== 'localhost') {
            // fetch('/api/track', {
            //     method: 'POST',
            //     body: JSON.stringify({ event: eventName, ...data })
            // });
        }
    }
    
    /**
     * Show login modal (if not on login page)
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        
        if (!this.isTrialActive()) {
            this.showTrialExpired();
            return false;
        }
        
        return true;
    }
    
    /**
     * Show trial expired message
     */
    showTrialExpired() {
        const message = document.createElement('div');
        message.className = 'trial-expired-modal';
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #ff0000;
                padding: 40px;
                border-radius: 10px;
                text-align: center;
                z-index: 10000;
            ">
                <h2 style="color: #ff0000; margin-bottom: 20px;">Trial Expired</h2>
                <p style="color: #fff; margin-bottom: 30px;">
                    Your 14-day trial of RED ORBIT has ended.
                </p>
                <p style="color: #888; margin-bottom: 30px;">
                    Contact sales@cyberrts.com for full access.
                </p>
                <button onclick="window.location.href='mailto:sales@cyberrts.com'" style="
                    background: #ff0000;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">Contact Sales</button>
            </div>
        `;
        document.body.appendChild(message);
    }
    
    /**
     * Get user info for display
     */
    getUserInfo() {
        if (!this.user) return null;
        
        return {
            email: this.user.email,
            organization: this.user.user_metadata?.organization || 'Unknown',
            trialDaysRemaining: this.getTrialDaysRemaining(),
            isTrialActive: this.isTrialActive()
        };
    }
    
    /**
     * Logout user
     */
    logout() {
        netlifyIdentity.logout();
    }
}

// Export singleton instance
export const authManager = new AuthManager();