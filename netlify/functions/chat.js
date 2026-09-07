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
    const { message = '', vehicle = null, conversation = [] } = payload;

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Message cannot be empty.' })
      };
    }

    // 1. Determine Agent Badge & Role
    const agentConfig = determineSpecializedAgent(message);

    // 2. Build VAYRA System Prompt with Automotive Expertise & Vehicle Context
    const systemPrompt = buildVayraSystemPrompt(vehicle);

    // 3. API Keys from Environment Variables ONLY
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

function buildVayraSystemPrompt(vehicle) {
  let vehicleDetails = "No specific vehicle selected by user yet. Ask user for Make, Model, Year, or VIN if needed to give specific advice.";
  
  if (vehicle && (vehicle.make || vehicle.model || vehicle.vin)) {
    vehicleDetails = `
Active Vehicle Context:
- Make: ${vehicle.make || 'Unknown'}
- Model: ${vehicle.model || 'Unknown'}
- Year: ${vehicle.year || 'Unknown'}
- VIN: ${vehicle.vin || 'N/A'}
- Engine: ${vehicle.engine || 'N/A'}
- Fuel Type: ${vehicle.fuelType || 'Gasoline/Unknown'}
- Transmission: ${vehicle.transmission || 'N/A'}
- Vehicle Type: ${vehicle.vehicleType || vehicle.bodyClass || 'N/A'}
`.trim();
  }

  return `You are VAYRA AI CAR CARE — an intelligent automotive co-pilot and diagnostic advisor.
Tagline: "Know Your Car. Care Smarter."

${vehicleDetails}

TONE & PERSONALITY:
- Professional, intelligent, friendly, calm, concise, and highly knowledgeable about automotive systems.
- Explain complex car issues clearly so everyday car owners can understand easily.

CRITICAL SAFETY & DIAGNOSTIC RULES:
1. NEVER claim to make a definitive or guaranteed mechanical diagnosis.
2. ALWAYS use prudent phrases such as:
   - "Possible causes include..."
   - "Based on these symptoms..."
   - "I recommend having a qualified mechanic inspect..."
3. DANGEROUS SYMPTOMS SAFETY PROTOCOL:
   If the user reports dangerous symptoms (such as brake failure, severe overheating, smoke, fuel leaks, loss of steering control, oil pressure warning light, or severe engine knocking):
   - Explicitly urge stopping the vehicle safely as soon as possible.
   - Recommend turning off the engine and seeking immediate professional mechanic or towing assistance.

FORMATTING:
- Structure your response using clean Markdown headers and bullet points.
- Provide clear possible causes and recommended next steps.`;
}

// Intent Classification Engine for UI Badging
function determineSpecializedAgent(message) {
  const text = message.toLowerCase();

  if (text.includes('shake') || text.includes('vibrat') || text.includes('overheat') || text.includes('noise') || text.includes('smoke') || text.includes('leak') || text.includes('smell') || text.includes('symptom') || text.includes('check engine') || text.includes('start') || text.includes('brake') || text.includes('knock')) {
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
      temperature: 0.4,
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
          temperature: 0.4,
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

  if (text.includes('shake') || text.includes('vibrat')) {
    return `### VAYRA Symptom Analysis for ${vName}

**Possible Causes Include:**
1. **Unbalanced Wheels or Misalignment**: Often noticeable in steering wheel vibration at highway speeds (80-110 km/h).
2. **Worn CV Axle / Driveshaft Joint**: Acceleration-specific shaking frequently points to inner constant velocity (CV) joint wear.
3. **Engine Misfire**: Worn spark plugs or ignition coils causing shudder under load.
4. **Worn Suspension Bushings**: Loose control arm bushings causing wheel shimmy.

**Recommended Next Steps:**
- Note whether the vibration comes from steering wheel or seat.
- Have a certified workshop perform a wheel balance, suspension, and CV axle check.

*I recommend having a qualified mechanic inspect the vehicle to verify exact cause.*`;
  }

  if (text.includes('overheat')) {
    return `### Overheating Diagnostic Guidance for ${vName}

**Possible Causes Include:**
1. **Low Coolant or System Leak**: Radiator hose leaks, water pump seal failure, or radiator crack.
2. **Stuck Thermostat**: Thermostat failing to open, preventing coolant from circulating.
3. **Radiator Fan Failure**: Electric cooling fan motor or relay failure.
4. **Water Pump Impeller Failure**: Loss of coolant circulation.

**CRITICAL SAFETY GUIDANCE:**
- **PULL OVER SAFELY IMMEDIATELY**: Turn off the engine. 
- **DO NOT OPEN RADIATOR CAP WHILE HOT**: Severe steam and scalding fluid hazard.
- Allow engine to cool down completely before checking coolant reservoir level. Seek professional towing or mechanic assistance.`;
  }

  return `### VAYRA Automotive Guidance for ${vName}

**Possible Causes Include:**
1. Component wear or alignment variance in key mechanical systems.
2. Sensor calibration offset or electronic control module variance.
3. Fluid degradation or filter restriction.

**Recommended Next Steps:**
- Note exact conditions (engine speed, temperature, vehicle load) when symptoms occur.
- Have a qualified mechanic perform a diagnostic scan and physical inspection.`;
}
