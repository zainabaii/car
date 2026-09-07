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

    // 3. Build VAYRA System Prompt with Automotive Expertise & Exact Clean Markdown Structure
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
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : 'your vehicle';

  return `You are VAYRA AI CAR CARE — an expert automotive diagnostic technician and car care advisor.
Tagline: "Know Your Car. Care Smarter."

VEHICLE CONTEXT:
${hasVehicle ? `Active Vehicle: ${vehicleStr}` : 'No specific vehicle selected in garage. If mentioned in user message, use that exact vehicle name.'}

TONE & STYLE:
Concise, clear, practical, friendly, and expert. Avoid unnecessary fluff or long introductory preambles. Get straight to the answer.

STRICT RESPONSE FORMAT REQUIREMENTS:
You MUST format your output using EXACTLY this Markdown template structure:

### VAYRA Automotive Guidance — ${hasVehicle ? vehicleStr : '[Year Make Model]'}

If your [brief description of symptom, e.g. "AC is blowing warm air"], the most common reasons are:

1. **[Short cause name]** — [Short 1-sentence explanation]
2. **[Short cause name]** — [Short 1-sentence explanation]
3. **[Short cause name]** — [Short 1-sentence explanation]

### You Can Check

* [Safe practical check 1]
* [Safe practical check 2]
* [Safe practical check 3]
* [Safe practical check 4]

### When to Visit a Mechanic

[1-2 concise sentences advising when to see a qualified mechanic or technician.]

**VAYRA:** If you tell me whether [1 targeted follow-up question], I can help narrow down the possible cause.

SAFETY & ACCURACY RULES:
- Never state a guaranteed diagnosis. Always list plausible possibilities.
- Do NOT instruct users to open pressurized lines, hot radiator caps, or undertake dangerous work.`;
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

  // AC / Climate Control Warm Air
  if (text.includes('ac') || text.includes('warm air') || text.includes('air condition') || text.includes('cooling')) {
    return `### VAYRA Automotive Guidance — ${vName}

If your AC is blowing warm air, the most common reasons are:

1. **Low refrigerant** — There may be a small leak in the AC system.
2. **AC compressor problem** — The compressor or its clutch/relay may not be working properly.
3. **Blend door problem** — A door inside the dashboard may be stuck and allowing warm air into the cabin.

### You Can Check

* Make sure the AC is turned on and the blower is working.
* Check whether the air gets cooler while driving.
* Listen for a click from the compressor when you turn the AC on.
* Look for dirt or damage around the condenser at the front of the car.

### When to Visit a Mechanic

If the AC is still blowing warm air, have a qualified AC technician check the refrigerant level, compressor, and system for leaks.

**VAYRA:** If you tell me whether the AC gets cooler while driving and whether you hear a click when you turn it on, I can help narrow down the possible cause.`;
  }

  // Shaking on acceleration
  if (text.includes('shake') || text.includes('vibrat')) {
    return `### VAYRA Automotive Guidance — ${vName}

If your car is shaking when you accelerate, the most common reasons are:

1. **Inner CV joint wear** — Worn constant velocity joints on the drive axles can cause shaking under acceleration.
2. **Unbalanced wheels** — Imbalanced wheels or tire damage can create rotational vibration at speed.
3. **Engine misfire** — Worn spark plugs or failing ignition coils cause uneven engine firing under throttle load.

### You Can Check

* Note whether the vibration is felt through the steering wheel or the seat.
* Check if the Check Engine light is on or flashing during acceleration.
* Inspect tire pressures and check tread surfaces for visible bulges.
* Observe if the shaking stops immediately when you release the gas pedal.

### When to Visit a Mechanic

If the shaking continues, have a technician inspect your CV axles, wheel balance, and ignition system.

**VAYRA:** If you tell me whether the vibration is felt in the steering wheel or seat, and whether the Check Engine light is on, I can help narrow down the cause.`;
  }

  // Overheating
  if (text.includes('overheat') || text.includes('hot') || text.includes('temperature')) {
    return `### VAYRA Automotive Guidance — ${vName}

If your engine is overheating, the most common reasons are:

1. **Low coolant level** — A leak in the radiator, hoses, or water pump prevents proper cooling.
2. **Stuck thermostat** — A thermostat stuck closed blocks coolant flow into the radiator.
3. **Radiator fan failure** — A failed cooling fan motor or relay stops airflow when idling.

### You Can Check

* **PULL OVER SAFELY IMMEDIATELY**: Turn off the engine to prevent severe damage.
* DO NOT open the radiator cap while the engine is hot.
* Once cooled down, check the coolant level in the plastic overflow reservoir.
* Look under the car for liquid leaks (green, pink, or orange fluid).

### When to Visit a Mechanic

If your engine temperature rises above normal, have a qualified technician check the cooling system immediately.

**VAYRA:** If you tell me whether the temperature spikes while idling or while driving, I can help narrow down the cause.`;
  }

  // Default fallback
  return `### VAYRA Automotive Guidance — ${vName}

If you are experiencing unexpected vehicle symptoms, the most common reasons are:

1. **Sensor or electrical variance** — Faulty sensor signals can trigger performance issues.
2. **Restricted filters or fluids** — Clogged air, fuel, or cabin filters reduce operating efficiency.
3. **Mechanical component wear** — Normal wear on spark plugs, belts, or brake pads over time.

### You Can Check

* Check your dashboard for active warning lights (Check Engine, ABS, Battery).
* Inspect fluid levels (engine oil, coolant, brake fluid) when parked on level ground.
* Listen for unusual clicking, squeaking, or grinding noises while driving.

### When to Visit a Mechanic

If warning lights are present or symptoms persist, have a certified technician perform a diagnostic scan.

**VAYRA:** If you share the exact symptoms and warning lights on your dash, I can give you more specific guidance.`;
}
