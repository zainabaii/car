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

    // 1. Extract vehicle context (current message vehicle details take precedence)
    const vehicle = extractVehicleContext(message, rawVehicle);

    // 2. Determine current topic category + strip history if topic switched
    const agentConfig = determineSpecializedAgent(message);
    const currentTopic = classifyTopic(message);
    const filteredConversation = filterConversationByTopic(conversation, currentTopic);

    // 3. Build VAYRA System Prompt incorporating the Complete Automotive AI Assistant Master Prompt
    const systemPrompt = buildVayraSystemPrompt(vehicle, currentTopic, message);

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
// TOPIC CLASSIFICATION — Identifies the exact problem/inquiry category
// -----------------------------------------------------------------------------

const TOPIC_PATTERNS = {
  // H. Transmission / Gear Shifting
  transmission: /transmiss|gearbox|clutch|gear|shift|slip|jerk|hesitat|delay|torque\s*converter/i,

  // F. Tires / Wheels / Vibration / Shaking
  shaking: /shak|vibrat|wobbl|shimm|judder|trembl|unbalanc|balance.*wheel|wheel.*balance|alignment/i,

  // A. Air Conditioning / AC
  ac: /ac\b|a\.?c\.?|air\s*cond|warm\s*air|hot\s*air|cold\s*air|not\s*cool|refrigerant|freon|compressor|condenser|blower|hvac|climate/i,

  // B. Engine Overheating / Engine Temperature
  overheating: /overheat|engine\s*hot|temp.*gauge|temperature.*gauge|coolant|radiator|steam|boil|thermostat|water\s*pump/i,

  // C. Battery / Starting / No-Start
  battery: /won'?t\s*start|doesn'?t\s*start|dead\s*battery|battery|crank|no\s*start|click.*start|jump\s*start|alternator|starter|turn\s*over/i,

  // E. Brakes
  brakes: /brake|braking|squeal|grind|pedal|stop|abs\b|rotor|pad/i,

  // D. Check Engine Light / Engine Problems
  checkengine: /check\s*engine|engine\s*light|warning\s*light|cel\b|obd|diagnostic|misfire|rough\s*idle/i,

  // I. Oil / Engine Oil
  oil: /oil\s*(warning|light|pressure|level|lamp|leak)|low\s*oil|dipstick/i,

  // G. Steering
  steering: /steer|power\s*steering|hard\s*to\s*turn|wheel\s*pull|wheel\s*drift/i,

  // J. Fuel Economy / High Fuel Consumption
  fuel: /fuel|gas\s*mileage|gas\s*usage|mpg|km\/l|l\/100km|fuel\s*consump|drink.*fuel|eat.*fuel|burn.*fuel|poor\s*mileage|bad\s*mileage|using.*fuel|more\s*fuel|too\s*much\s*fuel|high\s*fuel|gas\s*consumption|using.*gas|more\s*gas|too\s*much\s*gas/i,

  // K. Strange Noises
  noise: /noise|sound|squeak|rattle|clunk|knock|bang|hiss|hum|click/i,

  // L. Suspension
  suspension: /suspension|bumpy\s*ride|bounce|bouncing|shock|strut|bushing|ball\s*joint|leaning/i,

  // M. Cooling System
  cooling: /coolant\s*leak|radiator|cooling\s*fan|water\s*pump|thermostat|antifreeze/i,

  // N. Electrical / Lights
  electrical: /headlight|interior\s*light|dash\s*light|power\s*window|central\s*lock|fuse|battery\s*drain|electrical/i,

  // O. Dashboard Warning Lights
  dashboard_warning: /warning\s*light|symbol|airbag\s*light|tpms\s*light|traction\s*control\s*light|stability\s*light/i,

  // P. Tire Pressure / TPMS
  tpms: /tire\s*pressure|tpms|psi|underinflated|inflated|tire\s*gauge|door\s*jamb/i,

  // Q. Fuel / Engine Performance
  engine_performance: /poor\s*acceleration|hesitation|hesitate|reduced\s*power|fuel\s*smell|rough\s*idle/i,

  // R. Car Starts But Stalls
  stalling: /starts\s*but\s*stalls|starts\s*then\s*dies|stalls\s*at\s*idle|stalls\s*while\s*driving|engine\s*stalls/i,

  // S. Car Features and Functions
  car_features: /cruise\s*control|lane\s*assist|backup\s*camera|remote\s*start|keyless|push\s*button|auto\s*headlight|climate\s*control|defog|traction\s*control|eco\s*mode|sport\s*mode|snow\s*mode|hill\s*start|electronic\s*parking\s*brake|auto\s*hold|blind\s*spot|collision|bluetooth|infotainment|how\s*does.*work|how\s*do\s*i\s*use/i,

  // T. Maintenance Questions
  maintenance: /oil\s*change|brake\s*service|tire\s*rotation|alignment|battery\s*replacement|air\s*filter|spark\s*plug|service\s*interval|maintenance\s*schedule|when\s*should\s*i/i,

  // Tire / Flat Tire
  tire: /tire|tyre|flat|puncture|losing\s*air|tread|rim/i,
};

