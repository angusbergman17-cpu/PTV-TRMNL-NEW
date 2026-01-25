/**
 * Journey Profiles Manager
 * Implements Principle E (Customization) and I (Privacy)
 *
 * Allows users to create multiple journey profiles for different routes/schedules
 * All data stored locally only - no cloud sync
 *
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JourneyProfiles {
  constructor() {
    this.profilesFile = path.join(__dirname, 'journey-profiles.json');
    this.profiles = [];
    this.activeProfileId = null;
    this.maxProfiles = 10;
  }

  /**
   * Initialize profiles from file
   */
  async init() {
    try {
      const data = await fs.readFile(this.profilesFile, 'utf8');
      const parsed = JSON.parse(data);
      this.profiles = parsed.profiles || [];
      this.activeProfileId = parsed.activeProfileId || null;
      console.log(`[JourneyProfiles] Loaded ${this.profiles.length} profiles`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[JourneyProfiles] No profiles file found, creating default');
        await this.createDefaultProfile();
      } else {
        console.error('[JourneyProfiles] Error loading profiles:', error);
      }
    }
  }

  /**
   * Create default profile
   */
  async createDefaultProfile() {
    const defaultProfile = {
      id: this.generateId(),
      name: 'Default Commute',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Address configuration
      addresses: {
        home: '',
        work: '',
        cafe: ''
      },

      // Schedule configuration
      schedule: {
        arrivalTime: '09:00',
        daysActive: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        coffeeEnabled: true,
        coffeeTime: 5
      },

      // Transit preferences
      transit: {
        preferredModes: [0, 1, 2, 3], // Train, Tram, Bus, V/Line
        maxWalkingDistance: 1000, // meters
        avoidStops: [],
        preferredStops: []
      },

      // Display preferences
      display: {
        showWeather: true,
        showCoffeeDecision: true,
        use24HourTime: true
      }
    };

    this.profiles = [defaultProfile];
    this.activeProfileId = defaultProfile.id;
    await this.save();

    return defaultProfile;
  }

  /**
   * Save profiles to file
   */
  async save() {
    try {
      const data = {
        profiles: this.profiles,
        activeProfileId: this.activeProfileId,
        version: '1.0.0',
        lastModified: new Date().toISOString()
      };
      await fs.writeFile(this.profilesFile, JSON.stringify(data, null, 2));
      console.log('[JourneyProfiles] Saved profiles');
    } catch (error) {
      console.error('[JourneyProfiles] Error saving profiles:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'profile_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get all profiles
   */
  getAll() {
    return this.profiles;
  }

  /**
   * Get profile by ID
   */
  getById(id) {
    return this.profiles.find(p => p.id === id);
  }

  /**
   * Get active profile
   */
  getActive() {
    if (!this.activeProfileId) {
      return this.profiles.find(p => p.isDefault) || this.profiles[0];
    }
    return this.getById(this.activeProfileId);
  }

  /**
   * Set active profile
   */
  async setActive(id) {
    const profile = this.getById(id);
    if (!profile) {
      throw new Error('Profile not found');
    }
    this.activeProfileId = id;
    await this.save();
    return profile;
  }

  /**
   * Create new profile
   */
  async create(profileData) {
    if (this.profiles.length >= this.maxProfiles) {
      throw new Error(`Maximum ${this.maxProfiles} profiles allowed`);
    }

    const newProfile = {
      id: this.generateId(),
      name: profileData.name || `Profile ${this.profiles.length + 1}`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      addresses: {
        home: profileData.addresses?.home || '',
        work: profileData.addresses?.work || '',
        cafe: profileData.addresses?.cafe || ''
      },

      schedule: {
        arrivalTime: profileData.schedule?.arrivalTime || '09:00',
        daysActive: profileData.schedule?.daysActive || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        coffeeEnabled: profileData.schedule?.coffeeEnabled ?? true,
        coffeeTime: profileData.schedule?.coffeeTime || 5
      },

      transit: {
        preferredModes: profileData.transit?.preferredModes || [0, 1, 2, 3],
        maxWalkingDistance: profileData.transit?.maxWalkingDistance || 1000,
        avoidStops: profileData.transit?.avoidStops || [],
        preferredStops: profileData.transit?.preferredStops || []
      },

      display: {
        showWeather: profileData.display?.showWeather ?? true,
        showCoffeeDecision: profileData.display?.showCoffeeDecision ?? true,
        use24HourTime: profileData.display?.use24HourTime ?? true
      }
    };

    this.profiles.push(newProfile);
    await this.save();

    return newProfile;
  }

  /**
   * Update profile
   */
  async update(id, updates) {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Profile not found');
    }

    const profile = this.profiles[index];

    // Deep merge updates
    if (updates.name) profile.name = updates.name;

    if (updates.addresses) {
      profile.addresses = { ...profile.addresses, ...updates.addresses };
    }

    if (updates.schedule) {
      profile.schedule = { ...profile.schedule, ...updates.schedule };
    }

    if (updates.transit) {
      profile.transit = { ...profile.transit, ...updates.transit };
    }

    if (updates.display) {
      profile.display = { ...profile.display, ...updates.display };
    }

    profile.updatedAt = new Date().toISOString();
    this.profiles[index] = profile;

    await this.save();
    return profile;
  }

  /**
   * Delete profile
   */
  async delete(id) {
    const profile = this.getById(id);
    if (!profile) {
      throw new Error('Profile not found');
    }

    if (profile.isDefault) {
      throw new Error('Cannot delete default profile');
    }

    this.profiles = this.profiles.filter(p => p.id !== id);

    // If deleted profile was active, switch to default
    if (this.activeProfileId === id) {
      this.activeProfileId = this.profiles.find(p => p.isDefault)?.id || this.profiles[0]?.id;
    }

    await this.save();
    return { success: true };
  }

  /**
   * Duplicate profile
   */
  async duplicate(id) {
    const source = this.getById(id);
    if (!source) {
      throw new Error('Profile not found');
    }

    const duplicate = {
      ...JSON.parse(JSON.stringify(source)),
      id: this.generateId(),
      name: `${source.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.profiles.push(duplicate);
    await this.save();

    return duplicate;
  }

  /**
   * Export profile as JSON
   */
  export(id) {
    const profile = id ? this.getById(id) : this.getActive();
    if (!profile) {
      throw new Error('Profile not found');
    }

    return JSON.stringify(profile, null, 2);
  }

  /**
   * Export all profiles
   */
  exportAll() {
    return JSON.stringify({
      profiles: this.profiles,
      activeProfileId: this.activeProfileId,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Import profile from JSON
   */
  async import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      // Single profile import
      if (imported.id && imported.addresses) {
        imported.id = this.generateId(); // Generate new ID
        imported.isDefault = false;
        imported.createdAt = new Date().toISOString();
        imported.updatedAt = new Date().toISOString();

        this.profiles.push(imported);
        await this.save();

        return { success: true, profile: imported };
      }

      // Bulk import
      if (imported.profiles && Array.isArray(imported.profiles)) {
        const newProfiles = imported.profiles.map(p => ({
          ...p,
          id: this.generateId(),
          isDefault: false
        }));

        this.profiles.push(...newProfiles);
        await this.save();

        return { success: true, count: newProfiles.length };
      }

      throw new Error('Invalid import format');
    } catch (error) {
      throw new Error('Import failed: ' + error.message);
    }
  }

  /**
   * Get profile for current day/time
   * Returns the most appropriate profile based on schedule
   */
  getProfileForNow() {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];

    // Find profiles active today
    const activeToday = this.profiles.filter(p =>
      p.schedule.daysActive.includes(today)
    );

    if (activeToday.length === 0) {
      return this.getActive();
    }

    if (activeToday.length === 1) {
      return activeToday[0];
    }

    // Multiple profiles active - return the one set as active, or first match
    const activeProfile = activeToday.find(p => p.id === this.activeProfileId);
    return activeProfile || activeToday[0];
  }

  /**
   * Get summary of all profiles
   */
  getSummary() {
    return this.profiles.map(p => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault,
      isActive: p.id === this.activeProfileId,
      daysActive: p.schedule.daysActive,
      arrivalTime: p.schedule.arrivalTime,
      hasAddresses: !!(p.addresses.home && p.addresses.work)
    }));
  }
}

export default JourneyProfiles;
