// GOOGLE MAPS API SETUP INSTRUCTIONS
//
// To enable Google Maps address autocomplete in the checkout page:
//
// 1. Get a Google Maps API Key:
//    - Go to https://console.cloud.google.com/
//    - Create a new project or select existing one
//    - Enable the following APIs:
//      * Maps JavaScript API
//      * Places API
//    - Create credentials (API Key)
//    - Optionally restrict the API key to your domain for security
//
// 2. Replace the placeholder in index.html:
//    Change: YOUR_GOOGLE_MAPS_API_KEY
//    To: Your actual Google Maps API key
//
// 3. The autocomplete will work for:
//    - Billing address input
//    - Shipping address input
//    - Auto-fills city, state, and pincode when address is selected
//
// Note: Google Maps API has usage limits and costs for heavy usage.
// Make sure to monitor your API usage in the Google Cloud Console.