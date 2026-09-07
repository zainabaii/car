// Netlify Serverless Function: VAYRA AI Car Care (Gemini Primary + Groq Fallback)

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
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { message = '', vehicle: rawVehicle = null, conversation = [] } = payload;

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Message cannot be empty.' })
      };
    }

    // 1. Extract vehicle context from both vehicle object AND message text
    const vehicle = extractVehicleContext(message, rawVehicle);

    // 2. Determine Agent Badge & Role
    const agentConfig = determineSpecializedAgent(message);

    // 3. Build VAYRA System Prompt with Automotive Expertise & Strict Response Formatting
    const systemPrompt = buildVayraSystemPrompt(vehicle, message);

    // 4. API Keys from Environment Variables ONLY
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    let aiResponse = null;
    let providerUsed = null;

    // --- TIER 1: GEMINI (PRIMARY) ---
    if (geminiApiKey && geminiApiKey.trim()) {
      try {
        console.log('Attempting Gemini AI Primary Provider...');
        aiResponse = await callGeminiApi(geminiApiKey.trim(), systemPrompt, message, conversation);
        if (aiResponse) {
          providerUsed = 'gemini';
        }
      } catch (geminiErr) {
        console.warn('Gemini AI Provider failed. Falling back to Groq:', geminiErr.message || geminiErr);
      }
    } else {
      console.warn('GEMINI_API_KEY environment variable is not configured.');
    }

    // --- TIER 2: GROQ (FALLBACK) ---
    if (!aiResponse && groqApiKey && groqApiKey.trim()) {
      try {
        console.log('Attempting Groq AI Fallback Provider...');
        aiResponse = await callGroqApi(groqApiKey.trim(), systemPrompt, message, conversation);
        if (aiResponse) {
          providerUsed = 'groq';
        }
      } catch (groqErr) {
        console.warn('Groq AI Provider failed:', groqErr.message || groqErr);
      }
    } else if (!aiResponse) {
      console.warn('GROQ_API_KEY environment variable is not configured or Groq was skipped.');
    }

    // --- TIER 3: VAYRA EXPERT ENGINE FALLBACK (If APIs down or keys missing) ---
    if (!aiResponse) {
      aiResponse = generateExpertAutomotiveFallback(agentConfig.agentId, message, vehicle);
      providerUsed = 'vayra-expert';
    }

    // Friendly error message if both fail completely or return no content
    if (!aiResponse) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          provider: 'none',
          message: 'VAYRA is temporarily unable to connect to its AI services. Please try again in a moment.',
          reply: 'VAYRA is temporarily unable to connect to its AI services. Please try again in a moment.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        provider: providerUsed,
        message: aiResponse,
        reply: aiResponse,
        agent: {
          id: agentConfig.agentId,
          name: agentConfig.agentName,
          role: agentConfig.agentRole,
          badge: agentConfig.badge
        }
      })
    };

  } catch (err) {
    console.error('VAYRA Chat Handler Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'VAYRA is temporarily unable to connect to its AI services. Please try again in a moment.',
        reply: 'VAYRA is temporarily unable to connect to its AI services. Please try again in a moment.'
      })
    };
  }
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS & API INTEGRATIONS
// -----------------------------------------------------------------------------

function extractVehicleContext(message, existingVehicle) {
  const v = { ...(existingVehicle || {}) };
  
  // Try extracting Year Make Model from prompt text if missing in garage state
  if (!v.make || !v.model || !v.year) {
    const match = message.match(/\b(19[89]\d|20[0-2]\d)\s+([A-Za-z0-9\-]+)\s+([A-Za-z0-9\-]+)/i);
    if (match) {
      if (!v.year) v.year = match[1];
      if (!v.make) v.make = match[2];
      if (!v.model) v.model = match[3];
    }
  }
  return v;
}

