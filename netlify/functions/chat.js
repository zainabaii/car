// Netlify Serverless Function: VAYRA Agentic AI Chat & Orchestrator

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { message = '', vehicle = null, conversation = [] } = payload;

    if (!message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message cannot be empty.' })
      };
    }

    // 1. Intent Recognition & Agent Selection (VAYRA Orchestrator)
    const agentConfig = determineSpecializedAgent(message, vehicle);

    // 2. Format System Prompt with Automotive Expertise & Vehicle Context
    const systemPrompt = buildAgentSystemPrompt(agentConfig, vehicle);

    // 3. Multi-tier Execution (Gemini -> Groq -> Expert Automotive Rule Engine)
    let aiResponse = null;
    let providerUsed = 'none';

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (geminiApiKey) {
      try {
        aiResponse = await callGeminiApi(geminiApiKey, systemPrompt, message, conversation);
        if (aiResponse) providerUsed = 'Gemini 1.5 Pro/Flash';
      } catch (geminiErr) {
        console.warn('Gemini AI Provider failed, attempting Groq fallback:', geminiErr.message);
      }
    }

    if (!aiResponse && groqApiKey) {
      try {
        aiResponse = await callGroqApi(groqApiKey, systemPrompt, message, conversation);
        if (aiResponse) providerUsed = 'Groq Llama-3';
      } catch (groqErr) {
        console.warn('Groq AI Provider failed:', groqErr.message);
      }
    }

    // Fallback to VAYRA Expert System Engine if API keys not set or AI failed
    if (!aiResponse) {
      aiResponse = generateExpertAutomotiveFallback(agentConfig.agentId, message, vehicle);
      providerUsed = 'VAYRA Expert Engine';
    }

    const safetyDisclaimer = "\n\n*VAYRA provides general automotive guidance based on reported symptoms and vehicle specs. It does not replace a qualified mechanic or physical inspection.*";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        agent: {
          id: agentConfig.agentId,
          name: agentConfig.agentName,
          role: agentConfig.agentRole,
          badge: agentConfig.badge
        },
        provider: providerUsed,
        reply: aiResponse + safetyDisclaimer,
        rawText: aiResponse,
        vehicleContext: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null
      })
    };

  } catch (err) {
    console.error('VAYRA Chat Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Chat Processing Error',
        message: err.message || 'Unable to process chat request.'
      })
    };
  }
}

// Intent Classification Engine
function determineSpecializedAgent(message, vehicle) {
  const text = message.toLowerCase();

  // Symptoms / Troubleshooting -> Car Care Agent
  if (text.includes('shake') || text.includes('vibrat') || text.includes('overheat') || text.includes('noise') || text.includes('smoke') || text.includes('leak') || text.includes('smell') || text.includes('symptom') || text.includes('check engine') || text.includes('start') || text.includes('brake') || text.includes('knock')) {
    return {
      agentId: 'car-care',
      agentName: 'Car Care Agent',
      agentRole: 'Automotive Diagnostics & Symptom Analyzer',
      badge: 'CARE AGENT'
    };
  }

  // Maintenance & Interval questions -> Maintenance Agent
  if (text.includes('service') || text.includes('oil') || text.includes('interval') || text.includes('maintenance') || text.includes('filter') || text.includes('fluid') || text.includes('belt') || text.includes('spark plug') || text.includes('schedule') || text.includes('km') || text.includes('miles')) {
    return {
      agentId: 'maintenance',
      agentName: 'Maintenance Agent',
      agentRole: 'Vehicle Service Planning & Intervals',
      badge: 'MAINTENANCE AGENT'
    };
  }

  // Workshop / Service Center -> Workshop Finder Agent
  if (text.includes('workshop') || text.includes('mechanic') || text.includes('garage') || text.includes('repair shop') || text.includes('near me') || text.includes('find') || text.includes('dealer')) {
    return {
      agentId: 'workshop',
      agentName: 'Workshop Finder Agent',
      agentRole: 'Service Center & Repair Network Locator',
      badge: 'WORKSHOP AGENT'
    };
  }

  // Reminders & Scheduling -> Service Reminder Agent
  if (text.includes('remind') || text.includes('notification') || text.includes('due') || text.includes('calendar') || text.includes('track')) {
    return {
      agentId: 'reminder',
      agentName: 'Service Reminder Agent',
      agentRole: 'Automotive Lifecycle & Milestone Tracker',
      badge: 'REMINDER AGENT'
    };
  }

  // Default / Specs / Identity -> Vehicle Information Agent
  return {
    agentId: 'vehicle-info',
    agentName: 'Vehicle Information Agent',
    agentRole: 'Vehicle Specifications & Identity Specialist',
    badge: 'SPEC AGENT'
  };
}

