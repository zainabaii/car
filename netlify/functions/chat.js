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

    // 2. Determine current topic category + strip history if topic switched
    const agentConfig = determineSpecializedAgent(message);
    const currentTopic = classifyTopic(message);
    const filteredConversation = filterConversationByTopic(conversation, currentTopic);

    // 3. Build VAYRA System Prompt — topic-aware, focused on current message
    const systemPrompt = buildVayraSystemPrompt(vehicle, currentTopic);

    // 4. API Keys from Environment Variables ONLY
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    let aiResponse = null;
    let providerUsed = null;

    // --- TIER 1: GEMINI (PRIMARY) ---
    if (geminiApiKey && geminiApiKey.trim()) {
      try {
        console.log('Attempting Gemini AI Primary Provider...');
        aiResponse = await callGeminiApi(geminiApiKey.trim(), systemPrompt, message, filteredConversation);
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
        aiResponse = await callGroqApi(groqApiKey.trim(), systemPrompt, message, filteredConversation);
        if (aiResponse) {
          providerUsed = 'groq';
        }
      } catch (groqErr) {
        console.warn('Groq AI Provider failed:', groqErr.message || groqErr);
      }
    } else if (!aiResponse) {
      console.warn('GROQ_API_KEY environment variable is not configured or Groq was skipped.');
    }

    // --- TIER 3: VAYRA EXPERT ENGINE FALLBACK ---
    if (!aiResponse) {
      aiResponse = generateExpertAutomotiveFallback(currentTopic, message, vehicle);
      providerUsed = 'vayra-expert';
    }

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
// TOPIC CLASSIFICATION — Identifies which of the 12 categories the current
// message belongs to, so conversation history from other topics is discarded.
// -----------------------------------------------------------------------------

const TOPIC_PATTERNS = {
  ac:           /\b(ac|a\.c\.|air.?cond|warm air|cold air|cooling|refrigerant|blower|hvac)\b/i,
  overheating:  /\b(overheat|engine hot|temperature|temp gauge|coolant|radiator|steam|boiling)\b/i,
  battery:      /\b(won.?t start|doesn.?t start|dead battery|battery|crank|no start|click|jump.?start|alternator|starter)\b/i,
  checkengine:  /\b(check engine|engine light|warning light|cel|obd|diagnostic)\b/i,
  brakes:       /\b(brake|braking|squeal|grind|pedal|stop|abs)\b/i,
  shaking:      /\b(shak|vibrat|wobble|shimmy|judder|trembl)\b/i,
  oil:          /\b(oil (warning|light|pressure|level)|low oil|oil lamp)\b/i,
  fuel:         /\b(fuel economy|gas mileage|mpg|km.?l|fuel consumption|drinking fuel)\b/i,
  noise:        /\b(noise|sound|squeak|rattle|clunk|knock|bang|hiss|hum|click)\b/i,
  steering:     /\b(steer|power steering|hard to turn|wheel pull|wheel drift)\b/i,
  transmission: /\b(transmiss|gear|shift|slip|jerk|hesitat|delay|gearbox|clutch)\b/i,
  tire:         /\b(tire|tyre|flat|puncture|losing air|tread|rim|wheel pressure)\b/i,
};

function classifyTopic(message) {
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(message)) return topic;
  }
  return 'general';
}

function filterConversationByTopic(conversation, currentTopic) {
  if (!Array.isArray(conversation) || conversation.length === 0) return [];

  // Keep only messages that are about the same topic as the current message.
  // This prevents a previous AC exchange from contaminating a brakes question.
  const related = conversation.filter(msg => {
    if (!msg || !msg.text) return false;
    if (msg.id === 'msg-1' || msg.text.includes('Hello! I am VAYRA')) return false;
    const msgTopic = classifyTopic(msg.text);
    // Keep if same topic, or if classified as 'general' (informational exchange)
    return msgTopic === currentTopic || msgTopic === 'general';
  });

  // Return at most the last 4 on-topic messages to avoid over-anchoring
  return related.slice(-4);
}

// -----------------------------------------------------------------------------
// VEHICLE EXTRACTION
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

// -----------------------------------------------------------------------------
// SYSTEM PROMPT — Topic-focused, short, conversational
// -----------------------------------------------------------------------------

