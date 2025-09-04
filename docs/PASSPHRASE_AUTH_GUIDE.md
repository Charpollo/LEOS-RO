# 🔐 Simple Passphrase Authentication

## How It Works
Instead of complex user accounts, emails, and invites, users just enter a passphrase to access RED ORBIT.

## Current Passphrases
Edit `/frontend/js/auth/passphrase-auth.js` to change:

```javascript
const VALID_PASSPHRASES = [
    'REDORBIT2025BETA',     // Main beta passphrase
    'SPACEFORCE2025',       // Special access
    'CYBERRTS2025',         // Internal team
];
```

## How to Use

### For You (Admin):
1. **Give passphrase to user:** "Use passphrase: REDORBIT2025BETA"
2. **Change passphrase anytime:** Edit the file, rebuild, deploy
3. **Revoke access:** Remove/change passphrase, redeploy

### For Users:
1. Go to redorbit.space
2. Enter passphrase
3. Click "ACCESS RED ORBIT"
4. They're in! (30-day session)

## Benefits Over Netlify Identity

✅ **No email verification** - Instant access
✅ **No modal popups** - Clean experience
✅ **No invite links** - Just share passphrase
✅ **Easy to revoke** - Change passphrase anytime
✅ **No user management** - No database needed
✅ **Works immediately** - No setup required

## Security

### What It Protects:
- ✅ Prevents public access
- ✅ Code is still minified/protected
- ✅ Easy to change access
- ✅ Sessions expire after 30 days

### What It Doesn't:
- ❌ Not as secure as real auth (but good enough for beta)
- ❌ Passphrase visible if someone inspects code (but minified)
- ❌ No individual user tracking (but simpler)

## Changing Passphrases

### To Add New Passphrase:
```javascript
const VALID_PASSPHRASES = [
    'REDORBIT2025BETA',
    'NEWPASSPHRASE2025',  // Add new one
];
```

### To Set Time Limit:
```javascript
const TIME_LIMITED_PASSPHRASES = [
    {
        phrase: 'DEMO2025',
        validUntil: new Date('2025-01-31')  // Expires Jan 31
    }
];
```

### To Revoke Access:
1. Remove or change all passphrases
2. Rebuild: `npm run build:prod`
3. Deploy
4. All users locked out immediately

## Quick Commands

### Test Locally:
```bash
npm run build
npm run dev
# Go to localhost:8000/login-simple.html
```

### Deploy:
```bash
git add .
git commit -m "Update passphrases"
git push
```

## Switching Back to Netlify Identity

If you want to go back to email-based auth:

1. Edit `/frontend/js/auth/auth-guard.js`
2. Change line 12:
   ```javascript
   const USE_PASSPHRASE_AUTH = false;  // Was true
   ```
3. Rebuild and deploy

## Current Settings

- **Session Length:** 30 days
- **Passphrases:** Case-insensitive 
- **Default Passphrase:** REDORBIT2025BETA
- **Redirect:** /login-simple.html

## Troubleshooting

### "Invalid passphrase"
- Check spelling
- Try: REDORBIT2025BETA
- Case doesn't matter

### Still seeing Netlify login
- Clear browser cache
- Check auth-guard.js has USE_PASSPHRASE_AUTH = true

### Users can't access after correct passphrase
- Check browser localStorage isn't disabled
- Try incognito/private mode

## The Bottom Line

This gives you COMPLETE CONTROL:
- Share passphrase with who you want
- Change it whenever you want  
- No complex setup
- Works immediately

Perfect for your beta!