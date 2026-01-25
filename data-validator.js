/**
 * Data Validator with Confidence Scores
 * Implements Principles C (Accuracy) and M (Transparency)
 *
 * Validates geocoding results, transit data, and provides confidence scores
 * to help users understand data quality and reliability.
 *
 * @version 1.0.0
 */

class DataValidator {
  constructor() {
    // Confidence thresholds
    this.THRESHOLDS = {
      HIGH: 90,
      MEDIUM: 70,
      LOW: 50
    };

    // Australian state boundaries for validation
    this.STATE_BOUNDS = {
      VIC: { minLat: -39.2, maxLat: -34.0, minLon: 140.9, maxLon: 150.0 },
      NSW: { minLat: -37.5, maxLat: -28.2, minLon: 140.9, maxLon: 154.0 },
      QLD: { minLat: -29.2, maxLat: -10.7, minLon: 138.0, maxLon: 154.0 },
      SA: { minLat: -38.1, maxLat: -26.0, minLon: 129.0, maxLon: 141.0 },
      WA: { minLat: -35.1, maxLat: -13.7, minLon: 112.9, maxLon: 129.0 },
      TAS: { minLat: -43.7, maxLat: -39.5, minLon: 143.8, maxLon: 148.5 },
      NT: { minLat: -26.0, maxLat: -10.9, minLon: 129.0, maxLon: 138.0 },
      ACT: { minLat: -35.9, maxLat: -35.1, minLon: 148.7, maxLon: 149.4 }
    };
  }

  /**
   * Validate geocoding result and return confidence score
   * @param {Object} geocodeResult - Result from geocoding service
   * @param {string} originalQuery - Original search query
   * @param {string} expectedState - Expected state (optional)
   * @returns {Object} Validation result with confidence score
   */
  validateGeocode(geocodeResult, originalQuery, expectedState = null) {
    const validation = {
      isValid: false,
      confidence: 0,
      level: 'unknown',
      reasons: [],
      warnings: [],
      suggestions: []
    };

    if (!geocodeResult || !geocodeResult.lat || !geocodeResult.lon) {
      validation.reasons.push('No coordinates returned');
      return validation;
    }

    let score = 100;
    const factors = [];

    // 1. Check if coordinates are in Australia
    const isInAustralia = this.isInAustralia(geocodeResult.lat, geocodeResult.lon);
    if (!isInAustralia) {
      score -= 50;
      factors.push({ factor: 'location', penalty: 50, reason: 'Coordinates outside Australia' });
      validation.warnings.push('Location appears to be outside Australia');
    }

    // 2. Check if coordinates match expected state
    if (expectedState && isInAustralia) {
      const detectedState = this.detectState(geocodeResult.lat, geocodeResult.lon);
      if (detectedState !== expectedState) {
        score -= 20;
        factors.push({ factor: 'state_mismatch', penalty: 20, reason: `Expected ${expectedState}, got ${detectedState}` });
        validation.warnings.push(`Location is in ${detectedState}, expected ${expectedState}`);
      }
    }

    // 3. Check query match quality
    const queryMatch = this.calculateQueryMatch(originalQuery, geocodeResult.display_name || geocodeResult.address);
    if (queryMatch < 0.5) {
      const penalty = Math.round((1 - queryMatch) * 30);
      score -= penalty;
      factors.push({ factor: 'query_match', penalty, reason: `Low query match: ${Math.round(queryMatch * 100)}%` });
      validation.warnings.push('Address may not exactly match your search');
    }

    // 4. Check for service-reported confidence
    if (geocodeResult.confidence !== undefined) {
      const serviceConfidence = geocodeResult.confidence;
      if (serviceConfidence < 0.7) {
        const penalty = Math.round((1 - serviceConfidence) * 20);
        score -= penalty;
        factors.push({ factor: 'service_confidence', penalty, reason: `Service confidence: ${Math.round(serviceConfidence * 100)}%` });
      }
    }

    // 5. Check for multiple results (ambiguity)
    if (geocodeResult.alternatives && geocodeResult.alternatives.length > 3) {
      score -= 10;
      factors.push({ factor: 'ambiguity', penalty: 10, reason: `${geocodeResult.alternatives.length} alternative results found` });
      validation.suggestions.push('Consider being more specific with your address');
    }

    // 6. Bonus for precise address components
    if (geocodeResult.address_components) {
      const hasStreetNumber = geocodeResult.address_components.some(c => c.types?.includes('street_number'));
      const hasStreetName = geocodeResult.address_components.some(c => c.types?.includes('route'));
      const hasPostcode = geocodeResult.address_components.some(c => c.types?.includes('postal_code'));

      if (hasStreetNumber && hasStreetName && hasPostcode) {
        score = Math.min(100, score + 5);
        factors.push({ factor: 'address_precision', bonus: 5, reason: 'Complete address components' });
      }
    }

    // Calculate final confidence
    validation.confidence = Math.max(0, Math.min(100, score));
    validation.isValid = validation.confidence >= this.THRESHOLDS.LOW;
    validation.level = this.getConfidenceLevel(validation.confidence);
    validation.factors = factors;

    // Add explanation
    validation.explanation = this.generateExplanation(validation, geocodeResult, originalQuery);

    return validation;
  }

