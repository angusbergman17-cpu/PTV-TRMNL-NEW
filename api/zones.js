// /api/zones - Returns list of changed zone IDs (firmware stage 1)
import { renderZones } from '../src/services/zone-renderer.js';

export default async function handler(req, res) {
  try { if (req.query.ver) return res.json({version: 'v2-test', ts: Date.now()});
    const forceAll = req.query.force === 'true';
    
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    
    const data = {
      current_time: currentTime,
      weather: { temp: 22, condition: 'Clear' },
      leave_by: '08:45',
      arrive_by: '09:15',
      trains: [{ minutes: 5, destination: 'City' }, { minutes: 15, destination: 'City' }],
      trams: [{ minutes: 3, destination: 'City' }, { minutes: 12, destination: 'City' }],
      coffee: { canGet: true, subtext: 'You have 8 minutes' }
    };
    
    const result = renderZones(data, {}, forceAll);
    
    // Return ONLY the IDs of changed zones (tiny payload for 512-byte buffer)
    const changedIds = result.zones
      .filter(z => z.changed || forceAll)
      .map(z => z.id);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).json({
      timestamp: result.timestamp,
      changed: changedIds
    });
  } catch (error) {
    console.error('Zones error:', error);
    res.status(500).json({ error: error.message });
  }
}
