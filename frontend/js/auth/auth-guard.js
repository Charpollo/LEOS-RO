/**
 * Auth Guard for RED ORBIT
 * Protects the main application
 * 
 * FLIGHT RULES:
 * - Check auth before app loads
 * - Show trial status in UI
 * - Non-blocking for development
 */

// Toggle between auth systems
const USE_PASSPHRASE_AUTH = true; // Set to false to use Netlify Identity

import { authManager } from './auth-manager.js';
import { passphraseAuth } from './passphrase-auth.js';
import { BETA_CONFIG, getBetaPeriodInfo, getBetaMessage } from './beta-config.js';

export class AuthGuard {
    constructor() {
        this.isDevelopment = window.location.hostname === 'localhost';
        this.bypassAuth = this.isDevelopment && !this.forceAuth();
    }
    
    /**
     * Check if auth should be enforced in dev
     */
    forceAuth() {
        return localStorage.getItem('forceAuth') === 'true';
    }
    
    /**
     * Initialize auth protection
     */
    async init() {
        // Skip auth in development unless forced
        if (this.bypassAuth) {
            console.log('[Auth] Bypassed in development');
            this.showDevBanner();
            return true;
        }
        
        // Wait for auth to initialize
        await this.waitForAuth();
        
        // Check authentication based on system
        if (USE_PASSPHRASE_AUTH) {
            // Use simple passphrase auth
            if (!passphraseAuth.isAuthenticated()) {
                window.location.href = '/login-simple.html';
                return false;
            }
            // No trial check for passphrase auth - it handles its own expiry
        } else {
            // Use Netlify Identity
            if (!authManager.isAuthenticated()) {
                window.location.href = '/login.html';
                return false;
            }
            
            // Check trial status
            if (!authManager.isTrialActive()) {
                this.handleExpiredTrial();
                return false;
            }
        }
        
        // Show trial status
        this.showTrialStatus();
        
        return true;
    }
    
    /**
     * Wait for auth system to initialize
     */
    waitForAuth() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (authManager.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }
    
    /**
     * Show development mode banner
     */
    showDevBanner() {
        const banner = document.createElement('div');
        banner.id = 'dev-auth-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(255, 100, 0, 0.2);
            color: #ff6600;
            padding: 8px 15px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 9999;
            border: 1px solid rgba(255, 100, 0, 0.3);
        `;
        banner.innerHTML = 'DEV MODE - Auth Bypassed';
        document.body.appendChild(banner);
    }
    
    /**
     * Show trial status in UI
     */
    showTrialStatus() {
        const userInfo = authManager.getUserInfo();
        if (!userInfo) return;
        
        const statusBar = document.createElement('div');
        statusBar.id = 'trial-status-bar';
        statusBar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 12px;
            z-index: 9999;
            border: 1px solid rgba(255, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        const daysRemaining = userInfo.trialDaysRemaining;
        const daysColor = daysRemaining > 7 ? '#00ff00' : 
                         daysRemaining > 3 ? '#ffff00' : '#ff0000';
        
        // Get beta period info for appropriate messaging
        const betaInfo = getBetaPeriodInfo();
        const betaMessage = getBetaMessage(daysRemaining);
        
        // Different display based on beta mode
        const betaLabel = BETA_CONFIG.mode === 'FIXED_PERIOD' ? 'BETA PERIOD' : 'TRIAL ACCESS';
        
        statusBar.innerHTML = `
            <span style="color: #888;">${betaLabel}</span>
            <span style="color: ${daysColor}; font-weight: bold;" title="${betaMessage}">
                ${daysRemaining} days remaining
            </span>
            <span style="color: #666;">|</span>
            <span style="color: #aaa;">${userInfo.email}</span>
            <button id="logout-btn" style="
                background: transparent;
                border: 1px solid rgba(255, 0, 0, 0.3);
                color: #ff0000;
                padding: 4px 12px;
                border-radius: 15px;
                cursor: pointer;
                font-size: 11px;
                margin-left: 10px;
            ">Logout</button>
        `;
        
        document.body.appendChild(statusBar);
        
        // Add logout functionality
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            authManager.logout();
        });
    }
    
    /**
     * Handle expired trial
     */
    handleExpiredTrial() {
        authManager.showTrialExpired();
    }
    
    /**
     * Get current user info
     */
    getUserInfo() {
        return authManager.getUserInfo();
    }
}

// Export singleton
export const authGuard = new AuthGuard();