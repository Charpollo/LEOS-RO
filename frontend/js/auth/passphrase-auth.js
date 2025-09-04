/**
 * Simple Passphrase Authentication
 * For beta access control without complex auth systems
 */

// CHANGE THIS PASSPHRASE TO CONTROL ACCESS
// You can update this anytime and redeploy to change access
const VALID_PASSPHRASES = [
    'REDORBIT2025BETA',     // Main beta passphrase
    'SPACEFORCE2025',       // Special access
    'CYBERRTS2025',         // Internal team
    // Add more passphrases as needed
];

// Optional: Time-limited passphrases
const TIME_LIMITED_PASSPHRASES = [
    {
        phrase: 'DEMO2025',
        validUntil: new Date('2025-01-31T23:59:59Z')
    }
];

export class PassphraseAuth {
    constructor() {
        this.sessionKey = 'redorbit_auth_session';
        this.expiryKey = 'redorbit_auth_expiry';
    }
    
    /**
     * Check if passphrase is valid
     */
    isValidPassphrase(passphrase) {
        if (!passphrase) return false;
        
        const upperPhrase = passphrase.toUpperCase().trim();
        
        // Check standard passphrases
        if (VALID_PASSPHRASES.includes(upperPhrase)) {
            return true;
        }
        
        // Check time-limited passphrases
        for (const limited of TIME_LIMITED_PASSPHRASES) {
            if (limited.phrase === upperPhrase) {
                return new Date() < new Date(limited.validUntil);
            }
        }
        
        return false;
    }
    
    /**
     * Authenticate with passphrase
     */
    authenticate(passphrase) {
        if (this.isValidPassphrase(passphrase)) {
            // Create session
            const sessionData = {
                authenticated: true,
                timestamp: new Date().toISOString(),
                passphrase: btoa(passphrase), // Basic encoding
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            };
            
            localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            localStorage.setItem(this.expiryKey, sessionData.expires);
            
            return {
                success: true,
                message: 'Access granted!'
            };
        }
        
        return {
            success: false,
            message: 'Invalid passphrase. Contact mission@cyberrts.com for access.'
        };
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            const expiry = new Date(session.expires);
            
            // Check if session expired
            if (new Date() > expiry) {
                this.logout();
                return false;
            }
            
            return session.authenticated === true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Get session info
     */
    getSessionInfo() {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            const expiry = new Date(session.expires);
            const now = new Date();
            
            const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
            
            return {
                authenticated: true,
                daysRemaining: daysRemaining,
                expires: session.expires
            };
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Logout
     */
    logout() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.expiryKey);
    }
    
    /**
     * Check passphrase on every page load (security)
     * This prevents someone from just setting localStorage manually
     */
    validateSession() {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            // Could add additional validation here if needed
            return true;
        } catch (e) {
            this.logout();
            return false;
        }
    }
}

// Export singleton
export const passphraseAuth = new PassphraseAuth();