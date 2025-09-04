/**
 * Beta Trial Configuration
 * Centralized config for beta period management
 * 
 * FLIGHT RULES:
 * - Single source of truth for trial dates
 * - Easy to update without code changes
 * - Clear communication to users
 */

export const BETA_CONFIG = {
    // Beta trial mode - choose one:
    // 'FIXED_PERIOD' - Everyone gets same end date
    // 'INDIVIDUAL_TRIAL' - Each user gets X days from signup
    // 'UNLIMITED' - No expiration (for development/special users)
    mode: 'UNLIMITED',
    
    // For FIXED_PERIOD mode
    fixedPeriod: {
        startDate: '2024-12-15T00:00:00Z',  // Beta starts
        endDate: '2025-01-15T23:59:59Z',    // Beta ends for everyone
        registrationCutoff: '2025-01-08T23:59:59Z' // Last day to sign up
    },
    
    // For INDIVIDUAL_TRIAL mode
    individualTrial: {
        durationDays: 14,  // Each user gets this many days
        maxSignupDate: null // Optional: close signups after this date
    },
    
    // Marketing messages
    messages: {
        fixedPeriod: {
            prelaunch: 'Beta starts December 15th! Sign up now for early access.',
            active: 'Beta access ends January 15th for all users.',
            lastWeek: 'Only {days} days left in beta! Contact sales for full access.',
            expired: 'Beta period has ended. Thank you for participating!'
        },
        individualTrial: {
            welcome: 'Your 14-day trial starts now!',
            halfway: 'You have {days} days remaining in your trial.',
            lastDays: 'Only {days} days left! Upgrade now to keep access.',
            expired: 'Your trial has expired. Contact sales to continue.'
        }
    },
    
    // Special access list (emails that get unlimited access)
    unlimitedAccess: [
        'demo@cyberrts.com',
        'admin@cyberrts.com',
        // Add Space Force/investor emails here
    ],
    
    // Feature flags for beta
    features: {
        maxObjects: 15000,  // Full capability during beta
        allowExport: false, // Maybe disable some features
        allowSharing: false,
        showWatermark: true // "BETA" watermark
    }
};

/**
 * Calculate trial end date based on config
 */
export function getTrialEndDate(signupDate = new Date()) {
    const email = netlifyIdentity.currentUser()?.email;
    
    // Check unlimited access list
    if (BETA_CONFIG.unlimitedAccess.includes(email)) {
        return new Date('2099-12-31').toISOString(); // Far future
    }
    
    switch (BETA_CONFIG.mode) {
        case 'FIXED_PERIOD':
            // Everyone gets the same end date
            return BETA_CONFIG.fixedPeriod.endDate;
            
        case 'INDIVIDUAL_TRIAL':
            // Each user gets X days from signup
            const endDate = new Date(signupDate);
            endDate.setDate(endDate.getDate() + BETA_CONFIG.individualTrial.durationDays);
            return endDate.toISOString();
            
        case 'UNLIMITED':
            // No expiration
            return new Date('2099-12-31').toISOString();
            
        default:
            // Default to 14-day individual trial
            const defaultEnd = new Date(signupDate);
            defaultEnd.setDate(defaultEnd.getDate() + 14);
            return defaultEnd.toISOString();
    }
}

/**
 * Check if registration is still open
 */
export function isRegistrationOpen() {
    if (BETA_CONFIG.mode === 'FIXED_PERIOD') {
        const cutoff = new Date(BETA_CONFIG.fixedPeriod.registrationCutoff);
        return new Date() < cutoff;
    }
    
    if (BETA_CONFIG.individualTrial.maxSignupDate) {
        return new Date() < new Date(BETA_CONFIG.individualTrial.maxSignupDate);
    }
    
    return true; // Registration open by default
}

/**
 * Get appropriate message for current beta state
 */
export function getBetaMessage(daysRemaining) {
    const messages = BETA_CONFIG.messages[
        BETA_CONFIG.mode === 'FIXED_PERIOD' ? 'fixedPeriod' : 'individualTrial'
    ];
    
    if (daysRemaining <= 0) {
        return messages.expired;
    } else if (daysRemaining <= 3) {
        return messages.lastDays?.replace('{days}', daysRemaining) || 
               messages.lastWeek?.replace('{days}', daysRemaining);
    } else if (daysRemaining <= 7) {
        return messages.lastWeek?.replace('{days}', daysRemaining) ||
               messages.halfway?.replace('{days}', daysRemaining);
    } else {
        return messages.active || messages.welcome;
    }
}

/**
 * Get beta period info for display
 */
export function getBetaPeriodInfo() {
    if (BETA_CONFIG.mode === 'FIXED_PERIOD') {
        const start = new Date(BETA_CONFIG.fixedPeriod.startDate);
        const end = new Date(BETA_CONFIG.fixedPeriod.endDate);
        const now = new Date();
        
        if (now < start) {
            return {
                status: 'prelaunch',
                message: BETA_CONFIG.messages.fixedPeriod.prelaunch,
                daysUntilStart: Math.ceil((start - now) / (1000 * 60 * 60 * 24))
            };
        } else if (now > end) {
            return {
                status: 'expired',
                message: BETA_CONFIG.messages.fixedPeriod.expired,
                daysOverdue: Math.ceil((now - end) / (1000 * 60 * 60 * 24))
            };
        } else {
            const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
            return {
                status: 'active',
                message: getBetaMessage(daysRemaining),
                daysRemaining
            };
        }
    }
    
    return {
        status: 'individual',
        message: 'Individual trial period'
    };
}