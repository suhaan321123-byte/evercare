# GOOGLE MAPS API KEY CONFIGURATION FIX

## Problem: "This page can't load Google Maps correctly"

This error occurs because your Google Maps API key has domain restrictions that don't include `localhost`.

## Solution: Update API Key Restrictions

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**

### Step 2: Find Your API Key
1. Click on your API key: `AIzaSyCGjrFjUcO91-21qsYsZzz023Adf44En-M`
2. Scroll down to **"API restrictions"** section

### Step 3: Update Application Restrictions
1. Change **"Application restrictions"** from **"None"** to **"HTTP referrers (web sites)"**
2. In the **"Website restrictions"** section, add these referrers:
   ```
   localhost:8080/*
   localhost:8081/*
   127.0.0.1:8080/*
   127.0.0.1:8081/*
   *.localhost:8080/*
   *.localhost:8081/*
   ```

### Step 4: Save Changes
1. Click **"Save"** at the bottom
2. Wait 5 minutes for changes to propagate
3. Refresh your website

### Step 5: Test
1. Go to: http://localhost:8080/checkout
2. Try the address autocomplete - it should work now!

## Alternative: Remove All Restrictions (Less Secure)
If you want to quickly test without restrictions:
1. Set **"Application restrictions"** to **"None"**
2. Click **"Save"**
3. **⚠️ Remember to add restrictions later for production security**

## Troubleshooting
- **Still not working?** Check browser console for detailed error messages
- **API not enabled?** Ensure Maps JavaScript API and Places API are enabled
- **Wrong key?** Double-check you're using the correct API key

## Security Note
For production, always restrict your API key to specific domains to prevent unauthorized usage and control costs.