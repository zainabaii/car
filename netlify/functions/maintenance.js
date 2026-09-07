// Netlify Serverless Function: Vehicle Maintenance Schedule API

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
    const { vehicle = null, mileage = 12450 } = payload;

    const maintenanceItems = [
      {
        title: 'Full Synthetic Engine Oil & Filter Change',
        interval: '10,000 KM / 12 Months',
        dueInKm: 2550,
        urgency: 'routine',
        description: 'Protects internal engine components against friction and high heat breakdown.',
        category: 'Engine Care'
      },
      {
        title: 'Brake System Inspection & Pad Measurement',
        interval: '15,000 KM',
        dueInKm: 2550,
        urgency: 'routine',
        description: 'Verify rotor thickness and brake lining wear indicator clearances.',
        category: 'Braking'
      },
      {
        title: 'Cabin & Engine Air Filter Replacement',
        interval: '20,000 KM',
        dueInKm: 7550,
        urgency: 'upcoming',
        description: 'Ensures optimal HVAC airflow and clean air intake charge to intake manifold.',
        category: 'Filters'
      },
      {
        title: 'Transmission Fluid & Differential Service',
        interval: '50,000 KM',
        dueInKm: 37550,
        urgency: 'longterm',
        description: 'Prevents gear degradation and maintains smooth clutch/valve body actuation.',
        category: 'Drivetrain'
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Generic Vehicle',
        mileage,
        schedule: maintenanceItems,
        disclaimer: 'Actual service intervals depend on vehicle manufacturer guidelines, driving environment, and physical condition inspection.'
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
