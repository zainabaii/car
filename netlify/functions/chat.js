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

    // 1. Extract vehicle context from both message text AND vehicle object (current message takes precedence if specified)
    const vehicle = extractVehicleContext(message, rawVehicle);

    // 2. Determine current topic category + strip history if topic switched
    const agentConfig = determineSpecializedAgent(message);
    const currentTopic = classifyTopic(message);
    const filteredConversation = filterConversationByTopic(conversation, currentTopic);

    // 3. Build VAYRA System Prompt — topic-aware, strictly focused on current message symptom
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
// TOPIC CLASSIFICATION — Identifies which of the 12 categories the current
// message belongs to, ensuring the AI analyzes the specific symptom immediately.
// -----------------------------------------------------------------------------

const TOPIC_PATTERNS = {
  // 1. Transmission (jerking, gears, shifting, slipping, clutch, torque converter)
  transmission: /transmiss|gearbox|clutch|gear|shift|slip|jerk|hesitat|delay|torque\s*converter/i,

  // 2. Tires / Wheels / Shaking / Vibration (shaking, vibration, wobble, shimmy, wheel balance, alignment)
  shaking: /shak|vibrat|wobbl|shimm|judder|trembl|unbalanc|balance.*wheel|wheel.*balance|alignment/i,

  // 3. AC / Air Conditioning (warm air, not cooling, ac, refrigerant, compressor, etc.)
  ac: /ac\b|a\.?c\.?|air\s*cond|warm\s*air|hot\s*air|cold\s*air|not\s*cool|refrigerant|freon|compressor|condenser|blower|hvac|climate/i,

  // 4. Engine Overheating (overheating, temp gauge, coolant, radiator, steam)
  overheating: /overheat|engine\s*hot|temp.*gauge|temperature.*gauge|coolant|radiator|steam|boil|thermostat|water\s*pump/i,

  // 5. Battery / Won't Start (won't start, dead battery, clicking, crank, starter, alternator)
  battery: /won'?t\s*start|doesn'?t\s*start|dead\s*battery|battery|crank|no\s*start|click.*start|jump\s*start|alternator|starter|turn\s*over/i,

  // 6. Brakes (soft pedal, squealing, grinding, stopping, brake pads)
  brakes: /brake|braking|squeal|grind|pedal|stop|abs\b|rotor|pad/i,

  // 7. Engine / Check Engine Light (check engine light, cel, misfire, warning light)
  checkengine: /check\s*engine|engine\s*light|warning\s*light|cel\b|obd|diagnostic|misfire|rough\s*idle/i,

  // 8. Oil (low oil, oil light, oil pressure, dipstick, oil leak)
  oil: /oil\s*(warning|light|pressure|level|lamp|leak)|low\s*oil|dipstick/i,

  // 9. Steering (steering wheel, power steering, hard to turn, pulling)
  steering: /steer|power\s*steering|hard\s*to\s*turn|wheel\s*pull|wheel\s*drift/i,

  // 10. Fuel Economy (poor gas mileage, using too much fuel, mpg)
  fuel: /fuel\s*econom|gas\s*mileage|mpg|km\/l|km\.\s*l|fuel\s*consump|drink.*fuel|poor\s*mileage|using\s*too\s*much\s*gas|too\s*much\s*fuel/i,

  // 11. Strange Noises (squeak, rattle, clunk, knock, bang, hiss, hum)
  noise: /noise|sound|squeak|rattle|clunk|knock|bang|hiss|hum|click/i,

  // 12. Tire / Flat Tire (losing air, flat tire, puncture, tread, rim, pressure)
  tire: /tire|tyre|flat|puncture|losing\s*air|tread|rim|psi\b/i,
};

function classifyTopic(message) {
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(message)) return topic;
  }
  
  // Check if message describes any automotive issue/symptom that didn't hit a specific pattern
  if (/problem|issue|wrong|symptom|trouble|broken|fail|leak|smell|smoke|damage/i.test(message)) {
    return 'general_symptom';
  }
  
  return 'general';
}

