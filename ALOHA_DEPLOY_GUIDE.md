# ALOHA Subdomain Deployment Guide

## Setting up aloha.redorbit.space

### Option 1: Branch Deploy (Recommended)

1. **Push your aloha branch to GitHub**
   ```bash
   git checkout aloha
   git push origin aloha
   ```

2. **In Netlify Dashboard:**
   - Go to Site Settings → Domain Management → Branch subdomains
   - Click "Add branch subdomain"
   - Select branch: `aloha`
   - It will create: `aloha--redorbit.netlify.app`

3. **Add Custom Subdomain:**
   - Go to Domain settings
   - Add domain alias: `aloha.redorbit.space`
   - Point it to the branch deploy

### Option 2: Separate Site

1. **Create new Netlify site:**
   - New site from Git
   - Select same repo
   - Set production branch to: `aloha`
   - Deploy

2. **Add custom domain:**
   - Add `aloha.redorbit.space` to the new site
   - Netlify will handle DNS automatically

## DNS Configuration

If Option 1 doesn't work automatically, add this DNS record:

```
Type: CNAME
Name: aloha
Value: aloha--redorbit.netlify.app
```

## Environment Variables for ALOHA Build

In the aloha branch, we can check for subdomain:

```javascript
const isAlohaSubdomain = window.location.hostname === 'aloha.redorbit.space';
```

## Engineering Panel Customization

The engineering panel will automatically show only:
- ALOHA card
- Math Tools card  
- LEO Management card

When detected on the aloha subdomain.

## Deployment Commands

```bash
# Switch to aloha branch
git checkout aloha

# Make changes specific to ALOHA
# (panel customization already in place)

# Commit and push
git add .
git commit -m "Configure for ALOHA subdomain"
git push origin aloha
```

## Testing

1. Visit `aloha.redorbit.space` 
2. Verify only 3 cards show in engineering panel
3. Test passphrase authentication still works
4. Verify ALOHA trajectories load correctly