function buildVayraSystemPrompt(vehicle, userMessage) {
  const hasVehicle = vehicle && (vehicle.make || vehicle.model);
  const vehicleStr = hasVehicle 
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() + (vehicle.engine ? ` (${vehicle.engine})` : '')
    : 'Vehicle specs not fully specified';

  return `You are VAYRA AI CAR CARE — a master automotive technician and service advisor.
Tagline: "Know Your Car. Care Smarter."

VEHICLE DATA FOR THIS SESSION:
${hasVehicle ? `- Vehicle: ${vehicleStr}\n- VIN: ${vehicle.vin || 'N/A'}\n- Fuel: ${vehicle.fuelType || 'N/A'}\n- Transmission: ${vehicle.transmission || 'N/A'}` : '- No garage vehicle selected. If user mentioned a vehicle in their message, use that.'}

ROLE & PERSONALITY:
You are an experienced, master automotive diagnostic technician. Your answers must be practical, specific, technically useful, concise, understandable to everyday car owners, and safety-conscious.

STRICT ACCURACY & PRUDENCE RULES:
1. NEVER claim a definitive diagnosis. Always use wording such as:
   - "Possible causes include..."
   - "One possibility is..."
   - "Based on these symptoms..."
   - "This would need to be confirmed by physical inspection."
2. NEVER use generic hand-waving placeholders like "component wear", "system variance", "sensor calibration offset", or "fluid degradation" unless you name the EXACT automotive part (e.g., "worn AC compressor clutch relay", "failing water pump impeller", "low R-134a/R-1234yf refrigerant level").
3. DO NOT instruct users to open pressurized AC lines, release refrigerant, open hot radiator caps, or work under a jacked vehicle without jack stands.

MANDATORY RESPONSE STRUCTURE:
You MUST format your response using EXACTLY this Markdown layout:

### VAYRA Automotive Guidance

**Vehicle**
${hasVehicle ? vehicleStr : '[Year Make Model if mentioned, otherwise general guidance for this vehicle type]'}

**What may be happening**
[A 1-2 sentence clear explanation of what is physically happening with the symptom.]

**3 Most Likely Causes**

1. **[Cause Name]**
   - **Why:** [Clear explanation of how this specific part/issue causes the reported symptom for this vehicle.]

2. **[Cause Name]**
   - **Why:** [Clear explanation of how this specific part/issue causes the reported symptom.]

3. **[Cause Name]**
   - **Why:** [Clear explanation of how this specific part/issue causes the reported symptom.]

**What to Check First**
[Provide 2-4 safe, non-invasive, practical checks an ordinary vehicle owner can do safely.]
- [Safe practical check 1]
- [Safe practical check 2]
- [Safe practical check 3]

**When to See a Mechanic**
[Explain clearly when professional tools, manifold pressure gauges, or certified mechanic inspection are required.]

**Follow-Up Questions**
- [Targeted question 1 to narrow down the issue, e.g. "Does the air become colder while driving versus idling?"]
- [Targeted question 2, e.g. "Did this symptom appear suddenly or gradually?"]

Maintain a professional, intelligent, friendly, and calm tone. Keep explanations clear and concise.`;
}

// Intent Classification Engine for UI Badging
function determineSpecializedAgent(message) {
  const text = message.toLowerCase();

  if (text.includes('ac') || text.includes('air condition') || text.includes('warm air') || text.includes('heat') || text.includes('shake') || text.includes('vibrat') || text.includes('overheat') || text.includes('noise') || text.includes('smoke') || text.includes('leak') || text.includes('smell') || text.includes('symptom') || text.includes('check engine') || text.includes('start') || text.includes('brake') || text.includes('knock')) {
    return {
      agentId: 'car-care',
      agentName: 'VAYRA Car Care Agent',
      agentRole: 'Automotive Diagnostics & Symptom Analyzer',
      badge: 'CARE AGENT'
    };
  }

  if (text.includes('service') || text.includes('oil') || text.includes('interval') || text.includes('maintenance') || text.includes('filter') || text.includes('fluid') || text.includes('belt') || text.includes('spark plug') || text.includes('schedule') || text.includes('km') || text.includes('miles')) {
    return {
      agentId: 'maintenance',
      agentName: 'VAYRA Maintenance Agent',
      agentRole: 'Vehicle Service Planning & Intervals',
      badge: 'MAINTENANCE AGENT'
    };
  }

  if (text.includes('workshop') || text.includes('mechanic') || text.includes('garage') || text.includes('repair shop') || text.includes('near me') || text.includes('find') || text.includes('dealer')) {
    return {
      agentId: 'workshop',
      agentName: 'VAYRA Workshop Finder Agent',
      agentRole: 'Service Center & Repair Network Locator',
      badge: 'WORKSHOP AGENT'
    };
  }

  if (text.includes('remind') || text.includes('notification') || text.includes('due') || text.includes('calendar') || text.includes('track')) {
    return {
      agentId: 'reminder',
      agentName: 'VAYRA Service Reminder Agent',
      agentRole: 'Automotive Lifecycle & Milestone Tracker',
      badge: 'REMINDER AGENT'
    };
  }

  return {
    agentId: 'vehicle-info',
    agentName: 'VAYRA Co-Pilot Agent',
    agentRole: 'Automotive Intelligence Specialist',
    badge: 'CARE AGENT'
  };
}