  /**
   * Validate transit data quality
   * @param {Object} transitData - Transit data from API
   * @returns {Object} Validation result
   */
  validateTransitData(transitData) {
    const validation = {
      isValid: false,
      confidence: 0,
      level: 'unknown',
      issues: [],
      freshness: 'unknown'
    };

    if (!transitData || !transitData.departures) {
      validation.issues.push('No departure data available');
      return validation;
    }

    let score = 100;

    // 1. Check data freshness
    if (transitData.timestamp) {
      const age = Date.now() - new Date(transitData.timestamp).getTime();
      const ageMinutes = age / (1000 * 60);

      if (ageMinutes > 10) {
        score -= 30;
        validation.issues.push(`Data is ${Math.round(ageMinutes)} minutes old`);
        validation.freshness = 'stale';
      } else if (ageMinutes > 5) {
        score -= 10;
        validation.freshness = 'aging';
      } else {
        validation.freshness = 'fresh';
      }
    }

    // 2. Check for service alerts
    if (transitData.alerts && transitData.alerts.length > 0) {
      const severeAlerts = transitData.alerts.filter(a => a.severity === 'high');
      if (severeAlerts.length > 0) {
        score -= 15;
        validation.issues.push(`${severeAlerts.length} service alert(s) affecting this route`);
      }
    }

    // 3. Check departure count
    if (transitData.departures.length === 0) {
      score -= 40;
      validation.issues.push('No departures found');
    } else if (transitData.departures.length < 3) {
      score -= 10;
      validation.issues.push('Limited departure options available');
    }

    // 4. Check for delays
    const delayedDepartures = transitData.departures.filter(d => d.delay && d.delay > 5);
    if (delayedDepartures.length > transitData.departures.length / 2) {
      score -= 10;
      validation.issues.push('Multiple services are delayed');
    }

    // 5. Check data source
    if (transitData.source === 'fallback') {
      score -= 20;
      validation.issues.push('Using fallback timetable data (not real-time)');
    }

    validation.confidence = Math.max(0, Math.min(100, score));
    validation.isValid = validation.confidence >= this.THRESHOLDS.LOW;
    validation.level = this.getConfidenceLevel(validation.confidence);

    return validation;
  }

