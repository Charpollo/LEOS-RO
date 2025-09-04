/**
 * Direct Netlify Authentication without Modal
 * Uses GoTrue JS client for programmatic signup/login
 */

class GoTrueAuth {
    constructor() {
        // Initialize GoTrue client pointing to your Netlify Identity instance
        this.auth = new GoTrue({
            APIUrl: 'https://redorbit.space/.netlify/identity',
            audience: '',
            setCookie: true
        });
    }
    
    /**
     * Sign up a new user programmatically
     */
    async signup(email, password, metadata = {}) {
        try {
            const response = await this.auth.signup(email, password, {
                data: metadata // This becomes user_metadata
            });
            
            return {
                success: true,
                user: response,
                message: 'Signup successful! Check your email to confirm.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Signup failed'
            };
        }
    }
    
    /**
     * Log in a user programmatically
     */
    async login(email, password) {
        try {
            const response = await this.auth.login(email, password, true);
            return {
                success: true,
                user: response,
                message: 'Login successful!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Invalid credentials'
            };
        }
    }
    
    /**
     * Get current user
     */
    currentUser() {
        return this.auth.currentUser();
    }
    
    /**
     * Log out
     */
    logout() {
        const user = this.currentUser();
        if (user) {
            user.logout();
        }
    }
}

// Export singleton
export const goTrueAuth = new GoTrueAuth();