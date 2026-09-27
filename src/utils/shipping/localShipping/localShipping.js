
// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getMaxRadius(zone) {
  return Math.max(...zone.radiusRanges.map(r => r.maxRadius));
}

export function checkDeliveryAvailability(
  location,
  zones,
  orderDetails = { weight: 1, orderValue: 0 }
) {
  let bestZone = null;
  let minDistance = Infinity;

  for (const zone of zones) {
    const distance = calculateDistance(
      location.lat,
      location.lng,
      zone.center[0],
      zone.center[1]
    );

    const maxRadius = getMaxRadius(zone);
    if (distance <= maxRadius && distance < minDistance) {
      minDistance = distance;
      bestZone = zone;
    }
  }

  if (bestZone) {
    // Check max weight limit
    if (bestZone.maxWeightEnabled && orderDetails.weight > bestZone.maxWeight) {
      return {
        available: false,
        zone: bestZone,
        distance: minDistance,
        charge: 0,
        isFreeDelivery: false,
        weightExceeded: true,
      };
    }

    // Find applicable radius range
    const distanceMeters = minDistance;
    const applicableRange = bestZone.radiusRanges.find(
      r => distanceMeters >= r.minRadius && distanceMeters <= r.maxRadius
    );

    if (!applicableRange) {
      return {
        available: false,
        zone: null,
        distance: minDistance,
        charge: 0,
        isFreeDelivery: false,
        weightExceeded: false,
      };
    }

    // Calculate distance-based charge
    const distanceCharge = applicableRange.charge;

    // Calculate weight-based charge
    const weightCharge = orderDetails.weight * bestZone.chargePerKg;

    // Calculate heavy item surcharge
    let heavyItemCharge = 0;
    if (bestZone.heavyItemEnabled && orderDetails.weight >= bestZone.heavyWeightThreshold) {
      heavyItemCharge = bestZone.heavyItemCharge;
    }

    // Total charge
    let totalCharge = distanceCharge + weightCharge + heavyItemCharge;

    // Check free delivery
    const isFreeDelivery = bestZone.freeDeliveryEnabled && 
      orderDetails.orderValue >= bestZone.freeDeliveryThreshold;

    if (isFreeDelivery) {
      totalCharge = 0;
    }

    return {
      available: true,
      zone: bestZone,
      distance: minDistance,
      charge: Math.round(totalCharge * 100) / 100,
      isFreeDelivery,
      weightExceeded: false,
      breakdown: {
        distanceCharge,
        weightCharge,
        heavyItemCharge,
        freeDeliveryApplied: isFreeDelivery,
      },
    };
  }

  // Find nearest zone for reference
  let nearestDistance = Infinity;
  for (const zone of zones) {
    const distance = calculateDistance(
      location.lat,
      location.lng,
      zone.center[0],
      zone.center[1]
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
    }
  }

  return {
    available: false,
    zone: null,
    distance: nearestDistance,
    charge: 0,
    isFreeDelivery: false,
    weightExceeded: false,
  };
}

export function generateZoneColor(index) {
  const colors = [
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
  ];
  return colors[index % colors.length];
}