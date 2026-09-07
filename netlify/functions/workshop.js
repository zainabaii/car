// Netlify Serverless Function: Workshop Finder API

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { category = 'all', query = '' } = payload;

    const workshops = [
      {
        id: 'ws-1',
        name: 'Apex Precision Automotive Tech',
        rating: 4.9,
        reviewsCount: 184,
        distance: '2.4 km away',
        address: '840 Silicon Drive, Tech District',
        status: 'OPEN NOW',
        services: ['Diagnostic Scan', 'Engine Tuning', 'Brake Systems', 'EV/Hybrid Diagnostics'],
        phone: '+1 (555) 019-2831',
        isCertified: true,
        category: 'performance'
      },
      {
        id: 'ws-2',
        name: 'Vanguard Euro Motors & Service',
        rating: 4.8,
        reviewsCount: 240,
        distance: '4.1 km away',
        address: '102 Industrial Parkway',
        status: 'OPEN NOW',
        services: ['European Specialist', 'Transmission Repair', 'Synthetic Lubrication', 'AC Service'],
        phone: '+1 (555) 019-9482',
        isCertified: true,
        category: 'mechanics'
      },
      {
        id: 'ws-3',
        name: 'HyperDrive EV & Hybrid Care Hub',
        rating: 4.9,
        reviewsCount: 96,
        distance: '5.8 km away',
        address: '305 CleanTech Blvd',
        status: 'OPEN NOW',
        services: ['High Voltage Battery Health', 'Inverter Cooling', 'Brake Energy Recov', 'Tires'],
        phone: '+1 (555) 019-3311',
        isCertified: true,
        category: 'ev'
      },
      {
        id: 'ws-4',
        name: 'Velocity Auto Alignment & Tires',
        rating: 4.7,
        reviewsCount: 310,
        distance: '1.2 km away',
        address: '505 Expressway Blvd',
        status: 'CLOSING SOON',
        services: ['3D Laser Alignment', 'Performance Wheel Balance', 'Tire Replacement', 'Suspension'],
        phone: '+1 (555) 019-7721',
        isCertified: false,
        category: 'tires'
      }
    ];

    let filtered = workshops;
    if (category !== 'all') {
      filtered = workshops.filter(w => w.category === category);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(w => w.name.toLowerCase().includes(q) || w.services.some(s => s.toLowerCase().includes(q)));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        resultsCount: filtered.length,
        workshops: filtered,
        mapMode: 'placeholder-demo',
        note: 'Ready for live Google Maps / Mapbox Places API integration.'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
