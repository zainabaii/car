// Netlify Serverless Function: VIN Decoding Proxy via NHTSA vPIC API

export async function handler(event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let vin = '';
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      vin = data.vin || '';
    } else if (event.httpMethod === 'GET') {
      vin = event.queryStringParameters?.vin || '';
    }

    vin = vin.trim().toUpperCase();

    if (!vin || vin.length !== 17) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid VIN',
          message: 'VIN must be exactly 17 characters long. Please verify and try again.'
        })
      };
    }

    // Call NHTSA vPIC API
    const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;
    const response = await fetch(nhtsaUrl);
    
    if (!response.ok) {
      throw new Error(`NHTSA API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.Results?.[0];

    if (!result) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Vehicle Not Found',
          message: 'No vehicle data returned from NHTSA for this VIN.'
        })
      };
    }

    // Extract useful fields
    const normalizedData = {
      vin: vin,
      make: result.Make || 'UNSPECIFIED MAKE',
      model: result.Model || 'UNSPECIFIED MODEL',
      year: result.ModelYear || 'N/A',
      engine: result.EngineConfiguration || result.EngineCylinders ? `${result.EngineDisplacementL ? result.EngineDisplacementL + 'L ' : ''}${result.EngineCylinders ? result.EngineCylinders + '-Cyl ' : ''}${result.EngineConfiguration || ''}`.trim() : 'Standard Internal Combustion',
      fuelType: result.FuelTypePrimary || 'Gasoline',
      bodyClass: result.BodyClass || 'Sedan / Passenger Car',
      transmission: result.TransmissionStyle || 'Automatic',
      driveType: result.DriveType || 'FWD / AWD',
      plantCountry: result.PlantCountry || 'United States',
      vehicleType: result.VehicleType || 'PASSENGER CAR',
      rawNhtsaCode: result.ErrorCode
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        vehicle: normalizedData
      })
    };

  } catch (error) {
    console.error('VIN Decode Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'VIN Decoding Failed',
        message: error.message || 'An error occurred while contacting NHTSA API.'
      })
    };
  }
}