function classifyTopic(message) {
  const cleanMsg = message.trim();
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(cleanMsg)) return topic;
  }
  
  // Check if the message is purely a basic standalone greeting
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|vayra|start|help)$/i.test(cleanMsg)) {
    return 'greeting';
  }

  // Any message that isn't a plain greeting contains an inquiry or symptom that must be answered directly
  return 'general_symptom';
}

function filterConversationByTopic(conversation, currentTopic) {
  if (!Array.isArray(conversation) || conversation.length === 0) return [];

  // Keep only messages from the EXACT SAME topic as currentTopic.
  // Discard previous topic history upon topic switch to prevent cross-contamination.
  const related = conversation.filter(msg => {
    if (!msg || !msg.text) return false;
    if (msg.id === 'msg-1' || msg.text.includes('Hello! I am VAYRA')) return false;
    const msgTopic = classifyTopic(msg.text);
    return msgTopic === currentTopic;
  });

  return related.slice(-4);
}

// -----------------------------------------------------------------------------
// VEHICLE EXTRACTION — Current user message vehicle info takes precedence
// -----------------------------------------------------------------------------

function extractVehicleContext(message, existingVehicle) {
  const v = { ...(existingVehicle || {}) };
  
  const match = message.match(/\b(19[89]\d|20[0-2]\d)\s+([A-Za-z0-9\-]+)\s+([A-Za-z0-9\-]+)/i);
  if (match) {
    v.year = match[1];
    v.make = match[2];
    v.model = match[3];
  }
  return v;
}

// -----------------------------------------------------------------------------
// SYSTEM PROMPT — Embedding the Complete Automotive AI Assistant Master Prompt
// -----------------------------------------------------------------------------