function buildAgentSystemPrompt(agentConfig, vehicle) {
  let vehicleInfoStr = vehicle && vehicle.make ? `Active Vehicle: ${vehicle.year || ''} ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin || 'N/A'}, Engine: ${vehicle.engine || 'N/A'}, Fuel: ${vehicle.fuelType || 'N/A'})` : 'Active Vehicle: None specified yet.';

  return `You are VAYRA, an intelligent automotive co-pilot operating as the ${agentConfig.agentName}.
${vehicleInfoStr}

Core Instructions:
1. Tone: Futuristic, expert, concise, authoritative yet approachable.
2. Safety: NEVER claim to definitively diagnose a dangerous mechanical issue. Always structure diagnostic guidance as:
   - Possible Causes
   - Recommended Next Steps
   - Safety Guidance / Professional Inspection Note
3. Format output clearly with clean bullet points and short paragraphs.`;
}

async function callGeminiApi(apiKey, systemPrompt, userMessage, conversation) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const contents = [
    { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }] }
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!res.ok) throw new Error(`Gemini status ${res.status}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callGroqApi(apiKey, systemPrompt, userMessage, conversation) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!res.ok) throw new Error(`Groq status ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

function generateExpertAutomotiveFallback(agentId, message, vehicle) {
  const text = message.toLowerCase();
  const vName = vehicle && vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'your vehicle';

  if (agentId === 'car-care') {
    if (text.includes('shake') || text.includes('vibrat')) {
      return `### VAYRA Symptom Analysis for ${vName}

**Possible Causes:**
1. **Unbalanced or Misaligned Wheels**: Most common when shaking occurs at specific highway speeds (80-110 km/h).
2. **Worn Drivetrain / CV Joints**: Constant velocity joint wear often causes vibration specifically during acceleration.
3. **Uneven Brake Rotor Wear**: If vibration increases heavily when depressing the brake pedal.
4. **Engine Misfire or Spark Plug Wear**: Feels like stuttering/shaking during hard throttle load.

**Recommended Next Steps:**
- Note whether vibration comes from the steering wheel or seat.
- Inspect tire tread depth and check for missing wheel balance weights.
- Schedule a wheel balance and suspension alignment at a certified workshop.`;
    }

    if (text.includes('overheat')) {
      return `### Overheating Diagnostic Guidance for ${vName}

**Possible Causes:**
1. **Low Coolant Level or Leak**: Air locks or physical fluid loss in the radiator system.
2. **Faulty Thermostat**: Stuck in closed position, preventing coolant flow into radiator.
3. **Radiator Fan Failure**: Fails to trigger when idling in traffic.
4. **Water Pump Impeller Failure**: Inability to circulate engine coolant under engine load.

**Safety Guidance:**
- **CRITICAL**: Pull over safely immediately. Turn off engine and DO NOT open radiator cap while hot (risk of severe steam burns).
- Allow engine to cool completely before inspecting coolant reservoir level.`;
    }

    return `### Symptom Analysis for ${vName}

**Possible Causes:**
1. Component wear or alignment variance in key sub-systems.
2. Electrical sensor reading mismatch or throttle response variance.
3. Fluid degradation or filter restriction.

**Recommended Next Steps:**
- Observe under what exact conditions (speed, RPM, temperature) the symptom manifests.
- Scan for diagnostic trouble codes (DTCs) if Check Engine light is illuminated.`;
  }

  if (agentId === 'maintenance') {
    return `### Service Interval Plan for ${vName}

**Standard Interval Checklist:**
- **Engine Oil & Filter Change**: Every 8,000 - 10,000 km (or 12 months, synthetic recommended).
- **Cabin & Engine Air Filters**: Every 15,000 - 20,000 km.
- **Brake Fluid & Inspection**: Every 24 months / 30,000 km.
- **Coolant Flush & Spark Plugs**: Every 60,000 - 90,000 km depending on engine specs.

*Note: Driving conditions (frequent short trips, extreme weather, heavy loads) shorten these intervals.*`;
  }

  if (agentId === 'workshop') {
    return `### Workshop Finder Assistance

To connect you with certified repair facilities specializing in ${vName}:
1. Use our interactive **Workshop Discovery** tool below to locate certified service partners.
2. Filter by service specialization (EV Diagnostic, Brake & Suspension, General Service).
3. Ensure the workshop provides full warranty-backed OEM or equivalent parts replacement.`;
  }

  if (agentId === 'reminder') {
    return `### Service Reminder Engine

You can set automated maintenance milestones for ${vName} directly in your **VAYRA Digital Garage**.
- Set upcoming threshold targets (e.g. Next Oil Service in 5,000 KM).
- VAYRA tracks lifecycle intervals and alerts you before service windows elapse.`;
  }

  // Default vehicle-info
  return `### Vehicle Intelligence Profile: ${vName}

**Overview:**
- **Identity**: ${vehicle ? vehicle.vin : 'Generic Profile'}
- **Power Unit**: ${vehicle ? vehicle.engine : 'Internal Combustion'}
- **Drive Configuration**: ${vehicle ? vehicle.driveType : 'Standard Configuration'}
- **Fuel Specs**: ${vehicle ? vehicle.fuelType : 'Gasoline'}

Ask VAYRA specific questions about maintenance intervals, troubleshooting symptoms, or workshop recommendations for this vehicle.`;
}