// -----------------------------------------------------------------------------
// CALL GEMINI API (PRIMARY)
// -----------------------------------------------------------------------------
async function callGeminiApi(apiKey, systemPrompt, userMessage, conversation) {
  const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

  const contents = [];

  // Convert previous conversation turns for Gemini
  if (Array.isArray(conversation)) {
    for (const msg of conversation) {
      if (!msg || !msg.text) continue;
      if (msg.id === 'msg-1' || msg.text.includes('Hello! I am VAYRA')) continue;

      const role = (msg.sender === 'user') ? 'user' : 'model';
      contents.push({
        role,
        parts: [{ text: msg.text }]
      });
    }
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };

  let lastErr = null;

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${modelName} HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      console.warn(`Gemini model ${modelName} call failed:`, err.message);
    }
  }

  throw lastErr || new Error('All Gemini models failed.');
}

// -----------------------------------------------------------------------------
// CALL GROQ API (FALLBACK)
// -----------------------------------------------------------------------------
async function callGroqApi(apiKey, systemPrompt, userMessage, conversation) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const modelsToTry = ['groq/compound', 'groq/compound-mini', 'openai/gpt-oss-20b'];

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Convert previous conversation turns for Groq / OpenAI format
  if (Array.isArray(conversation)) {
    for (const msg of conversation) {
      if (!msg || !msg.text) continue;
      if (msg.id === 'msg-1' || msg.text.includes('Hello! I am VAYRA')) continue;

      const role = (msg.sender === 'user') ? 'user' : 'assistant';
      messages.push({
        role,
        content: msg.text
      });
    }
  }

  // Append current user message
  messages.push({
    role: 'user',
    content: userMessage
  });

  let lastErr = null;

  for (const modelName of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: 0.3,
          max_tokens: 1024
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Groq ${modelName} HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      console.warn(`Groq model ${modelName} call failed:`, err.message);
    }
  }

  throw lastErr || new Error('All Groq models failed.');
}

