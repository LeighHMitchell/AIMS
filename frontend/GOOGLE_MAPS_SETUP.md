# Google Maps Setup for Activity Locations Map

## Overview
The Activity Locations map now uses Google Maps for better pin visibility and reliability.

## Setup Required

### 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Geocoding API** (optional, for future features)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Secure Your API Key (Recommended)

1. Click on your API key to edit it
2. Under **Application restrictions**, select **HTTP referrers (websites)**
3. Add your domain(s):
   - For development: `http://localhost:3000/*`
   - For production: `https://yourdomain.com/*`
4. Under **API restrictions**, select **Restrict key**
5. Choose only the APIs you enabled above

### 3. Add API Key to Your Project

Add the following to your `.env.local` file (or `.env` file):

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Important:** The variable MUST start with `NEXT_PUBLIC_` to be accessible in the browser.

### 4. Restart Development Server

After adding the API key, restart your Next.js development server:

```bash
npm run dev
```

## Features

### Map displays:
- ✅ **Red map pins** for each activity location (highly visible!)
- ✅ **Colored regions** (choropleth) showing activity density by state/region
- ✅ **Multiple map types:**
  - Roadmap (default)
  - Satellite
  - Hybrid
  - Terrain
- ✅ **Click markers** to see location details
- ✅ **Click regions** to see activity counts
- ✅ **Myanmar-focused** view with bounds restriction

## Troubleshooting

### Map shows but says "For development purposes only"
- This means your API key is working but needs to have billing enabled
- Go to Google Cloud Console → Billing and set up a billing account
- Google Maps offers $200 free credit per month, which is usually sufficient

### Map doesn't show at all
1. Check browser console for errors
2. Verify API key is in `.env.local` or `.env`
3. Verify the key starts with `NEXT_PUBLIC_`
4. Restart the development server
5. Clear browser cache

### Pins don't show
1. Verify locations have valid latitude/longitude coordinates
2. Check the location count in the map header
3. Try zooming out - pins might be in a specific region

### "API key not found" error
1. Make sure `.env.local` exists in the `/frontend` directory
2. Variable must be: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`
3. Restart the server after adding/changing the key

## Cost Considerations

Google Maps is free for:
- First $200/month of usage (covers most projects)
- After that: ~$7 per 1,000 map loads

For typical usage, this map will stay within the free tier.

## Alternative: No API Key Mode

If you don't want to set up Google Maps, you can switch back to Leaflet (open-source maps) by:
1. Reverting to use `ActivityLocationsMapView` instead of `ActivityLocationsGoogleMap`
2. The Leaflet version works without any API keys but may have pin visibility issues

## Files Modified

- `/frontend/src/components/maps/ActivityLocationsGoogleMap.tsx` - New Google Maps component
- `/frontend/src/components/maps/ActivityLocationsHeatmap.tsx` - Updated to use Google Maps
- Added dependency: `@react-google-maps/api`

## Documentation

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [@react-google-maps/api Documentation](https://react-google-maps-api-docs.netlify.app/)






















