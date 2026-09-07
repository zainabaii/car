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

    // 3. Build VAYRA System Prompt focused strictly on CURRENT user message
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
    : null;

  return `You are VAYRA, a friendly automotive assistant for a car website.
Tagline: "Know Your Car. Care Smarter."

VEHICLE INFORMATION:
${hasVehicle ? `Customer's Vehicle: ${vehicleStr} (Engine: ${vehicle.engine || 'N/A'}, VIN: ${vehicle.vin || 'N/A'})` : 'No specific vehicle selected in garage. If mentioned in prompt, reference that vehicle directly.'}

VERY IMPORTANT CONTEXT RULE — ANSWER THE CURRENT QUESTION:
- Always read and respond specifically to the problem described in the customer's LATEST/CURRENT message.
- NEVER repeat a previous answer if the customer changes symptoms or asks about a different problem.
- If the customer switches topics (e.g. from AC to brakes, battery to tire pressure, or overheating to shaking/vibration), COMPLETELY change your answer to match the new problem.
- Never use AC guidance for overheating. Never use battery guidance for shaking or tires. Never use brake guidance for starting issues.

HOW TO ANSWER:
1. Identify the main problem in the CURRENT message and list 2–3 most likely possible causes.
2. Explain them in simple, clear language without complicated mechanical jargon. Use words such as "may," "could," and "possible".
3. Give 2–4 safe things the customer can check.
4. Ask 1 or 2 useful follow-up questions to help narrow down the cause.
5. Tell the customer when they should see a qualified mechanic.
6. Keep normal answers short and easy to understand — preferably 4 to 8 sentences total.
7. If vehicle information is missing, give general guidance and ask for the year, make, and model when useful.

CRITICAL SAFETY RULES:
- If the problem could be dangerous (e.g. Engine Overheating, Brake Failure, Flashing Check Engine Light, Oil Warning Light, Steering Loss, Fuel Leak), clearly advise stopping the vehicle safely and getting professional help.
- NEVER tell customers to open a hot radiator cap, handle pressurized refrigerant/fuel, work under a vehicle supported only by a jack, work near moving belts/fans, or disable safety systems.