function buildVayraSystemPrompt(vehicle, currentTopic, userMessage = '') {
  const hasVehicle = vehicle && (vehicle.make || vehicle.model);
  const vehicleStr = hasVehicle 
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : null;

  return `You are VAYRA, an AI Car Care Assistant for a car website.
Tagline: "Know Your Car. Care Smarter."

Your job is to understand the customer's CURRENT message, identify the exact vehicle problem or question, and provide a simple, useful, customer-friendly answer.
VAYRA must behave like a helpful automotive service advisor, NOT like a technical repair manual.

CUSTOMER VEHICLE: ${hasVehicle ? vehicleStr : 'Not specified in vehicle state — reference any year, make, model mentioned in the customer\'s message.'}
CURRENT CUSTOMER MESSAGE: "${userMessage}"
CLASSIFIED TOPIC CATEGORY: ${currentTopic.toUpperCase()}

==================================================
1. MOST IMPORTANT RULE — CURRENT MESSAGE FIRST
==================================================
- Always analyze the customer's LATEST message first.
- Never reuse an answer from a previous customer message when the current problem has changed.
- Every customer message must be independently classified according to its actual content.
- Respond ONLY to the problem described in the customer's current message: "${userMessage}".

==================================================
2. IDENTIFY AND USE VEHICLE DETAILS
==================================================
- Extract vehicle info whenever provided: Year, Make, Model, Trim, Engine, Transmission.
- Do not ask for information that the customer has already provided in their message or state.
- If the customer provides enough information to answer, answer immediately.

==================================================
3. AUTOMOTIVE PROBLEM CATEGORIES & INSTRUCTIONS
==================================================
A. AIR CONDITIONING / AC: Address AC blowing warm, weak cooling, smell, compressor noise. Causes: low refrigerant/leak, compressor/clutch, condenser, cooling fan, blend door. Give simple safe checks.
B. OVERHEATING / ENGINE TEMPERATURE: Address engine overheating, temp gauge in red, steam. Causes: low coolant/leak, radiator, fan, thermostat, water pump, head gasket. SAFETY: Stop safely, turn off engine, allow to cool. NEVER open a hot radiator/coolant cap.
C. BATTERY / STARTING / NO-START: Address won't start, clicking, dead battery, slow crank, jump-start. Causes: battery, alternator, starter, terminals.
D. CHECK ENGINE LIGHT / ENGINE PROBLEMS: Address check engine light, rough idle, misfire, hesitation, power loss, stalling. FLASHING LIGHT = Urgent! Stop driving to prevent catalytic converter damage. Recommend OBD-II scanning.
E. BRAKES: Address soft pedal, pedal to floor, grinding, squealing, vibration, poor stopping. Causes: worn pads, rotors, low fluid, air in lines, calipers. SAFETY: If pedal goes to floor or stopping reduced, advise NOT driving and towing. If customer says "grinding", focus on GRINDING!
F. TIRES / WHEELS / VIBRATION / SHAKING: Address shaking, steering wheel vibration, wheel wobble, uneven wear, bent rim. Causes: wheel balance, tire damage, alignment, suspension, bearings.
G. STEERING: Address hard to turn, loose steering, pulling, noise, power steering loss. SAFETY: If steering is unreliable or hard to control, advise avoiding driving.
H. TRANSMISSION / GEAR SHIFTING: Address jerking when changing gears, hard shifting, slipping, delayed shift, clutch issues. Causes: fluid condition/level, shift solenoid, clutch, torque converter. Focus immediately on TRANSMISSION.
I. OIL / ENGINE OIL: Address low oil, oil light, leaks, burning oil, pressure warning. SAFETY: If oil pressure light is on, advise stopping engine safely immediately.
J. FUEL ECONOMY / HIGH FUEL CONSUMPTION: Address using too much fuel, poor gas mileage, sudden drop in MPG. Causes: low tire pressure, driving habits, excessive idling, dirty air filter, spark plugs, fuel system, sensors, brake drag, alignment.
K. STRANGE NOISES: Address grinding, clicking, ticking, knocking, humming, whining, squealing, rattling, clunking. Focus on location, timing, speed, braking/accelerating.
L. SUSPENSION: Address bumpy ride, clunking over bumps, bouncing, leaning. Causes: shocks/struts, bushings, ball joints, tie rods.
M. COOLING SYSTEM: Address leaks, low coolant, radiator, fan, thermostat. Connect to overheating when appropriate.
N. ELECTRICAL / LIGHTS: Address headlights, interior lights, windows, locks, fuses, battery drain.
O. DASHBOARD WARNING LIGHTS: Explain warning symbol urgency (CEL, Battery, Oil, Brake, ABS, Airbag, TPMS, Temp, Traction).
P. TIRE PRESSURE / TPMS: Reference manufacturer's recommended PSI on driver's door-jamb sticker.
Q. FUEL / ENGINE PERFORMANCE: Address hesitation, stalling, rough idle, fuel smell.
R. CAR STARTS BUT STALLS: Treat stalling while driving as a safety concern.
S. CAR FEATURES AND FUNCTIONS: Explain cruise control, lane assist, backup camera, keyless entry, climate control, drive modes (ECO/SPORT), hill assist, electronic parking brake, blind spot, Bluetooth, etc., in simple language.
T. MAINTENANCE QUESTIONS: Answer oil change, brake service, tire rotation, alignment, spark plugs, filters, service intervals.

==================================================
4. RESPONSE FORMAT & STRUCTURE
==================================================
For normal automotive problems, follow this exact structure:
1. Directly identify the problem in your opening line.
2. Give the 2–3 most likely/common causes.
3. Give 2–4 safe checks the customer can do.
4. Give a clear recommendation about when to see a mechanic.
5. Ask ONE useful follow-up question ONLY AFTER providing a complete, useful answer.
Keep answers short (4 to 8 sentences), clear, and customer-friendly.

==================================================
5. STRICT PROHIBITIONS (NEVER DO THIS)
==================================================
- NEVER ignore the customer's current problem.
- NEVER reuse an unrelated previous answer.
- NEVER reset to the welcome message when the customer already provided a question.
- NEVER ask "What problem are you experiencing?" when the problem is already clear in their message.
- NEVER give an AC answer to an overheating question.
- NEVER give a battery answer to a vibration question.
- NEVER give an engine answer to a transmission question.
- NEVER give unrelated symptoms just to make the answer longer.
- NEVER ask for year/make/model when the customer already provided them.
- NEVER pretend to perform a physical inspection or claim exact fault without evidence.
- NEVER give dangerous repair instructions or tell customers to open a hot radiator cap.
- NEVER encourage driving when a serious safety problem is present.

==================================================
6. SYMPTOM MATCHING & SAFETY PRIORITY
==================================================
- The exact symptom stated by the customer has absolute priority.
- Safety is paramount: Severe overheating, brake failure, major loss of steering, flashing CEL, smoke/fire, fuel leak = clear safety warning to stop/avoid driving.
- Use easy language. Avoid unnecessary technical jargon. Explain technical terms briefly if used.`;
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
    suspension: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    cooling: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    electrical: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    dashboard_warning: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    tpms: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    engine_performance: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    stalling: { agentId: 'car-care', agentName: 'VAYRA Car Care Agent', agentRole: 'Automotive Diagnostics & Symptom Analyzer', badge: 'CARE AGENT' },
    car_features: { agentId: 'vehicle-info', agentName: 'VAYRA Co-Pilot Agent', agentRole: 'Automotive Intelligence Specialist', badge: 'CARE AGENT' },
    maintenance: { agentId: 'maintenance', agentName: 'VAYRA Maintenance Agent', agentRole: 'Vehicle Service Planning & Intervals', badge: 'MAINTENANCE AGENT' }
  };

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

  for (const msg of filteredConversation) {
    if (!msg || !msg.text) continue;
    const role = (msg.sender === 'user') ? 'user' : 'model';
    contents.push({ role, parts: [{ text: msg.text }] });
  }

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
// EXPERT AUTOMOTIVE FALLBACK ENGINE (Comprehensive 20 Categories)
// -----------------------------------------------------------------------------
function generateExpertAutomotiveFallback(topic, message, vehicle) {
  const vName = vehicle && vehicle.make ? `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim() : 'your vehicle';

  const responses = {
    ac: `If your ${vName} AC is blowing warm air or not cooling properly, common causes include low refrigerant due to a leak, a malfunctioning compressor or clutch, a blocked condenser, or a stuck blend door inside the dashboard.

**Safe Checks You Can Do:**
* Listen for a distinct "click" under the hood when turning the AC on (indicates compressor clutch engagement).
* Check if the air gets colder while driving at highway speeds versus idling.
* Inspect the front condenser area for dirt, leaves, or obvious physical damage.

If the AC continues to blow warm air, have a qualified technician check the refrigerant level and test for system leaks.

*Does the air get colder while driving, or does it stay warm all the time?*`,

    overheating: `If your ${vName} engine is overheating, primary causes include low coolant level, a coolant leak, a failed radiator cooling fan, a stuck thermostat, or a failing water pump.

**SAFETY WARNING:** If the temperature gauge is in the red or you see steam, safely pull over and turn off the engine immediately. **Never open the radiator cap while the engine is hot.**

**Safe Checks You Can Do:**
* Check the coolant overflow reservoir level only after the engine has completely cooled down.
* Look under the vehicle for puddles of bright green, orange, or pink fluid.

If overheating persists, have the vehicle inspected or towed to a mechanic.

*Is your temperature warning light on, and do you see any coolant leaking under the car?*`,

    battery: `If your ${vName} won't start or hesitates when starting, the issue is typically a weak or dead battery, corroded battery terminals, a failing starter motor, or an alternator fault.

**Safe Checks You Can Do:**
* Listen closely when turning the key: a rapid clicking sound usually indicates a low battery charge.
* Check if battery terminals are tight and free of white or blue corrosion.
* Observe if dashboard lights turn on brightly or dim completely when attempting to start.

If jump-starting gets the car running but it dies shortly after, the alternator may need testing.

*Do you hear a clicking sound when you turn the key or press the start button?*`,

    checkengine: `A check engine light on your ${vName} indicates that the onboard diagnostics detected a fault in the engine, emissions, or ignition system. Common triggers include oxygen sensor failure, spark plug/ignition coil misfires, or a loose gas cap.

**Safe Checks You Can Do:**
* Ensure your gas cap is tightened securely until it clicks.
* Pay attention to how the engine runs — if the light is flashing, stop driving safely to avoid severe catalytic converter damage.

Have a local auto shop scan the OBD-II trouble codes for an exact reading.

*Is your check engine light staying on steadily, or is it flashing?*`,

    brakes: `If your ${vName} brake pedal feels soft or you experience squealing or grinding, primary causes are worn brake pads, air in the brake lines, low brake fluid, or warped rotors.

**SAFETY WARNING:** If the brake pedal goes all the way to the floor or stopping power is significantly reduced, do NOT drive the vehicle. Have it towed to a repair shop.

**Safe Checks You Can Do:**
* Check the brake fluid level in the reservoir under the hood.
* Note whether squealing occurs during light braking or constant grinding occurs when stopping.

Have a qualified mechanic perform a complete brake inspection promptly.

*Does the pedal feel soft, or do you hear squealing or grinding when applying the brakes?*`,

    shaking: `If your ${vName} is shaking at speeds between 80–100 km/h, the most probable causes are wheel imbalance, uneven or damaged tires, a bent rim, or front-end wheel alignment/suspension issues.

**Safe Checks You Can Do:**
* Inspect all four tires for uneven tread wear, bulges, or embedded objects.
* Check that tire inflation pressures match the sticker on your driver's door jamb.
* Look for visible damage or bends on the rims.

Having a tire shop perform a high-speed wheel balancing and alignment check usually resolves speed-dependent vibration.

*Is the vibration felt mostly through the steering wheel, or through your seat and the whole vehicle floor?*`,

    oil: `An illuminated oil light on your ${vName} indicates low oil pressure or critically low engine oil level. Driving with low oil pressure can cause severe, permanent engine damage within minutes.

**SAFETY WARNING:** Safely pull over and turn off the engine immediately.

**Safe Checks You Can Do:**
* Pull the engine oil dipstick (when parked on level ground with engine off), wipe it clean, reinsert, and check the level.
* Look under the engine bay for fresh oil leaks.

If the oil level is correct but the light remains on, do not restart the engine — have the vehicle towed to a mechanic.

*Did the oil warning light turn on while driving, or right after starting the car?*`,

    fuel: `If your ${vName} is using more fuel than usual, key causes can include underinflated tires, aggressive driving or excessive idling, a dirty engine air filter, worn spark plugs, fuel system issues, engine or sensor faults (such as a bad oxygen sensor), brake drag, or poor wheel alignment.

**Safe Checks You Can Do:**
* Check and inflate all tires to the recommended PSI listed on your driver's door jamb sticker.
* Inspect the engine air filter for dust and debris buildup.
* Check if the check engine light is on (a failing sensor can drop fuel economy significantly).

If tire pressures and air filter are normal, have a qualified mechanic perform a diagnostic scan and alignment check.

*Did the drop in fuel economy happen suddenly, or has it been getting worse over time?*`,

    steering: `If steering your ${vName} feels heavy, loose, or pulls to one side, potential causes include low power steering fluid, a worn steering rack, wheel mis-alignment, or failing suspension tie rods.

**SAFETY WARNING:** If steering response is erratic or unreliable, avoid driving and seek immediate professional inspection.

**Safe Checks You Can Do:**
* Check power steering fluid level (if your vehicle uses hydraulic power steering).
* Ensure tire pressures are equal on both front tires.

Have a mechanic inspect steering linkage and alignment.

*Does the car pull to one side while driving straight, or is the steering wheel hard to turn?*`,

    transmission: `If your ${vName} jerks, slips, or hesitates when changing gears, common causes are low or degraded transmission fluid, a faulty shift solenoid, torque converter wear, or sensor communication errors.

**Safe Checks You Can Do:**
* Check transmission fluid level and color (if your model includes a transmission dipstick). Fresh fluid is reddish; dark or burnt fluid indicates service is needed.
* Note if jerking occurs specifically during cold starts or after the transmission warms up.

A specialized transmission technician can scan transmission control module (TCM) codes and inspect fluid condition.

*Does the jerking happen when shifting between specific gears, or when accelerating from a stop?*`,

    noise: `Unusual noises from your ${vName} can originate from accessory belts (squeaking), loose heat shields or suspension bushings (rattling/clunking), or engine components (knocking).

**Safe Checks You Can Do:**
* Note whether the sound changes with engine RPM or with vehicle speed.
* Check if the noise occurs while idling, accelerating, turning, or braking.

Isolating the location and conditions helps a mechanic pinpoint the issue quickly.

*Where does the noise seem to be coming from, and does it happen when turning or braking?*`,

    general_symptom: `If your ${vName} is showing signs of an issue, potential causes depend on whether it involves performance, braking, electrical, or fluid systems.

**Safe Checks You Can Do:**
* Check for warning lights on your instrument cluster.
* Inspect essential fluid levels (oil, coolant, brake fluid) when parked safely on level ground.

If symptoms persist or warning lights illuminate, have a qualified technician inspect and scan the vehicle.

*What specific symptom or behavior are you noticing, and when does it occur?*`,

    greeting: `Hello! I am VAYRA, your AI Car Care Assistant.

I can help diagnose symptoms, explain potential causes, suggest safe checks, and guide you on when to visit a mechanic.

*To get started, please tell me what problem or symptom your vehicle is experiencing, along with your vehicle's year, make, and model.*`
  };

  return responses[topic] || responses.general_symptom || responses.greeting;
}
