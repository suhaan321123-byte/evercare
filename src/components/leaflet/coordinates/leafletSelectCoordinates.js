"use client";

import { getAddressFromCoordinates } from "@/utils/shipping/geocodeReverse";
import { useState, useEffect, useRef } from "react";

export default function LeafletSelectCoordinates({
  onAddressSelect,
  initialLocation = { lat: 28.6139, lng: 77.209 },
  onBack = () => {},
  needDefaultLocation = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(18);
  const [isConfirming, setIsConfirming] = useState(false);
  // Track if location has changed from initial
  const hasLocationChanged = () => {
    if (
      initialLocation?.locationAddress?.latitude == selectedLocation.lat &&
      initialLocation?.locationAddress?.longitude == selectedLocation.lng
    ) {
      return false;
    } else {
      return true;
    }
  };

  // Initialize on client only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isClient || !mapRef.current) return;

    const initMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up previous map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerRef.current = null;
        }

        // Dynamically import Leaflet
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Create custom icon with proper anchor points
        const createCustomIcon = () => {
          return L.divIcon({
            html: `
              <div style="
                position: relative;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  position: relative;
                  width: 30px;
                  height: 30px;
                  background-color: #dc2626;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(45deg);
                    width: 10px;
                    height: 10px;
                    background-color: white;
                    border-radius: 50%;
                  "></div>
                </div>
                <div style="
                  position: absolute;
                  bottom: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 2px;
                  height: 15px;
                  background-color: #dc2626;
                "></div>
              </div>
            `,
            className: "custom-marker-icon",
            iconSize: [40, 55],
            iconAnchor: [20, 55],
          });
        };

        // Create map instance
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [selectedLocation.lat, selectedLocation.lng],
          zoom: zoomLevel,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        // Track zoom level changes
        mapInstanceRef.current.on("zoomend", () => {
          setZoomLevel(mapInstanceRef.current.getZoom());
        });

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current);

        // Create custom icon
        const customIcon = createCustomIcon();

        // Add marker
        markerRef.current = L.marker(
          [selectedLocation.lat, selectedLocation.lng],
          {
            icon: customIcon,
            draggable: true,
            autoPan: true,
          },
        ).addTo(mapInstanceRef.current);

        // Add click event to map
        mapInstanceRef.current.on("click", (e) => {
          const { lat, lng } = e.latlng;
          const newLocation = { lat, lng };

          // Update selected location
          setSelectedLocation(newLocation);

          // Move marker to new location
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }

          // Pan map to center on new location
          mapInstanceRef.current.panTo([lat, lng]);

          // Callback to parent
          onAddressSelect?.(newLocation);
        });

        // Add drag event to marker
        if (markerRef.current) {
          markerRef.current.on("dragend", (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            const newLocation = { lat: position.lat, lng: position.lng };

            setSelectedLocation(newLocation);
            onAddressSelect?.(newLocation);
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize map:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isClient, onAddressSelect]);

  // Update marker when selectedLocation changes externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && selectedLocation) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
      mapInstanceRef.current.setView(
        [selectedLocation.lat, selectedLocation.lng],
        zoomLevel,
      );
    }
  }, [selectedLocation, zoomLevel]);

  // Get user's current location
  const getUserLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };

        setSelectedLocation(newLocation);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 18);
          markerRef.current.setLatLng([latitude, longitude]);
        }

        onAddressSelect?.(newLocation);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Unable to retrieve your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access was denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }

        alert(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  useEffect(() => {
    if (needDefaultLocation) {
      getUserLocation();
    }
  }, [needDefaultLocation]);

  const confirmLocation = async () => {
    setIsConfirming(true);

    try {
      let finalData;

      // Check if location has changed
      if (hasLocationChanged()) {
        // Fetch new address from API
        const addressData = await getAddressFromCoordinates(
          selectedLocation.lat,
          selectedLocation.lng,
        );

        // Prepare final data with both coordinates and address
        finalData = {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          locationAddress: {
            ...addressData,
            latitude: selectedLocation.lat, // Ensure lat/lng are included in address
            longitude: selectedLocation.lng,
          },
        };
      } else {
        // Check if initialLocation already has address data
        if (initialLocation?.locationAddress) {
          finalData = {
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            locationAddress: {
              ...initialLocation.locationAddress,
              latitude: selectedLocation.lat, // Update lat/lng to current values
              longitude: selectedLocation.lng,
            },
          };
        } else {
          // Create minimal address data
          finalData = {
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            locationAddress: {
              fullAddress: `Latitude: ${selectedLocation.lat.toFixed(6)}, Longitude: ${selectedLocation.lng.toFixed(6)}`,
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng,
              source: "manual",
              timestamp: new Date().toISOString(),
            },
          };
        }
      }
      // Call parent callback with final data
      onAddressSelect?.(finalData);

      // Navigate back
      onBack?.();
    } catch (error) {
      console.error("Error confirming location:", error);
      alert("Failed to get address information. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Don't render on server
  if (!isClient) {
    return (
      <div className="h-[450px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Initializing map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50">
        <p className="text-red-600">Failed to load map: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden">
        <div
          ref={mapRef}
          className="w-full md:min-h-[450px] h-full max-h-[550px]"
          style={{ minHeight: "350px" }}
          // className="w-full max-h-[550px]"
        />
      </div>

      <div className="flex justify-between items-center gap-2 p-2">
        <button
          onClick={getUserLocation}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {isLoading ? "Getting Location..." : "Use My Location"}
        </button>
        <button
          onClick={confirmLocation}
          disabled={isConfirming}
          className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          {isConfirming ? "Confirming..." : "Confirm Location"}
        </button>
      </div>
    </div>
  );
}