// -----------------------------------------------------------------------------
// EXPERT AUTOMOTIVE FALLBACK ENGINE
// -----------------------------------------------------------------------------
function generateExpertAutomotiveFallback(agentId, message, vehicle) {
  const text = message.toLowerCase();
  const vName = vehicle && vehicle.make ? `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim() : 'your vehicle';

  // AC / Climate Control Warm Air Symptom
  if (text.includes('ac') || text.includes('warm air') || text.includes('air condition') || text.includes('cooling')) {
    return `### VAYRA Automotive Guidance

**Vehicle**
${vName}

**What may be happening**
The air conditioning system is blowing warm or ambient cabin air instead of cold air because refrigerant pressure is low or the compressor heat exchange cycle is not engaging properly.

**3 Most Likely Causes**

1. **Low Refrigerant Level (System Leak)**
   - **Why:** A micro-leak in the AC condenser, Schrader valves, or O-rings lowers refrigerant pressure. Modern AC systems have a low-pressure cutoff switch that prevents the compressor from engaging when refrigerant drops below threshold.

2. **AC Compressor Relay or Clutch Failure**
   - **Why:** If the AC compressor electromagnetic clutch or relay fails, the pulley spins freely without driving the internal pistons to compress refrigerant.

3. **HVAC Blend Door Actuator Issue**
   - **Why:** The blend door motor controls the mixing flap inside your dashboard. If stuck in the "heat" position, engine coolant heat mixes into cabin air even when the AC button is pressed.

**What to Check First**
- Check whether the AC blower fan is blowing air forcefully on all speed settings.
- Observe if the cabin air feels colder while driving at highway speeds versus idling in traffic.
- Visually inspect the front radiator/condenser area for oily residue, bent fins, or heavy debris blockage.
- Listen under the hood with AC turned ON to hear if the compressor clutch clicks and engages.

**When to See a Mechanic**
A certified technician should hook up a dual manifold gauge set to test high/low side R-134a or R-1234yf system pressures and perform a dye/electronic leak test.

**Follow-Up Questions**
- Does the AC air become slightly cooler when driving at higher speeds?
- Do you hear a clicking sound or engine RPM change when you press the AC button?`;
  }

  // Acceleration Shaking Symptom
  if (text.includes('shake') || text.includes('vibrat')) {
    return `### VAYRA Automotive Guidance

**Vehicle**
${vName}

**What may be happening**
Vibration during acceleration typically indicates rotational imbalance or torque transmission instability in the drivetrain or suspension.

**3 Most Likely Causes**

1. **Worn Inner CV Joint / Axle Assembly**
   - **Why:** Inner Constant Velocity (CV) joints absorb engine torque. Pitting inside the CV spider bearing causes rhythmic shuddering specifically under throttle load.

2. **Unbalanced Wheels or Tire Belt Separation**
   - **Why:** Wheel weight displacement or internal tire tread belt separation causes rotational vibration, usually most noticeable at speeds above 80 km/h (50 mph).

3. **Engine Misfire / Ignition Coil Wear**
   - **Why:** An engine misfiring on one cylinder under load creates torque pulses that feel like a shudder or vibration during acceleration.

**What to Check First**
- Note whether the vibration comes through the steering wheel (front wheels/axles) or floorboard/seat (rear drivetrain/tires).
- Check if the Check Engine Light flashes or illuminates during heavy acceleration.
- Check tire pressures and inspect tread surfaces for uneven cupping or bulges.

**When to See a Mechanic**
Have a workshop inspect CV boots for torn rubber/grease sling and perform a high-speed wheel balance and suspension check.

**Follow-Up Questions**
- Does the vibration vanish the moment you lift your foot off the gas pedal?
- Is the Check Engine Light illuminated on your dashboard?`;
  }

  // Overheating Symptom
  if (text.includes('overheat') || text.includes('temperature') || text.includes('hot')) {
    return `### VAYRA Automotive Guidance

**Vehicle**
${vName}

**What may be happening**
The engine is generating more thermal energy than the cooling system can absorb and dissipate through the radiator.

**3 Most Likely Causes**

1. **Low Coolant Level or System Leak**
   - **Why:** Leaks in radiator hoses, water pump seals, or heater core lower the coolant fluid volume, creating air pockets that block heat transfer.

2. **Stuck Thermostat**
   - **Why:** If the wax pellet thermostat fails in the closed position, coolant is trapped in the engine block and cannot flow through the radiator to cool down.

3. **Radiator Cooling Fan Failure**
   - **Why:** Electric radiator fans pull ambient air across condenser/radiator fins. If the fan motor or relay fails, overheating occurs rapidly when idling or in traffic.

**What to Check First**
- **CRITICAL SAFETY NOTE**: Pull over safely and turn off engine immediately. DO NOT open the radiator cap while the engine is hot!
- Check the plastic coolant overflow reservoir tank level after the engine cools completely.
- Look under the vehicle for puddles of sweet-smelling green, pink, or orange fluid.

**When to See a Mechanic**
Immediate professional inspection or towing is recommended to prevent head gasket warping or severe engine cylinder block damage.

**Follow-Up Questions**
- Does the temperature gauge spike when stopped in traffic or while driving up hills?
- Is steam or sweet-smelling vapor visible under the hood?`;
  }

  // Default Guidance Structure
  return `### VAYRA Automotive Guidance

**Vehicle**
${vName}

**What may be happening**
Possible variance in mechanical, electrical, or fluid management systems affecting normal operating behavior.

**3 Most Likely Causes**

1. **Electrical / Sensor Signal Variance**
   - **Why:** Sensor reading mismatches (e.g. MAF, O2, or throttle position sensors) alter engine management calculations.

2. **Fluid Degradation or Filter Restriction**
   - **Why:** Restricted air, fuel, or oil filters reduce operating efficiency under load.

3. **Mechanical Component Wear**
   - **Why:** Friction surface wear or bushing alignment variance over extended service intervals.

**What to Check First**
- Check for warning lights (Check Engine, ABS, Battery) on the instrument cluster.
- Inspect fluid levels (engine oil, brake fluid, coolant) on level ground.
- Listen for unusual mechanical noises or pitch changes while operating.

**When to See a Mechanic**
Schedule a diagnostic scan to retrieve active diagnostic trouble codes (DTCs) from the vehicle ECM/PCM.

**Follow-Up Questions**
- Under what specific speed, RPM, or engine temperature conditions does this symptom occur?
- Did the symptom start suddenly or develop gradually over time?`;
}
