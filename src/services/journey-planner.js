/**
 * Journey Planner Service
 * Builds dynamic route segments based on user-configured journey preferences
 * All routing is derived from user preferences - no hardcoded addresses
 *
 * Copyright (c) 2026 Angus Bergman
 * Licensed under CC BY-NC 4.0 (Creative Commons Attribution-NonCommercial 4.0 International License)
 * https://creativecommons.org/licenses/by-nc/4.0/
 */

class JourneyPlanner {
  constructor() {
    this.cache = null;
    this.cacheExpiry = null;
  }

  /**
   * Calculate journey based on locations and preferences
   * This is a simplified journey planner that works with the smart route calculation
   */
  async calculateJourney(params) {
    const {
      homeLocation,
      workLocation,
      cafeLocation,
      workStartTime,
      cafeDuration = 5,
      transitAuthority = 'VIC',
      selectedStops = null
    } = params;

    console.log('🗺️  JourneyPlanner.calculateJourney called');
    console.log('   Home:', homeLocation?.formattedAddress);
    console.log('   Work:', workLocation?.formattedAddress);
    console.log('   Cafe:', cafeLocation?.formattedAddress);

    try {
      // Use global fallback timetables for stop lookup
      const fallbackStops = global.fallbackTimetables?.getStopsForState?.(transitAuthority) || [];
      
      // Find nearest stops to home and work
      const homeStops = this.findNearbyStops(homeLocation, fallbackStops, 5);
      const workStops = this.findNearbyStops(workLocation, fallbackStops, 5);
      const cafeStop = cafeLocation ? this.findNearbyStops(cafeLocation, fallbackStops, 1)[0] : null;

      if (homeStops.length === 0 || workStops.length === 0) {
        return {
          success: false,
          error: 'No transit stops found near home or work location'
        };
      }

      // Select best stops (or use user-selected if provided)
      const originStop = selectedStops?.origin || homeStops[0];
      const destStop = selectedStops?.destination || workStops[0];

      // Calculate journey segments
      const segments = this.buildJourneySegments({
        homeLocation,
        workLocation,
        cafeLocation,
        originStop,
        destStop,
        cafeStop,
        workStartTime,
        cafeDuration
      });

      // Calculate total time
      const totalMinutes = segments.reduce((sum, seg) => sum + (seg.minutes || 0), 0);
      
      // Calculate departure time
      const [hours, mins] = workStartTime.split(':').map(Number);
      const arrivalMinutes = hours * 60 + mins;
      const departureMinutes = arrivalMinutes - totalMinutes;
      const depHours = Math.floor(departureMinutes / 60);
      const depMins = departureMinutes % 60;
      const departureTime = `${String(depHours).padStart(2, '0')}:${String(depMins).padStart(2, '0')}`;

      return {
        success: true,
        journey: {
          departureTime,
          arrivalTime: workStartTime,
          totalMinutes,
          segments,
          route: {
            mode: this.getModeName(originStop.route_type),
            icon: this.getModeIcon(originStop.route_type),
            originStop,
            destinationStop: destStop,
            transitMinutes: originStop.route_type === destStop.route_type ? 
              this.estimateTransitTime(originStop, destStop) : 15
          },
          cafe: cafeLocation ? {
            included: true,
            location: cafeLocation,
            stop: cafeStop,
            durationMinutes: cafeDuration
          } : null
        },
        options: {
          homeStops: homeStops.map((s, i) => ({ ...s, selected: i === 0 })),
          workStops: workStops.map((s, i) => ({ ...s, selected: i === 0 })),
          alternativeRoutes: this.findAlternativeRoutes(homeStops, workStops)
        }
      };

    } catch (error) {
      console.error('❌ JourneyPlanner error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find stops near a location
   */
  /**
   * Find nearby stops with route preference support
   * @param {Object} location - Location with lat/lon
   * @param {Array} allStops - All available stops
   * @param {number} limit - Max stops to return
   * @param {Object} routePrefs - Optional route preferences from config
   */
  findNearbyStops(location, allStops, limit = 5, routePrefs = null) {
    if (!location?.lat || !location?.lon || !allStops?.length) {
      return [];
    }

    // Default preferences (can be overridden by config)
    const prefs = routePrefs || {
      optimizeFor: 'minimal-walking',
      walking: {
        maxDistanceMeters: 500,
        idealDistanceMeters: 300,
        weightFactor: 2.0
      },
      modePriority: { train: 1, tram: 2, vline: 2, bus: 3 }
    };

    // Map route_type to mode name for priority lookup
    const routeTypeToMode = { 0: 'train', 1: 'tram', 2: 'bus', 3: 'vline' };
    const maxDist = prefs.walking?.maxDistanceMeters || 500;
    const idealDist = prefs.walking?.idealDistanceMeters || 300;
    const walkWeight = prefs.walking?.weightFactor || 2.0;

    return allStops
      .map(stop => {
        const distance = this.haversineDistance(location.lat, location.lon, stop.lat, stop.lon);
        const walkingMinutes = Math.ceil(distance / 80); // ~80m/min walking
        return {
          ...stop,
          distance,
          walkingMinutes,
          icon: this.getModeIcon(stop.route_type),
          withinIdeal: distance <= idealDist,
          withinMax: distance <= maxDist
        };
      })
      .filter(stop => {
        // When optimizing for minimal walking, strictly enforce max distance
        if (prefs.optimizeFor === 'minimal-walking') {
          return stop.distance <= maxDist;
        }
        return stop.distance < 2000; // Fallback: 2km max
      })
      .sort((a, b) => {
        // When optimizing for minimal walking: distance first, then mode
        if (prefs.optimizeFor === 'minimal-walking') {
          // Prefer stops within ideal distance
          if (a.withinIdeal && !b.withinIdeal) return -1;
          if (!a.withinIdeal && b.withinIdeal) return 1;
          // Then sort by distance (weighted)
          const distDiff = (a.distance * walkWeight) - (b.distance * walkWeight);
          if (Math.abs(distDiff) > 50) return distDiff; // Significant distance difference
          // If similar distance, prefer better mode
          const aMode = routeTypeToMode[a.route_type] || 'bus';
          const bMode = routeTypeToMode[b.route_type] || 'bus';
          const aPriority = prefs.modePriority[aMode] || 4;
          const bPriority = prefs.modePriority[bMode] || 4;
          return aPriority - bPriority;
        }
        // Default: mode first, then distance
        const aMode = routeTypeToMode[a.route_type] || 'bus';
        const bMode = routeTypeToMode[b.route_type] || 'bus';
        const aPriority = prefs.modePriority[aMode] || 4;
        const bPriority = prefs.modePriority[bMode] || 4;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.distance - b.distance;
      })
      .slice(0, limit);
  }

  /**
   * Build journey segments
   */
  buildJourneySegments(params) {
    const { homeLocation, workLocation, cafeLocation, originStop, destStop, cafeStop, workStartTime, cafeDuration } = params;
    const segments = [];
    let currentTime = 0; // Will calculate backwards from arrival

    // Calculate times
    const walkToStop = originStop.walkingMinutes || 5;
    const transitTime = this.estimateTransitTime(originStop, destStop);
    const walkFromStop = destStop.walkingMinutes || 5;
    const waitTime = 2;

    // Segment 1: Walk to stop (or cafe first)
    if (cafeLocation && cafeStop) {
      const walkToCafe = Math.ceil(this.haversineDistance(
        homeLocation.lat, homeLocation.lon, 
        cafeLocation.lat, cafeLocation.lon
      ) / 80);
      
      segments.push({
        type: 'walk',
        from: 'Home',
        to: 'Cafe',
        minutes: walkToCafe,
        time: '' // Will fill in later
      });
      
      segments.push({
        type: 'coffee',
        location: 'Cafe',
        minutes: cafeDuration,
        time: ''
      });

      const walkFromCafe = Math.ceil(this.haversineDistance(
        cafeLocation.lat, cafeLocation.lon,
        originStop.lat, originStop.lon
      ) / 80);
      
      segments.push({
        type: 'walk',
        from: 'Cafe',
        to: originStop.name,
        minutes: walkFromCafe,
        time: ''
      });
    } else {
      segments.push({
        type: 'walk',
        from: 'Home',
        to: originStop.name,
        minutes: walkToStop,
        time: ''
      });
    }

    // Segment 2: Wait
    segments.push({
      type: 'wait',
      location: originStop.name,
      minutes: waitTime,
      time: ''
    });

    // Segment 3: Transit
    segments.push({
      type: 'transit',
      mode: this.getModeName(originStop.route_type),
      icon: this.getModeIcon(originStop.route_type),
      from: originStop.name,
      to: destStop.name,
      minutes: transitTime,
      time: '',
      note: 'Timetabled estimate (configure Transport API for live times)'
    });

    // Segment 4: Walk to work
    segments.push({
      type: 'walk',
      from: destStop.name,
      to: 'Work',
      minutes: walkFromStop,
      time: ''
    });

    // Calculate times backwards from arrival
    const [hours, mins] = workStartTime.split(':').map(Number);
    let currentMinutes = hours * 60 + mins;
    
    for (let i = segments.length - 1; i >= 0; i--) {
      currentMinutes -= segments[i].minutes;
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      segments[i].time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return segments;
  }

  /**
   * Estimate transit time between stops
   */
  estimateTransitTime(origin, dest) {
    const distance = this.haversineDistance(origin.lat, origin.lon, dest.lat, dest.lon);
    // Rough estimate: 30km/h average for transit
    return Math.max(2, Math.ceil(distance / 500));
  }

  /**
   * Find alternative routes
   */
  findAlternativeRoutes(homeStops, workStops) {
    const routes = [];
    
    for (const origin of homeStops.slice(0, 3)) {
      for (const dest of workStops.slice(0, 3)) {
        if (origin.route_type === dest.route_type) {
          routes.push({
            originStopId: origin.id,
            originStopName: origin.name,
            destinationStopId: dest.id,
            destinationStopName: dest.name,
            mode: this.getModeName(origin.route_type),
            icon: this.getModeIcon(origin.route_type),
            totalMinutes: origin.walkingMinutes + this.estimateTransitTime(origin, dest) + dest.walkingMinutes,
            transitMinutes: this.estimateTransitTime(origin, dest),
            walkingMinutes: origin.walkingMinutes + dest.walkingMinutes
          });
        }
      }
    }
    
    return routes.sort((a, b) => a.totalMinutes - b.totalMinutes).slice(0, 5);
  }

  /**
   * Haversine distance in meters
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Get mode name from route type
   */
  getModeName(routeType) {
    const modes = { 0: 'Train', 1: 'Tram', 2: 'Bus', 3: 'V/Line', 4: 'Ferry' };
    return modes[routeType] || 'Transit';
  }

  /**
   * Get mode icon from route type
   */
  getModeIcon(routeType) {
    const icons = { 0: '🚆', 1: '🚊', 2: '🚌', 3: '🚄', 4: '⛴️' };
    return icons[routeType] || '🚇';
  }
}

export default JourneyPlanner;