DISCLAIMER REQUIREMENT:
VAYRA provides general automotive guidance and does not replace a qualified mechanic's diagnosis.`;
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

  // Pass conversation history but explicitly prioritize current user query
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

  contents.push({
    role: 'user',
    parts: [{ text: `[IMPORTANT DIRECTIVE: Answer the problem described in this latest message. If symptom changed, switch topic completely!]\n\nCurrent Customer Message: ${userMessage}` }]
  });

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500
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

  messages.push({
    role: 'user',
    content: `[IMPORTANT DIRECTIVE: Answer the problem described in this latest message. If symptom changed, switch topic completely!]\n\nCurrent Customer Message: ${userMessage}`
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
          temperature: 0.2,
          max_tokens: 500
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
// EXPERT AUTOMOTIVE FALLBACK ENGINE (12 Categories)
// -----------------------------------------------------------------------------
function generateExpertAutomotiveFallback(agentId, message, vehicle) {
  const text = message.toLowerCase();
  const vName = vehicle && vehicle.make ? `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim() : 'your vehicle';

  // 1. AC Not Cooling
  if (text.includes('ac') || text.includes('warm air') || text.includes('air condition') || text.includes('cooling')) {
    return `Your ${vName} AC may not be cooling because of low refrigerant or a refrigerant leak, an AC compressor or clutch problem, a dirty/blocked condenser, or a blend-door/HVAC issue. Check whether the air gets colder while driving and whether you hear the AC compressor engage when you turn it on. If it still blows warm air, an AC technician should check the refrigerant and system for leaks.

Does the AC get colder while driving, or is it warm all the time?`;
  }

  // 2. Engine Overheating
  if (text.includes('overheat') || text.includes('hot') || text.includes('temperature') || text.includes('steam')) {
    return `Your ${vName} engine may be overheating because of low coolant, a coolant leak, a radiator or cooling-fan problem, or a thermostat/water-pump issue. If the temperature gauge is in the red or you see steam, safely stop the car and turn off the engine immediately. Do not open the radiator cap while the engine is hot.

Is the temperature warning light on, and do you see any coolant leaking under the car?`;
  }

  // 3. Car Won't Start / Battery
  if (text.includes('start') || text.includes('battery') || text.includes('crank') || text.includes('dead')) {
    return `If your ${vName} won't start, the battery may be weak or dead, the battery connections may be loose or corroded, or the starter motor/alternator may have a problem. If you hear clicking when you try to start the car, the battery could be low. If the battery keeps going dead after being charged, the alternator may need to be checked.

Do you hear clicking when you turn the key or press the start button?`;
  }

  // 4. Check Engine Light
  if (text.includes('check engine') || text.includes('engine light') || text.includes('warning light')) {
    return `A check-engine light can come on for many reasons, from a loose fuel cap to an engine, sensor, ignition, or emissions problem. If the light is steady, you can usually have the car checked soon. If the light is flashing or the engine is running badly, stop driving if it is safe to do so and have it inspected.

Is the check-engine light steady or flashing?`;
  }

  // 5. Brake Problems
  if (text.includes('brake') || text.includes('stopping') || text.includes('squeal') || text.includes('grind')) {
    return `If your brakes feel weak, make grinding or squealing sounds, or the brake pedal feels unusual, the brake pads, fluid, or rotors may need attention. Because brakes are safety-critical, it is best to have them inspected promptly. If the pedal goes to the floor or the car cannot stop normally, do not continue driving.

Does the brake pedal feel soft, hard, or normal?`;
  }

  // 6. Car Shaking or Vibrating
  if (text.includes('shake') || text.includes('vibrat') || text.includes('wobble') || text.includes('shimmy')) {
    return `Car shaking can come from tire balance problems, wheel alignment or uneven tire wear, bent rims, or suspension issues. If the shaking happens mainly at higher speeds through the steering wheel, the front tires and wheels are worth checking first. If it happens mainly while braking, the brake rotors may need inspection.

Does the shaking happen while driving normally, accelerating, or braking?`;
  }

  // 7. Oil Warning Light
  if (text.includes('oil light') || text.includes('oil warning') || text.includes('oil pressure')) {
    return `If the oil warning light comes on, safely stop the vehicle and check the engine oil level if you can do so safely. Driving with low oil pressure can cause serious engine damage. If the oil level is normal but the warning light remains on, have the vehicle inspected before continuing to drive.

Is the oil warning light staying on while the engine is running?`;
  }

  // 8. Poor Fuel Economy
  if (text.includes('fuel') || text.includes('gas mileage') || text.includes('economy') || text.includes('mpg')) {
    return `Poor fuel economy can be caused by low tire pressure, a dirty air filter, an engine or sensor problem, or driving conditions. Start by checking your tire pressure and whether the check-engine light is on. If fuel consumption suddenly becomes much worse, have the car inspected.

Did the fuel economy get worse suddenly or gradually?`;
  }

  // 9. Strange Noise
  if (text.includes('noise') || text.includes('sound') || text.includes('squeak') || text.includes('rattle') || text.includes('clunk')) {
    return `A strange noise can come from several parts of the car, including the engine, belts, brakes, tires, or suspension. The location and timing of the noise can help narrow it down. If the noise is loud, sudden, or accompanied by a warning light, have the vehicle inspected promptly.

Where does the noise seem to come from, and does it happen while braking, accelerating, or turning?`;
  }

  // 10. Steering Problem
  if (text.includes('steer') || text.includes('power steering') || text.includes('wheel hard')) {
    return `If the steering suddenly becomes very heavy, loose, or difficult to control, there may be a problem with the steering system, tire pressure, or suspension. Because steering is safety-critical, avoid driving the vehicle if you cannot control it normally and have it inspected.

Did the steering problem happen suddenly or gradually?`;
  }

  // 11. Transmission Problems
  if (text.includes('transmission') || text.includes('gear') || text.includes('shift') || text.includes('slip')) {
    return `If your car is slipping, jerking, delaying when changing gears, or making unusual transmission noises, there may be a transmission fluid or component problem. Avoid hard acceleration until the problem is checked. A qualified technician can inspect the transmission and fluid condition.

Does the car jerk, slip, or have trouble changing gears?`;
  }

  // 12. Tire Losing Air / Flat Tire
  if (text.includes('tire') || text.includes('flat') || text.includes('pressure') || text.includes('puncture')) {
    return `If a tire is losing air, it may have a puncture, valve leak, or tire damage. Check the tire pressure and look for obvious damage, but do not drive on a severely underinflated or damaged tire. Have the tire inspected and repaired or replaced if necessary.

How quickly is the tire losing air?`;
  }

  // Default Guidance
  return `If your ${vName} is experiencing an unexpected issue, common causes include minor sensor variances, maintenance items like filters or fluids, or normal component wear over time. You can check your dashboard for warning lights and verify your fluid levels when parked on level ground.

What car do you have, including the year and model, and when does the problem happen — when starting, driving, braking, accelerating, or idling?`;
}
