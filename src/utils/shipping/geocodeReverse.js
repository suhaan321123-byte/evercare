// Reverse Geocoding: Convert lat/lng to address
export const getAddressFromCoordinates = async (lat, lng) => {
  // Try multiple APIs in sequence
  const apis = [
    {
      name: "nominatim",
      url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      parser: (data) => {
        if (!data.address) return null;
        const addr = data.address;
        return {
          addressLine1:
            `${addr.house_number ? addr.house_number + " " : ""}${addr.road || addr.pedestrian || ""}`.trim(),
          addressLine2: addr.neighbourhood || addr.suburb || "",
          city: addr.city || addr.town || addr.village || addr.county || "",
          state: addr.state || "",
          country: addr.country || "",
          postalCode: addr.postcode || "",
          fullAddress: data.display_name || "",
          houseNumber: addr.house_number || "",
          road: addr.road || "",
          suburb: addr.suburb || "",
        };
      },
    },
    {
      name: "bigdatacloud",
      url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      parser: (data) => {
        if (!data) return null;
        return {
          addressLine1: data.locality || "",
          addressLine2: data.city || "",
          city: data.city || data.locality || "",
          state: data.principalSubdivision || "",
          country: data.countryName || "",
          postalCode: data.postcode || "",
          fullAddress: data.locality || data.city || "",
        };
      },
    },
  ];

  // Try each API until we get a successful response
  for (const api of apis) {
    try {
      // Nominatim requires User-Agent header
      const headers =
        api.name === "nominatim"
          ? { "User-Agent": "YourAppName/1.0 (your-email@example.com)" }
          : {};

      const response = await fetch(api.url, { headers });
      const data = await response.json();

      const parsedAddress = api.parser(data);
      if (parsedAddress) {
        return {
          ...parsedAddress,
          source: api.name,
          latitude: lat,
          longitude: lng,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn(`API ${api.name} failed:`, error.message);
      // Continue to next API
    }
  }

  // If all APIs fail, return minimal address
  return {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    fullAddress: `Lat: ${lat}, Lng: ${lng}`,
    latitude: lat,
    longitude: lng,
    source: "fallback",
    timestamp: new Date().toISOString(),
  };
};