  /**
   * Cross-validate address using multiple sources
   * @param {string} address - Address to validate
   * @param {Array} sources - Array of geocoding results from different services
   * @returns {Object} Cross-validation result
   */
  crossValidateAddress(address, sources) {
    const validation = {
      confidence: 0,
      consensus: false,
      bestResult: null,
      disagreement: false,
      sources: []
    };

    if (!sources || sources.length === 0) {
      return validation;
    }

    // Calculate average coordinates
    const validSources = sources.filter(s => s && s.lat && s.lon);
    if (validSources.length === 0) {
      return validation;
    }

    const avgLat = validSources.reduce((sum, s) => sum + parseFloat(s.lat), 0) / validSources.length;
    const avgLon = validSources.reduce((sum, s) => sum + parseFloat(s.lon), 0) / validSources.length;

    // Check how much sources agree (within 100m)
    let agreements = 0;
    for (const source of validSources) {
      const distance = this.calculateDistance(avgLat, avgLon, source.lat, source.lon);
      if (distance < 100) {
        agreements++;
      }
      validation.sources.push({
        name: source.source || 'unknown',
        lat: source.lat,
        lon: source.lon,
        distanceFromConsensus: Math.round(distance)
      });
    }

    const agreementRatio = agreements / validSources.length;
    validation.consensus = agreementRatio >= 0.66;
    validation.disagreement = agreementRatio < 0.5;

    // Calculate confidence based on agreement
    let score = agreementRatio * 100;

    // Bonus for multiple agreeing sources
    if (agreements >= 3) {
      score = Math.min(100, score + 10);
    }

    validation.confidence = Math.round(score);

    // Select best result (highest confidence or most central)
    validation.bestResult = {
      lat: avgLat,
      lon: avgLon,
      source: 'consensus',
      confidence: validation.confidence
    };

    return validation;
  }

  /**
   * Check if coordinates are within Australia
   */
  isInAustralia(lat, lon) {
    return lat >= -44 && lat <= -10 && lon >= 112 && lon <= 154;
  }

  /**
   * Detect which Australian state the coordinates are in
   */
  detectState(lat, lon) {
    for (const [state, bounds] of Object.entries(this.STATE_BOUNDS)) {
      if (lat >= bounds.minLat && lat <= bounds.maxLat &&
          lon >= bounds.minLon && lon <= bounds.maxLon) {
        return state;
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Calculate how well the query matches the result
   */
  calculateQueryMatch(query, result) {
    if (!query || !result) return 0;

    const queryWords = query.toLowerCase().split(/\s+/);
    const resultLower = result.toLowerCase();

    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 2 && resultLower.includes(word)) {
        matches++;
      }
    }

    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * Math.PI / 180;
  }

  /**
   * Get confidence level from score
   */
  getConfidenceLevel(score) {
    if (score >= this.THRESHOLDS.HIGH) return 'high';
    if (score >= this.THRESHOLDS.MEDIUM) return 'medium';
    if (score >= this.THRESHOLDS.LOW) return 'low';
    return 'very_low';
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(validation, geocodeResult, originalQuery) {
    const parts = [];

    parts.push(`Confidence: ${validation.confidence}% (${validation.level})`);

    if (validation.factors && validation.factors.length > 0) {
      parts.push('');
      parts.push('Factors considered:');
      for (const factor of validation.factors) {
        if (factor.penalty) {
          parts.push(`  - ${factor.reason} (-${factor.penalty})`);
        } else if (factor.bonus) {
          parts.push(`  + ${factor.reason} (+${factor.bonus})`);
        }
      }
    }

    if (validation.warnings.length > 0) {
      parts.push('');
      parts.push('Warnings:');
      validation.warnings.forEach(w => parts.push(`  ! ${w}`));
    }

    if (validation.suggestions.length > 0) {
      parts.push('');
      parts.push('Suggestions:');
      validation.suggestions.forEach(s => parts.push(`  > ${s}`));
    }

    return parts.join('\n');
  }

  /**
   * Format validation result for UI display
   */
  formatForUI(validation) {
    return {
      score: validation.confidence,
      level: validation.level,
      color: validation.level === 'high' ? '#22c55e' :
             validation.level === 'medium' ? '#f59e0b' : '#ef4444',
      icon: validation.level === 'high' ? '✓' :
            validation.level === 'medium' ? '~' : '!',
      shortText: `${validation.confidence}% confidence`,
      tooltip: validation.explanation
    };
  }
}

export default DataValidator;