function filterConversationByTopic(conversation, currentTopic) {
  if (!Array.isArray(conversation) || conversation.length === 0) return [];

  // Keep only messages from the EXACT SAME topic as currentTopic.
  // If topic switched (e.g. AC -> Transmission), discard previous topic history to avoid cross-topic pollution.
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
// SYSTEM PROMPT — Topic-focused, strict guidelines against generic answers
// -----------------------------------------------------------------------------

function buildVayraSystemPrompt(vehicle, currentTopic, userMessage = '') {
  const hasVehicle = vehicle && (vehicle.make || vehicle.model);
  const vehicleStr = hasVehicle 
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : null;

  const topicGuidance = {
    ac: `TOPIC DETECTED: AC / Air Conditioning Problem.
The customer's message describes an air conditioning symptom (e.g., blowing warm air, not cooling).
Your response MUST address the AC problem directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely AC causes (low refrigerant/leak, failing compressor or clutch, blocked condenser, or blend-door fault).
- Provide 2-3 safe checks (listen for compressor click, note if cooling improves at highway speed).
- Suggest when to consult an AC technician.
- Ask 1 relevant follow-up question about the AC.`,

    overheating: `TOPIC DETECTED: Engine Overheating Problem.
The customer's message describes engine overheating or coolant issues.
Your response MUST address engine overheating directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (low coolant level/leak, thermostat stuck closed, radiator fan failure, water pump issue).
- Provide SAFETY WARNING: stop safely and turn off engine immediately if temp gauge is in red or steam is present. NEVER open hot radiator cap.
- Suggest 2 safe checks (coolant reservoir level when cold, radiator fan spinning).
- Ask 1 relevant follow-up question.`,

    battery: `TOPIC DETECTED: Battery / Starting Problem.
The customer's message describes a car that won't start or starting trouble.
Your response MUST address starting and electrical system issues directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (weak/dead battery, loose or corroded battery terminals, failing alternator, starter motor fault).
- Provide 2-3 safe checks (listen for clicking, check terminal tightness, check if dash lights illuminate).
- Ask 1 relevant follow-up question.`,

    checkengine: `TOPIC DETECTED: Check Engine Light / Engine Diagnostics.
The customer's message describes a check engine light or engine performance issue.
Your response MUST address the check engine light directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (oxygen sensor fault, ignition coil/spark plug misfire, loose gas cap, emissions component).
- Distinguish steady light vs flashing light (flashing means stop driving to avoid catalytic converter damage).
- Ask 1 relevant follow-up question.`,

    brakes: `TOPIC DETECTED: Brakes Problem.
The customer's message describes a brake issue (e.g., soft pedal, squealing, grinding, poor stopping).
Your response MUST address the braking system directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (worn brake pads, low brake fluid, warped rotors, air in lines).
- Provide SAFETY WARNING: if pedal goes to floor or stopping is unsafe, advise NOT driving and towing to a shop.
- Provide 2-3 safe checks (brake fluid reservoir level, pedal firmness).
- Ask 1 relevant follow-up question.`,

    shaking: `TOPIC DETECTED: Tires / Wheels / Shaking / Vibration Problem.
The customer's message describes car shaking or vibration (e.g., at 80–100 km/h or through steering wheel).
Your response MUST address shaking/vibration directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (wheel imbalance, uneven/damaged tires, bent rim, wheel alignment, suspension or CV joint wear).
- Highlight wheel balancing and tire condition as primary suspects for speed-dependent shaking.
- Provide 2-3 safe checks (inspect tire tread for uneven wear, check tire pressures, inspect rims).
- Ask 1 relevant follow-up question (e.g., at what exact speed it starts, whether felt in steering wheel or seat).`,

    oil: `TOPIC DETECTED: Oil / Oil Pressure Warning.
The customer's message describes an oil light or low oil condition.
Your response MUST address engine oil directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (low engine oil, oil leak, failing oil pressure sensor, oil pump fault).
- Provide SAFETY WARNING: safely stop engine immediately if oil pressure warning light comes on to prevent catastrophic engine seizure.
- Provide safe check (check dipstick when engine is off and parked on level ground).
- Ask 1 relevant follow-up question.`,

    fuel: `TOPIC DETECTED: Fuel Economy / Fuel Consumption Problem.
The customer's message describes poor fuel economy or high gas consumption.
Your response MUST address fuel economy directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (underinflated tires, dirty air filter, oxygen/MAF sensor issue, worn spark plugs).
- Provide 2-3 safe checks (check tire pressures, inspect air filter, check for active warning lights).
- Ask 1 relevant follow-up question.`,

    steering: `TOPIC DETECTED: Steering System Problem.
The customer's message describes steering difficulty, pulling, or looseness.
Your response MUST address the steering system directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (low power steering fluid, steering rack/pump issue, wheel alignment, tie rod/suspension wear).
- Provide SAFETY WARNING: do not drive if steering control is unsafe or heavy.
- Provide safe checks (power steering fluid level, tire inflation).
- Ask 1 relevant follow-up question.`,

    transmission: `TOPIC DETECTED: Transmission / Gear Shifting Problem.
The customer's message describes transmission jerking, slipping, gear shifting delay, or transmission noise.
Your response MUST address transmission issues directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (low or degraded transmission fluid, shift solenoid fault, torque converter/clutch wear, sensor issue).
- Provide 2-3 safe checks (check transmission fluid level and color if accessible, note if jerking occurs when cold or warm).
- Recommend professional transmission technician inspection.
- Ask 1 relevant follow-up question.`,

    noise: `TOPIC DETECTED: Strange Noise Problem.
The customer's message describes unusual vehicle noises (squeaking, rattling, clunking, knocking, etc.).
Your response MUST address vehicle noise diagnosis directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes based on common sources (accessory belts, heat shields, suspension bushings, engine knock, wheel bearings).
- Provide 2-3 safe checks to help localize the sound.
- Ask 1 relevant follow-up question (when does it happen: idling, accelerating, braking, turning).`,

    tire: `TOPIC DETECTED: Tire / Flat Tire Problem.
The customer's message describes tire air loss, flat tire, or tread issue.
Your response MUST address tire care directly for ${vehicleStr || 'their vehicle'}.
- Explain 2-3 likely causes (puncture from nail/screw, valve stem leak, rim bead leak, sidewall damage).
- Provide SAFETY WARNING: do not drive on a flat or severely underinflated tire.
- Provide safe checks (inspect tread for objects, check pressure with gauge).
- Ask 1 relevant follow-up question.`,

    general_symptom: `TOPIC DETECTED: Automotive Symptom (${userMessage}).
The customer described a specific vehicle issue: "${userMessage}".
- Analyze this specific symptom directly using automotive mechanics.
- List 2-3 probable causes.
- Give 2-3 safe things the customer can check.
- Recommend mechanic inspection if needed.
- Ask 1 relevant follow-up question.`,

    general: `TOPIC: General Greeting / Inquiry.
The customer has NOT described a specific vehicle problem yet.
- Greet them warmly as VAYRA.
- Politely ask them to describe the symptom or problem their vehicle is experiencing (e.g. AC warm, shaking at speed, won't start, check engine light) along with their vehicle year, make, and model.`
  };

  const topicContext = topicGuidance[currentTopic] || topicGuidance.general;

  return `You are VAYRA, a friendly, expert automotive assistant for a car website.
Tagline: "Know Your Car. Care Smarter."

VEHICLE SPECIFIED BY CUSTOMER: ${hasVehicle ? vehicleStr : 'Not specified — use any vehicle details mentioned in customer\'s message.'}

CURRENT MESSAGE CONTEXT & TOPIC INSTRUCTIONS:
${topicContext}

STRICT RESPONSE RULES:
1. ALWAYS prioritize the customer's CURRENT message.
2. Respond SPECIFICALLY to the problem described in the customer's current message.
3. NEVER repeat or reuse a previous answer if the customer asks about a different topic or problem.
4. ABSOLUTE PROHIBITION ON GENERIC FALLBACKS:
   - If the customer described a problem (e.g., AC warm, car jerks, shaking, won't start), you MUST NOT say "If your vehicle is experiencing an unexpected issue..." and MUST NOT ask "What problem is happening?". The customer ALREADY told you the problem! Answer it immediately!
5. Structure your response clearly:
   - Acknowledge the vehicle and specific symptom directly.
   - Explain 2–3 probable causes in simple, clear language.
   - Provide 2–3 practical, safe things the customer can check.
   - State when to visit a professional mechanic.
   - Ask 1–2 useful follow-up questions to help narrow down the cause.
6. Keep response concise (4 to 8 sentences, nicely formatted with bullet points if helpful).
7. NEVER claim a guaranteed diagnosis — use words like "may", "could", "possible".
8. SAFETY MANDATE: Never instruct users to perform dangerous actions (opening hot radiator caps, working under unsupported jacked cars, touching hot components while engine is running).`;
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
// EXPERT AUTOMOTIVE FALLBACK ENGINE (12 Specific Categories)
// -----------------------------------------------------------------------------
function generateExpertAutomotiveFallback(topic, message, vehicle) {
  const vName = vehicle && vehicle.make ? `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim() : 'your vehicle';

  const responses = {
    ac: `If your ${vName} AC is blowing warm air or not cooling properly, the most common causes are low refrigerant due to a leak, a malfunctioning AC compressor or clutch, a blocked condenser, or a stuck blend door inside the dashboard.

**Safe Checks You Can Do:**
* Listen for a distinct "click" from under the hood when turning the AC on (indicates compressor clutch engagement).
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

    fuel: `If your ${vName} is consuming excessive fuel, key causes include underinflated tires, a clogged engine air filter, a failing oxygen sensor, or worn spark plugs.

**Safe Checks You Can Do:**
* Check and inflate all tires to the recommended PSI.
* Inspect the engine air filter for dust and debris buildup.
* Check if the check engine light is illuminated (a bad sensor can drop fuel economy by 20%+).

Addressing basic maintenance items like air filters and tire pressure usually restores MPG.

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

    tire: `If a tire on your ${vName} is losing air pressure, common causes are a nail or screw puncture in the tread, a leaking valve stem, or bead seal corrosion along the rim.

**SAFETY WARNING:** Do not drive on a completely flat tire to avoid destroying the tire carcass and wheel rim.

**Safe Checks You Can Do:**
* Visually inspect the tire tread and sidewall for nails or damage.
* Apply soapy water around the valve stem and tread to look for bubbling air leaks.

A tire shop can safely plug and patch tread punctures in most cases.

*How fast is the tire losing air — within hours or over several days?*`,

    general_symptom: `If your ${vName} is showing signs of an issue, potential causes depend on whether it involves performance, braking, electrical, or fluid systems.

**Safe Checks You Can Do:**
* Check for warning lights on your instrument cluster.
* Inspect essential fluid levels (oil, coolant, brake fluid) when parked safely on level ground.

If symptoms persist or warning lights illuminate, have a qualified technician inspect and scan the vehicle.

*What specific symptom or behavior are you noticing, and when does it occur?*`,

    general: `Hello! I am VAYRA, your AI Car Care Assistant.

I can help diagnose symptoms, explain potential causes, suggest safe checks, and guide you on when to visit a mechanic.

*To get started, please tell me what problem or symptom your vehicle is experiencing, along with your vehicle's year, make, and model.*`
  };

  return responses[topic] || responses.general_symptom || responses.general;
}