function buildVayraSystemPrompt(vehicle, currentTopic) {
  const hasVehicle = vehicle && (vehicle.make || vehicle.model);
  const vehicleStr = hasVehicle 
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : null;

  // Topic-specific guidance baked into the prompt so the AI knows what category it's in
  const topicGuidance = {
    ac:           `The customer is asking about AC or air conditioning. Possible causes: low refrigerant/leak, compressor or clutch problem, blocked condenser, blend-door/HVAC issue. Safe checks: listen for compressor click when AC is on, note if air gets colder at highway speed. Recommend AC technician if warm air persists.`,
    overheating:  `The customer is asking about engine overheating. Possible causes: low coolant, coolant leak, radiator or cooling-fan failure, thermostat or water pump problem. SAFETY: If temperature gauge is in red or there is steam, tell customer to safely stop the vehicle immediately and do NOT open the radiator cap while hot.`,
    battery:      `The customer is asking about a car that won't start. Possible causes: weak/dead battery, loose or corroded battery connections, failing alternator, starter motor problem. Ask if they hear clicking when starting, and if dashboard lights come on.`,
    checkengine:  `The customer is asking about the check engine light. Possible causes: sensor issue, ignition problem, fuel/air ratio issue, emissions system. If light is flashing or engine runs very badly, advise stopping safely and getting professional help immediately.`,
    brakes:       `The customer is asking about brakes. Possible causes: worn brake pads, low brake fluid, damaged brake rotors. SAFETY: If brake pedal is soft/goes to the floor, or car cannot stop normally, advise NOT driving and seeking immediate professional inspection or towing.`,
    shaking:      `The customer is asking about car shaking or vibration. Possible causes: wheel imbalance, uneven/damaged tire, bent rim, wheel alignment issue, suspension problem. If shaking is felt through the steering wheel at 80–120 km/h, front tires and wheel balance should be checked first. Ask what speed the shaking starts and whether it is felt in the steering wheel or whole car.`,
    oil:          `The customer is asking about the oil warning light. Possible causes: low engine oil, oil leak, low oil pressure, oil pump issue. Advise safely stopping the vehicle immediately as driving with low oil pressure causes severe engine damage.`,
    fuel:         `The customer is asking about poor fuel economy. Possible causes: low tire pressure, dirty air filter, engine/sensor problem, driving conditions. Ask if the drop was sudden or gradual.`,
    noise:        `The customer is asking about a strange noise. Possible causes: engine/belt problem, brake issue, tire/wheel problem, suspension. Ask where the noise comes from and whether it happens while accelerating, braking, turning, or idling.`,
    steering:     `The customer is asking about a steering problem. Possible causes: low power-steering fluid (if applicable), steering system problem, tire pressure issue, suspension/alignment issue. SAFETY: If steering is very heavy, loose, or out of control, advise not driving and having it inspected.`,
    transmission: `The customer is asking about a transmission problem. Possible causes: low/old transmission fluid, transmission component fault, sensor/electrical issue, clutch problem on manual vehicles. Ask if the car is jerking, slipping, or delaying when changing gears.`,
    tire:         `The customer is asking about a tire losing air or going flat. Possible causes: nail/puncture, valve stem leak, tire sidewall damage, normal slow air loss. Advise not to drive on a severely underinflated or damaged tire.`,
    general:      `The customer has a general vehicle question. Give helpful, friendly guidance and ask for year, make, and model if it would make the answer more specific.`,
  };

  const topicContext = topicGuidance[currentTopic] || topicGuidance.general;

  return `You are VAYRA, a friendly automotive assistant for a car website.
Tagline: "Know Your Car. Care Smarter."

VEHICLE: ${hasVehicle ? vehicleStr + ` (Engine: ${vehicle.engine || 'N/A'})` : 'Not specified — reference any vehicle details the customer mentions in their message.'}

CURRENT TOPIC CONTEXT:
${topicContext}

RESPONSE RULES:
- Answer ONLY the problem in the customer's current message. Do NOT reference, repeat, or blend answers from previous topics.
- Keep the reply short and friendly — 4 to 8 sentences.
- Use simple language. Explain technical terms briefly if used.
- Use words like "may", "could", and "possible" — never claim a confirmed diagnosis.
- Ask 1–2 useful follow-up questions.
- Tell the customer when they need a qualified mechanic.
- NEVER instruct customers to open a hot radiator cap, handle pressurized refrigerant, work under a jacked car, or disable safety systems.

VAYRA provides general automotive guidance and does not replace a qualified mechanic's diagnosis.`;
}

// -----------------------------------------------------------------------------
// AGENT BADGE CLASSIFICATION
// -----------------------------------------------------------------------------

function determineSpecializedAgent(message) {
  const topic = classifyTopic(message);
  const badgeMap = {
    ac: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    overheating: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    battery: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    checkengine: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    brakes: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    shaking: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    oil: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    fuel: { agentId: 'maintenance', agentName: 'VAYRA Maintenance Agent', agentRole: 'Vehicle Service Planning & Intervals', badge: 'MAINTENANCE AGENT' },
    noise: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    steering: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    transmission: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    tire: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
  };

  // Also check for maintenance/workshop/reminder keywords
  const text = message.toLowerCase();
  if (text.includes('service') || text.includes('maintenance') || text.includes('schedule') || text.includes('interval') || text.includes('oil change') || text.includes('filter') || text.includes('spark plug')) {
    return { agentId: 'maintenance', agentName: 'VAYRA Maintenance Agent', agentRole: 'Vehicle Service Planning & Intervals', badge: 'MAINTENANCE AGENT' };
  }
  if (text.includes('workshop') || text.includes('repair shop') || text.includes('near me') || text.includes('mechanic')) {
    return { agentId: 'workshop', agentName: 'VAYRA Workshop Finder Agent', agentRole: 'Service Center & Repair Network Locator', badge: 'WORKSHOP AGENT' };
  }
  if (text.includes('remind') || text.includes('notification') || text.includes('due date') || text.includes('calendar')) {
    return { agentId: 'reminder', agentName: 'VAYRA Service Reminder Agent', agentRole: 'Automotive Lifecycle & Milestone Tracker', badge: 'REMINDER AGENT' };
  }

  return badgeMap[topic] || { agentId: 'vehicle-info', agentName: 'VAYRA Co-Pilot Agent', agentRole: 'Automotive Intelligence Specialist', badge: 'CARE AGENT' };
}

// -----------------------------------------------------------------------------
// CALL GEMINI API (PRIMARY)
// -----------------------------------------------------------------------------
async function callGeminiApi(apiKey, systemPrompt, userMessage, filteredConversation) {
  const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

  const contents = [];

  // Only include topic-relevant conversation history
  for (const msg of filteredConversation) {
    if (!msg || !msg.text) continue;
    const role = (msg.sender === 'user') ? 'user' : 'model';
    contents.push({ role, parts: [{ text: msg.text }] });
  }

  // Current message — clearly marked as the NEW question to answer
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.2, maxOutputTokens: 500 }
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
      if (text && text.trim()) return text.trim();
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
async function callGroqApi(apiKey, systemPrompt, userMessage, filteredConversation) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const modelsToTry = ['groq/compound', 'groq/compound-mini', 'openai/gpt-oss-20b'];

  const messages = [{ role: 'system', content: systemPrompt }];

  for (const msg of filteredConversation) {
    if (!msg || !msg.text) continue;
    const role = (msg.sender === 'user') ? 'user' : 'assistant';
    messages.push({ role, content: msg.text });
  }

  messages.push({ role: 'user', content: userMessage });

  let lastErr = null;

  for (const modelName of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, messages, temperature: 0.2, max_tokens: 500 }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Groq ${modelName} HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (text && text.trim()) return text.trim();
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
function generateExpertAutomotiveFallback(topic, message, vehicle) {
  const vName = vehicle && vehicle.make ? `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim() : 'your vehicle';

  const responses = {
    ac: `Your ${vName} AC may not be cooling because of low refrigerant or a refrigerant leak, an AC compressor or clutch problem, or a blocked condenser. Check whether the air gets colder while driving and whether you hear a click when you turn the AC on. If it still blows warm air, an AC technician should check the refrigerant and system for leaks.\n\nDoes the AC get colder while driving, or is it warm all the time?`,

    overheating: `Your ${vName} engine may be overheating because of low coolant, a coolant leak, a radiator or cooling-fan problem, or a thermostat/water-pump issue. If the temperature gauge is in the red or you see steam, safely stop the car and turn off the engine immediately. Do not open the radiator cap while the engine is hot.\n\nIs the temperature warning light on, and do you see any coolant leaking under the car?`,

    battery: `If your ${vName} won't start, the battery may be weak or dead, the battery connections may be loose or corroded, or the starter/alternator may have a problem. If you hear clicking when you try to start the car, the battery could be low. If the battery keeps going dead after being charged, the alternator may need to be checked.\n\nDo you hear clicking when you turn the key or press the start button?`,

    checkengine: `A check-engine light on your ${vName} can come on for many reasons, from a loose fuel cap to an engine, sensor, ignition, or emissions problem. If the light is steady, you can usually have the car checked soon. If the light is flashing or the engine is running badly, stop driving if it is safe and have it inspected.\n\nIs the check-engine light steady or flashing?`,

    brakes: `If your ${vName} brakes feel weak, make grinding or squealing sounds, or the brake pedal feels unusual, the brake pads, fluid, or rotors may need attention. Because brakes are safety-critical, it is best to have them inspected promptly. If the pedal goes to the floor or the car cannot stop normally, do not continue driving.\n\nDoes the brake pedal feel soft, hard, or normal?`,

    shaking: `High-speed shaking on your ${vName} is most often caused by wheel imbalance, uneven or damaged tires, a bent rim, or a wheel alignment problem. If the shaking is mainly felt through the steering wheel at 80–100 km/h, the front tires and wheel balance should be checked first. A tire shop can do a balance check quickly and at low cost.\n\nDoes the shaking happen while driving normally, while accelerating, or while braking?`,

    oil: `If the oil warning light is on in your ${vName}, safely stop the vehicle and check the engine oil level if you can do so safely. Driving with low oil pressure can cause serious engine damage. If the oil level is normal but the warning light remains on, have the vehicle inspected before continuing to drive.\n\nIs the oil warning light staying on while the engine is running?`,

    fuel: `Poor fuel economy on your ${vName} can be caused by low tire pressure, a dirty air filter, an engine or sensor problem, or driving conditions. Start by checking your tire pressure and whether the check-engine light is on. If fuel consumption suddenly became much worse, have the car inspected.\n\nDid the fuel economy get worse suddenly or gradually?`,

    noise: `A strange noise from your ${vName} can come from the engine, belts, brakes, tires, or suspension. The location and timing of the noise can help narrow it down. If the noise is loud, sudden, or accompanied by a warning light, have the vehicle inspected promptly.\n\nWhere does the noise seem to come from, and does it happen while braking, accelerating, turning, or idling?`,

    steering: `If the steering on your ${vName} suddenly becomes very heavy, loose, or difficult to control, there may be a problem with the steering system, tire pressure, or suspension. Because steering is safety-critical, avoid driving the vehicle if you cannot control it normally and have it inspected.\n\nDid the steering problem happen suddenly or gradually?`,

    transmission: `If your ${vName} is slipping, jerking, delaying when changing gears, or making unusual noises, there may be a transmission fluid or component problem. Avoid hard acceleration until the problem is checked. A qualified technician can inspect the transmission and fluid condition.\n\nDoes the car jerk, slip, or have trouble changing gears?`,

    tire: `If a tire on your ${vName} is losing air, it may have a puncture, valve leak, or tire damage. Check the tire pressure and look for obvious damage, but do not drive on a severely underinflated or damaged tire. Have the tire inspected and repaired or replaced if necessary.\n\nHow quickly is the tire losing air?`,

    general: `If your ${vName} is experiencing an unexpected issue, you can start by checking your dashboard for warning lights and verifying your fluid levels when parked on level ground. If warning lights are present or symptoms persist, have a qualified mechanic inspect and scan the vehicle.\n\nWhat year, make, and model is your vehicle, and when does the problem happen — when starting, driving, braking, accelerating, or idling?`,
  };

  return responses[topic] || responses.general;
}
