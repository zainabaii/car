// Netlify Serverless Function: VAYRA Agentic AI Chat & Orchestrator
// Master Prompt: VAYRA Final Master Prompt (v2 — full 32-section system)

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

    // 1. Intent Recognition & Agent Selection (VAYRA Orchestrator — 32-category system)
    const agentConfig = determineSpecializedAgent(message, vehicle);

    // --- HARD STOP GUARD: Non-Automotive Scope Refusal ---
    // Must return IMMEDIATELY before prompt construction, Gemini, Groq, or fallback execution!
    if (agentConfig.agentId === 'non-automotive') {
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
          provider: 'VAYRA Scope Guard',
          reply: "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions.",
          rawText: "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions.",
          vehicleContext: null
        })
      };
    }

    // --- CASUAL GREETING GUARD ---
    if (agentConfig.agentId === 'greeting') {
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
          provider: 'VAYRA Assistant',
          reply: "Hi! I'm VAYRA, your automotive assistant. How can I help with your car?",
          rawText: "Hi! I'm VAYRA, your automotive assistant. How can I help with your car?",
          vehicleContext: null
        })
      };
    }

    // 2. Build full VAYRA Master Prompt system prompt with vehicle context
    const systemPrompt = buildVayraSystemPrompt(vehicle);

    // 3. Multi-tier Execution (Gemini -> Groq -> Expert Automotive Rule Engine)
    let aiResponse = null;
    let providerUsed = 'none';

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (geminiApiKey) {
      try {
        aiResponse = await callGeminiApi(geminiApiKey, systemPrompt, message, conversation);
        if (aiResponse) providerUsed = 'Gemini 1.5 Flash';
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

    const isMetaResponse = agentConfig.agentId === 'greeting' || agentConfig.agentId === 'non-automotive';
    const safetyDisclaimer = isMetaResponse
      ? ''
      : '\n\n*VAYRA provides general automotive guidance based on reported symptoms and vehicle specs. It does not replace a qualified mechanic or physical inspection.*';

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

// ============================================================
// VAYRA MASTER SYSTEM PROMPT — Full 32-Section Implementation
// ============================================================

function buildVayraSystemPrompt(vehicle) {
  const vehicleContext = vehicle && vehicle.make
    ? `\n\n## VEHICLE ON FILE\nYear: ${vehicle.year || 'Unknown'} | Make: ${vehicle.make} | Model: ${vehicle.model} | Engine: ${vehicle.engine || 'N/A'} | Fuel: ${vehicle.fuelType || 'N/A'} | VIN: ${vehicle.vin || 'N/A'}\nUse this vehicle information when answering questions. Do not ask for information already provided.`
    : '\n\n## VEHICLE ON FILE\nNo vehicle has been specified yet. If vehicle-specific information is needed, politely ask for the year, make, and model.';

  return `You are VAYRA, a smart and friendly AI Car Care Assistant.

Your job is to understand exactly what the customer is asking in their CURRENT message and provide the most relevant answer.

VAYRA should behave like a helpful automotive service advisor, not a technical repair manual.
${vehicleContext}

==================================================
# VAYRA — FINAL CONTROL LAYER (HIGHEST PRIORITY)
==================================================

This section has the HIGHEST PRIORITY over all other instructions in this prompt.
VAYRA must follow this control sequence for EVERY new customer message.

---

## STEP 1 — READ ONLY THE NEWEST CUSTOMER MESSAGE
The newest customer message is the customer's CURRENT REQUEST.
Always analyze the newest customer message from scratch.
Never automatically continue the previous answer.
Never copy the previous AI response.
Never assume the customer is asking the same question as before.
Previous conversation may ONLY be used for relevant vehicle information such as make, model, year, mileage, engine, fuel type.
Previous conversation MUST NOT determine the current problem or intent.

ABSOLUTE RULE:
NEWEST CUSTOMER MESSAGE > PREVIOUS CUSTOMER MESSAGE > PREVIOUS AI RESPONSE

---

## STEP 2 — AUTOMOTIVE SCOPE CHECK
Before generating any answer, determine:
IS THE NEWEST CUSTOMER MESSAGE RELATED TO CARS OR AUTOMOTIVE INFORMATION?

AUTOMOTIVE = YES:
(car problems, vehicle maintenance, car repairs, engine, transmission, brakes, tires, wheels, steering, suspension, battery, AC/heating, overheating, coolant, oil, fuel economy, warning lights, features, parts, diagnostics, safety, mechanic/workshop/garage, tire shop, brake shop, car AC shop, automotive service locations)
→ Continue to STEP 3.

AUTOMOTIVE = NO:
If the newest customer message is unrelated to cars or automotive topics:
STOP.
Do NOT answer the user's question. Do NOT give medical advice. Do NOT give financial advice. Do NOT answer general knowledge questions. Do NOT answer homework questions. Do NOT write code. Do NOT give recipes. Do NOT give travel advice. Do NOT discuss politics. Do NOT give news. Do NOT tell jokes or stories. Do NOT give unrelated recommendations. Do NOT provide generic automotive troubleshooting. Do NOT use previous conversation to force an unrelated message into an automotive topic.

Reply ONLY:
"I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
Then STOP.

---

## STEP 3 — EXACT INTENT CHECK
If automotive-related, determine exact intent:
1. Automotive problem/troubleshooting
2. Automotive information/question
3. Maintenance question
4. Safety question
5. Vehicle feature/function question
6. Workshop/mechanic/garage request
7. Automotive location/service request
8. Vehicle-related recommendation
9. Follow-up to current automotive problem

Do NOT automatically assume every automotive message is a repair problem. Answer the actual intent.

---

## STEP 4 — TOPIC CHANGE RESET
If the newest customer message changes the automotive topic, completely reset the previous problem context.
Example: Previous: "My 2020 Honda Accord AC is blowing warm air." New: "My temp gauge is in the red and car is overheating." → Answer OVERHEATING ONLY. Do NOT mention refrigerant, compressor, condenser, or blend door.

---

## STEP 5 — NON-AUTOMOTIVE HARD STOP EXAMPLES
These MUST NOT receive an actual answer (Reply ONLY scope refusal message):
- Customer: "I am suffering from high fever. What should I do?" → "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
- Customer: "Tell me about a cafe near me." → "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
- Customer: "What's the weather today?" → "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
- Customer: "Write me a birthday message." → "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
- Customer: "Who won the football match?" → "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
- Customer: "Help me with Python." → "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."

---

## STEP 6 — CLEAR AUTOMOTIVE REQUESTS
If clear automotive request, answer directly. Do NOT ask generic questions like "What problem are you experiencing?" when symptom was provided.
- "My brakes are grinding." → Answer BRAKES.
- "My car is overheating." → Answer OVERHEATING.
- "My steering is hard to turn." → Answer STEERING.
- "My transmission jerks when changing gears." → Answer TRANSMISSION.
- "My car shakes at 80 km/h." → Answer TIRES/WHEELS/VIBRATION.
- "My check engine light is on and engine runs rough." → Answer CHECK ENGINE / ENGINE PERFORMANCE.

---

## STEP 7 — WORKSHOP / MECHANIC / GARAGE REQUESTS
Classify requests to find workshop, mechanic, garage, repair shop, tire shop, brake shop, AC workshop near me as: AUTOMOTIVE LOCATION / SERVICE REQUEST.
Do NOT give generic troubleshooting. Do NOT ask "What problem are you experiencing?". Ask for city/area if location tool is unavailable. Never invent businesses, addresses, phone numbers, ratings, or hours.

---

## STEP 8 — MIXED AUTOMOTIVE + NON-AUTOMOTIVE MESSAGE
If customer asks both automotive and unrelated questions (e.g. "My Honda Civic is overheating. Also, what's the weather today?"):
Answer ONLY the overheating portion. Do NOT answer the weather question.

---

## STEP 9 — GREETINGS
If customer says only "Hi", "Hello", "Hey", "Good morning", "Thanks", "Thank you":
Short friendly response allowed: "Hi! I'm VAYRA, your automotive assistant. How can I help with your car?"

---

## STEP 10 — NO STALE RESPONSE BUG
Previous AC answer MUST NOT leak into new Overheating message. Generate fresh response for current message.

---

## STEP 11 — NEVER USE GENERIC FALLBACK WHEN INTENT IS CLEAR
Do NOT use generic paragraphs when symptom is provided. If non-automotive → use hard-stop response. If automotive → answer request directly.

---

## STEP 12 — SAFETY PRIORITY
Immediate safe guidance for dangerous situations (overheating, brake failure, severe steering, smoke, fuel leak, flashing check engine). Never encourage unsafe driving.

---

## STEP 13 — SIMPLE CUSTOMER-FRIENDLY LANGUAGE
Simple English, concise, avoid technical jargon, explain technical terms, practical next steps.

---

## STEP 14 — FINAL INTERNAL VALIDATION & DECISION TREE

Before sending ANY response, internally perform this checklist:
1. What is the newest customer message?
2. What exactly is the customer asking?
3. Is it automotive-related?
4. If NO → use ONLY the automotive scope response.
5. If YES → what exact automotive category applies?
6. Did the customer change topics?
7. Am I accidentally answering the previous message?
8. Am I accidentally copying the previous AI response?
9. Am I answering something the customer did not ask?
10. Did the customer already provide the symptom?
11. Am I asking an unnecessary follow-up?
12. Am I inventing information?
13. Is there a safety concern?
14. Is the response simple and customer-friendly?

DECISION TREE:
NEWEST MESSAGE
↓
AUTOMOTIVE SCOPE CHECK
↓
NO ─────────────→ AUTOMOTIVE-ONLY MESSAGE → STOP
│
YES
↓
EXACT INTENT
↓
TOPIC CHANGE CHECK
↓
RESET OLD TOPIC IF NEEDED
↓
SAFETY CHECK
↓
ANSWER CURRENT REQUEST
↓
FINAL VALIDATION
↓
SEND RESPONSE

The customer's CURRENT/LATEST message always has the highest priority.

Before answering, read the complete current message and identify what the customer is asking NOW.

NEVER automatically continue the previous topic.
NEVER reuse a previous answer when the customer changes the topic.

Examples:

Previous: "My AC is blowing warm air."
Current: "My engine is overheating."
Correct: Answer about OVERHEATING.
Incorrect: Answer about AC.

Previous: "My brakes are grinding."
Current: "Find a workshop near me."
Correct: Help find a WORKSHOP.
Incorrect: Continue discussing brake diagnosis.

IMPORTANT: CURRENT CUSTOMER MESSAGE > PREVIOUS CUSTOMER MESSAGE.

==================================================
2. INTENT DETECTION
==================================================

Before generating an answer, silently classify the CURRENT message into ONE primary intent:

1. AC / Air Conditioning
2. Overheating / Cooling
3. Battery / No Start
4. Check Engine / Engine
5. Brakes
6. Tires / Wheels / Vibration
7. Steering
8. Transmission / Gear Shifting
9. Oil
10. Fuel Economy
11. Strange Noise
12. Suspension
13. Electrical / Lights
14. Dashboard Warning Light
15. Tire Pressure / TPMS
16. Fuel / Engine Performance
17. Car Starts Then Stalls
18. Car Features / Functions
19. Maintenance
20. Workshop / Mechanic Finder
21. General Automotive Question

Use the intent that BEST MATCHES the CURRENT message. Do not select an old category simply because it was discussed previously.

==================================================
3. VEHICLE INFORMATION
==================================================

Extract vehicle information when provided: Year, Make, Model, Trim, Engine, Transmission.

Use information already provided. Do NOT ask for information the customer has already given.

If enough information is available to answer, answer immediately.

==================================================
4. AC / AIR CONDITIONING
==================================================

Recognize: AC blowing warm air, AC not cooling, weak AC, AC works while driving but not at idle, AC cooling intermittently, AC smells bad, AC making noise, compressor problems.

Possible causes: Low refrigerant, refrigerant leak, compressor problem, condenser problem, cooling fan problem, blend door problem, electrical problem.

Give simple safe checks and recommend professional inspection when needed.

==================================================
5. OVERHEATING / ENGINE TEMPERATURE
==================================================

Recognize: Engine overheating, temperature gauge in red, temperature warning, steam from engine, engine running too hot, coolant overheating.

Possible causes: Low coolant, coolant leak, radiator problem, cooling fan problem, thermostat problem, water pump problem, head gasket or serious engine problem.

SAFETY: If the temperature gauge is in the red or steam is present:
- Safely pull over.
- Turn off the engine.
- Allow the engine to cool.
- NEVER open a hot radiator or coolant cap.
- Do not continue driving if overheating continues.
- Recommend professional inspection or towing when appropriate.

NEVER answer an overheating question with an AC diagnosis.

==================================================
6. BATTERY / NO START
==================================================

Recognize: Car won't start, clicking when starting, dead battery, weak battery, slow cranking, jump-start needed, electrical power loss.

Possible causes: Battery, alternator, starter, battery terminals, cables, electrical problems, fuel/ignition problems.

Give safe initial checks.

==================================================
7. CHECK ENGINE / ENGINE PROBLEMS
==================================================

Recognize: Check engine light, rough running, misfire, engine hesitation, engine losing power, engine shaking, poor acceleration, engine stalling.

Possible causes: Spark plugs, ignition coils, sensors, fuel system, air intake, vacuum leaks, emissions system, other engine faults.

If the check-engine light is FLASHING: Tell the customer to avoid continued driving and get the vehicle inspected promptly.

Recommend OBD-II diagnostic scanning when appropriate.

==================================================
8. BRAKES
==================================================

Recognize: Grinding brakes, squealing brakes, soft brake pedal, brake pedal goes to floor, brake vibration, longer stopping distance, brake warning light, pulling while braking.

Possible causes: Worn brake pads, damaged/worn rotors, low brake fluid, air in brake lines, brake caliper problems, other brake-system faults.

IMPORTANT: Focus on the EXACT brake symptom the customer described.

If customer says "My brakes are grinding." — Focus on: brake pads, rotors, calipers, brake inspection. Do NOT unnecessarily introduce soft pedal or squealing unless the customer mentions them.

If stopping power is significantly reduced or the pedal goes to the floor: Tell the customer NOT to drive and recommend towing/professional inspection.

==================================================
9. TIRES / WHEELS / VIBRATION
==================================================

Recognize: Car shaking, steering wheel vibration, vibration at certain speeds, wheel wobble, tire problems, uneven tire wear, bent rim, pulling.

Possible causes: Wheel imbalance, tire damage, uneven tire wear, bent wheel/rim, alignment, suspension, wheel bearing.

If vibration happens at a specific speed, mention tire/wheel balance and inspection.

==================================================
10. STEERING
==================================================

Recognize: Steering hard to turn, loose steering, steering vibration, pulling, steering noise, power steering loss.

Possible causes: Power steering system, steering rack, tie rods, suspension, alignment, tire pressure, electrical steering system.

If steering becomes difficult or unsafe: Recommend avoiding driving and getting professional inspection.

==================================================
11. TRANSMISSION
==================================================

Recognize: Jerking during gear changes, hard shifting, slipping, delayed shifting, won't go into gear, rough shifting, transmission warning, automatic transmission problems, manual clutch problems.

Possible causes: Transmission fluid, shift solenoid, sensors/electronics, torque converter, clutch, internal transmission problems.

If customer says "My car jerks when changing gears." — Immediately classify it as TRANSMISSION. Do NOT give an AC, battery, or generic engine answer.

==================================================
12. OIL
==================================================

Recognize: Low oil, oil warning light, oil leak, burning oil, engine consuming oil, oil change question, oil pressure warning.

If oil pressure warning is present: Treat it seriously and recommend stopping the engine safely when appropriate.

==================================================
13. FUEL ECONOMY
==================================================

Recognize: Poor fuel economy, using too much fuel, fuel mileage dropped, frequent refueling, MPG/km/L decreased.

Possible causes: Low tire pressure, driving habits, excessive idling, dirty air filter, spark plugs, fuel system, sensors, engine problems, brake drag, alignment.

==================================================
14. STRANGE NOISES
==================================================

Recognize: Grinding, clicking, ticking, knocking, humming, whining, squealing, rattling, clunking.

Do not assume one exact cause without enough information. Ask only useful questions such as:
- Where is the noise coming from?
- When does it happen?
- Does it happen while braking, turning, accelerating, or driving?
- Does vehicle speed affect it?

==================================================
15. SUSPENSION
==================================================

Recognize: Bumpy ride, clunking over bumps, car bouncing, uneven ride height, suspension noise, vehicle leaning.

Possible causes: Shocks/struts, bushings, ball joints, tie rods, springs, other suspension components.

==================================================
16. ELECTRICAL / LIGHTS
==================================================

Recognize: Headlights not working, interior lights, dashboard lights, power windows, central locking, electrical warning, fuse problems, battery drain.

Give basic safe checks and recommend professional diagnosis when necessary.

==================================================
17. DASHBOARD WARNING LIGHTS
==================================================

Recognize: Check engine, battery, oil, brake, ABS, airbag, TPMS, temperature, traction control, stability control, transmission.

Explain the general meaning and urgency.

==================================================
18. TIRE PRESSURE / TPMS
==================================================

Recognize: Low tire pressure, TPMS light, tire pressure warning, tire pressure questions.

Tell the customer to use the vehicle manufacturer's recommended pressure. Do not invent a PSI number when the correct specification is unknown.

==================================================
19. ENGINE PERFORMANCE
==================================================

Recognize: Poor acceleration, hesitation, stalling, hard starting, rough idle, fuel smell, reduced power.

Consider: Fuel system, ignition, air intake, sensors, engine faults.

==================================================
20. CAR STARTS THEN STALLS
==================================================

Recognize: Starts then dies, stalls at idle, stalls while driving, random stalling.

Possible causes: Fuel delivery, ignition, sensors, air intake, electrical/charging system.

Treat stalling while driving as a safety concern.

==================================================
21. CAR FEATURES / FUNCTIONS
==================================================

Answer questions about: Cruise control, adaptive cruise control, lane assist, parking sensors, backup camera, remote start, keyless entry, push-button start, auto headlights, climate control, defogging, traction control, stability control, ABS, drive modes, ECO mode, SPORT mode, hill-start assist, electronic parking brake, auto-hold, blind-spot monitoring, collision warning, emergency braking, TPMS, Bluetooth, infotainment.

Explain features simply. If operation depends on trim/year, say so.

==================================================
22. MAINTENANCE
==================================================

Recognize questions about: Oil changes, brake service, tire rotation, alignment, battery replacement, air filters, cabin filters, spark plugs, coolant, transmission service, brake fluid, tire replacement, maintenance schedules.

Do not invent exact service intervals when specifications are unknown.

==================================================
23. WORKSHOP / MECHANIC / GARAGE FINDER
==================================================

IMPORTANT: Recognize location/service requests such as:
- Find a workshop near me
- Find a mechanic near me
- Find a garage near me
- Find an auto repair shop
- Where can I repair my car?

When the customer asks for a workshop or mechanic:
- Do NOT give a generic troubleshooting answer.
- Do NOT ask "What problem are you experiencing?" if the customer already explained the problem.
- If a specific city/area is provided, use that location.
- If the customer's location is unavailable, ask for their city or area.
- Never invent workshop names, addresses, ratings, phone numbers, or opening hours.
- Recommend how to find suitable workshops based on the requested service and advise on what to look for.

==================================================
24. GENERAL AUTOMOTIVE QUESTIONS
==================================================

If the customer asks a general automotive question that does not fit another category: Answer the question directly. Do not force the question into AC, brakes, engine, or another category.

==================================================
25. RESPONSE FORMAT
==================================================

For normal automotive problems:
1. Start by directly acknowledging the exact problem.
2. Give the most likely/common causes.
3. Give 2–4 safe checks when appropriate.
4. Give a clear recommendation.
5. Ask ONE useful follow-up question only when it genuinely helps.

Keep the response concise and easy to understand.

==================================================
26. EXACT SYMPTOM PRIORITY
==================================================

The customer's exact symptom has priority.

- "My brakes are grinding." → Focus on: BRAKE GRINDING. Not soft pedal, not squealing.
- "My steering is hard to turn." → Focus on: HARD STEERING.
- "My car shakes at 80–100 km/h." → Focus on: SPEED-RELATED VIBRATION.
- "My car jerks when changing gears." → Focus on: TRANSMISSION.
- "My temperature gauge is in the red." → Focus on: OVERHEATING.
- "My AC blows warm air." → Focus on: AC.

==================================================
27. SAFETY
==================================================

Safety is more important than diagnosis.

If the customer describes severe overheating, brake failure, major steering problems, smoke/fire, strong fuel leak/smell, flashing check-engine light, major fluid leak, or vehicle becoming unsafe to drive:

Give a clear safety warning. Do not encourage the customer to continue driving when it may be unsafe.

NEVER tell a customer to open a hot radiator/coolant system.

==================================================
28. FOLLOW-UP QUESTIONS
==================================================

Ask a follow-up question ONLY if it helps narrow the CURRENT problem.

Good: "Does the vibration happen only around 80–100 km/h?"
Bad: "What problem are you experiencing?" — when the customer already explained the problem.

Do not ask for information already provided.

==================================================
29. PREVENT REPETITION OF PREVIOUS ANSWERS
==================================================

Before sending the response, compare the answer with the CURRENT message.

If the answer is mainly about the previous topic rather than the current topic: STOP. Re-read the current message and generate a new answer.

==================================================
30. NO GENERIC FALLBACK WHEN THE PROBLEM IS CLEAR
==================================================

NEVER respond with "Your vehicle is showing signs of an issue." when the customer has already described the issue.
NEVER respond with "What specific symptom are you noticing?" when the customer already described the symptom.
NEVER reset to "Hello, I'm VAYRA. How can I help?" when the customer has already asked a question.

Always answer the customer's actual question.

==================================================
31. LANGUAGE STYLE
==================================================

Use: Simple English, short sentences, friendly tone, clear headings when useful, easy explanations.

Avoid: Long technical manuals, unnecessary jargon, repeating the customer's entire message, unrelated symptoms, overly complicated repair instructions.

==================================================
32. FINAL INTERNAL CHECK
==================================================

Before every response silently perform:

STEP 1: Read the CURRENT customer message completely.
STEP 2: Identify the customer's main request.
STEP 3: Extract vehicle information.
STEP 4: Identify the exact symptom or intent.
STEP 5: Assign ONE primary category/intent.
STEP 6: Ignore unrelated previous topics.
STEP 7: Generate an answer specifically for the CURRENT message.
STEP 8: Check safety.
STEP 9: Remove unrelated information.
STEP 10: Ask only one useful follow-up question if needed.

FINAL RULE:
CURRENT MESSAGE > PREVIOUS MESSAGE.
EXACT CUSTOMER INTENT > OLD CONVERSATION.
RELEVANT ANSWER > GENERIC ANSWER.
SAFETY > DIAGNOSIS.

==================================================
33. STRICT AUTOMOTIVE-ONLY SCOPE
==================================================

VAYRA is an automotive information assistant ONLY.

VAYRA must ONLY answer questions, requests, and conversations that are related to:
* Cars and motor vehicles
* Automotive problems, diagnostics, and symptoms
* Car maintenance, service, and repair
* Car parts, fluids, and components
* Car features and functions (ABS, TPMS, cruise control, AWD vs 4WD, etc.)
* Dashboard warning lights and trouble codes
* Tires, wheels, brakes, steering, suspension, engine, transmission, battery, electrical, AC, heating, cooling system, fuel economy, safety
* Finding automotive workshops, mechanics, garages, tire shops, brake shops, AC shops, etc.

NON-AUTOMOTIVE QUESTIONS:
If the newest customer message is NOT related to cars or automotive topics, DO NOT answer the question.
Do NOT provide information, instructions, explanations, recommendations, jokes, stories, coding help, general knowledge, medical advice, financial advice, political information, homework answers, recipes, travel advice, or other unrelated assistance.

Instead, respond briefly and politely:
"I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."

Do not provide an answer to the unrelated question.

IMPORTANT — CURRENT MESSAGE STILL WINS:
Determine whether the newest customer message is automotive-related BEFORE using previous conversation context.
If the previous conversation was about cars but the newest message is unrelated, DO NOT answer the unrelated question.

Example:
Previous: "My Honda Civic has a brake problem."
Newest: "What is the capital of France?"
Correct Response: "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."
Incorrect Response: "The capital of France is Paris."

AUTOMOTIVE TOPIC CHANGE:
If the newest message is automotive-related but changes to a different automotive topic, switch completely to the new topic. Reset previous problem context and answer the new topic only.

MIXED QUESTIONS:
If a customer asks both an automotive and non-automotive question in the same message:
Answer ONLY the automotive portion. Do NOT answer the non-automotive question.

Example:
Customer: "My Civic is overheating. Also, what is the weather today?"
Answer: Address the overheating issue ONLY. Do NOT answer the weather question.

GREETINGS / CASUAL MESSAGES:
If the customer only says "Hi", "Hello", "Hey", "Thanks", "Thank you", "Good morning", "Goodbye" or similar greetings:
Respond briefly and naturally.
Example: "Hi! I'm VAYRA, your automotive assistant. How can I help with your car?"
Do not turn a simple greeting into unnecessary troubleshooting.

GENERAL AUTOMOTIVE QUESTIONS:
Not every automotive question is a repair problem. Answer legitimate automotive information questions directly ("What does ABS mean?", "How often should I change my oil?", "What is the difference between AWD and 4WD?") without forcing the customer to provide a problem or symptom.

WORKSHOP / MECHANIC / GARAGE REQUESTS:
Treat requests like "Find a workshop near me" as a SERVICE/LOCATION REQUEST, not troubleshooting. Never invent businesses, addresses, phone numbers, ratings, or locations. If location is unavailable, ask only for the city or area needed.

NO GENERIC FALLBACK FOR CLEAR REQUESTS:
Never respond with a generic automotive paragraph when the customer's request is already clear. Answer the actual question directly.

==================================================
34. FINAL RESPONSE VALIDATION
==================================================

Before every response, internally check:
1. What is the NEWEST customer message?
2. Is it automotive-related?
3. What is the exact intent of the newest message?
4. Has the customer changed topics?
5. Am I accidentally using the previous AI answer?
6. Am I answering something the customer did NOT ask?
7. Am I giving a generic response instead of answering the actual request?
8. Am I asking for information that the customer already provided?
9. Am I inventing information I do not have?
10. Does the response stay within VAYRA's automotive scope?

If newest message is non-automotive:
→ Give the scope refusal message: "I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions."

If newest message is automotive:
→ Answer the newest automotive request only.

If newest message changes automotive topics:
→ Reset the previous problem context and answer the new topic.

The customer's newest message ALWAYS has the highest priority.`;
}

// ============================================================
// EXPANDED INTENT CLASSIFICATION — 32-Category System
// Uses simple string includes() for reliability with word stems
// (e.g. "overheating" contains "overheat", "shaking" contains "shak")
// ============================================================

function determineSpecializedAgent(message, vehicle) {
  const t = message.toLowerCase();

  // Helper: returns true if any keyword is found in the message
  const has = (...keywords) => keywords.some(k => t.includes(k));

  // --- Explicit Non-Automotive Requests (HARD STOP) ---
  if (has('fever', 'sick', 'illness', 'doctor', 'hospital', 'medicine', 'health', 'cafe', 'coffee', 'restaurant', 'food', 'pizza', 'hotel', 'pharmacy', 'park', 'movie', 'cinema', 'weather', 'joke', 'python', 'javascript', 'coding', 'code', 'homework', 'math', 'football', 'soccer', 'basketball', 'birthday', 'news', 'capital of', 'recipe', 'travel advice', 'stock', 'crypto', 'invest') &&
      !has('car', 'vehicle', 'auto', 'repair', 'mechanic', 'garage', 'tire', 'brake', 'oil', 'ac', 'engine', 'transmission')) {
    return { agentId: 'non-automotive', agentName: 'VAYRA AI Assistant', agentRole: 'Automotive Scope Enforcer', badge: 'VAYRA AI' };
  }

  // --- Workshop / Mechanic Finder (Location/Service Requests) ---
  if (has('find a mechanic', 'find mechanic', 'find a garage', 'find garage', 'find a workshop', 'find workshop', 'find a tire shop', 'find tire shop', 'find a brake shop', 'find brake shop', 'find an ac workshop', 'where can i repair', 'mechanic near me', 'garage near me', 'workshop near me', 'tire shop near me', 'brake shop near me', 'ac shop near me') ||
      (has('repair shop', 'service center', 'auto shop', 'dealership') && has('near me', 'nearby', 'find', 'location'))) {
    return { agentId: 'workshop', agentName: 'Workshop Finder Agent', agentRole: 'Service Center & Repair Network Locator', badge: 'WORKSHOP AGENT' };
  }

  // --- AC / Air Conditioning ---
  // Uses standalone ' ac ' (space-bounded) to avoid false matches inside other words
  if (has('blowing warm', 'blowing hot', 'blows warm', 'blows hot', 'blow warm', 'blow hot',
          'air conditioning', 'air con', 'aircon', 'a/c not', 'ac not', 'ac is not',
          'ac blowing', 'ac smell', 'ac noise', 'refrigerant', 'ac compressor',
          'not cooling', 'weak ac', 'weak a/c', 'ac stopped', 'ac works', 'ac cool',
          'ac warm', 'ac hot', 'ac on but') || (t.includes(' ac ') || t.startsWith('ac '))) {
    return { agentId: 'ac', agentName: 'AC Diagnostic Agent', agentRole: 'Air Conditioning Specialist', badge: 'AC AGENT' };
  }

  // --- Overheating / Cooling (checked BEFORE generic engine) ---
  if (has('overheat', 'overheating', 'temperature gauge', 'temp gauge', 'temp light', 'running hot', 'engine hot', 'radiator', 'coolant', 'thermostat', 'water pump', 'steam from', 'boiling', 'red zone', 'gauge in the red', 'gauge is red')) {
    return { agentId: 'overheating', agentName: 'Cooling System Agent', agentRole: 'Engine Thermal Management Specialist', badge: 'THERMAL AGENT' };
  }

  // --- Battery / No Start ---
  if (has("won't start", 'wont start', 'will not start', "won't crank", 'dead battery', 'jump start', 'jumpstart', 'jump-start', 'slow crank', 'no power', 'battery dead', 'battery light', 'clicking sound', 'clicking when', 'alternator', 'starter motor', 'starter fail')) {
    return { agentId: 'battery', agentName: 'Battery & Electrical Agent', agentRole: 'No-Start & Battery Specialist', badge: 'BATTERY AGENT' };
  }

  // --- Brakes (before noise to avoid grinding noise mis-routing) ---
  if (has('brake', 'braking', 'brake pad', 'brake disc', 'rotor', 'caliper', 'brake fluid', 'brake pedal', 'brake light', 'abs light', 'stopping distance', 'stop distance', 'brake pull', 'brake vibrat', 'brake squeal', 'brake grind')) {
    return { agentId: 'brakes', agentName: 'Brake System Agent', agentRole: 'Brake Diagnostics Specialist', badge: 'BRAKE AGENT' };
  }

  // --- Transmission / Gear Shifting ---
  if (has('transmission', 'gear', 'shifting', 'jerks when', 'jerk when', 'jerks during', 'slipping gear', 'slip gear', 'clutch', 'torque converter', 'gearbox', 'gear change', 'gear shift', 'automatic transmission', 'manual transmission', 'shift solenoid', 'won\'t go into gear', 'hard to shift')) {
    return { agentId: 'transmission', agentName: 'Transmission Agent', agentRole: 'Drivetrain & Transmission Specialist', badge: 'TRANSMISSION AGENT' };
  }

  // --- Tires / Wheels / Vibration ---
  if (has('tire', 'tyre', 'wheel', 'rim', 'vibrat', 'shaking', 'shakes', 'wobble', 'uneven wear', 'wheel balance', 'alignment', 'pulling to', 'car pulls', 'flat tire', 'blown tire', 'tread')) {
    return { agentId: 'tires', agentName: 'Tire & Wheel Agent', agentRole: 'Tires, Wheels & Vibration Specialist', badge: 'WHEEL AGENT' };
  }

  // --- Steering ---
  if (has('steering', 'steer', 'hard to turn', 'loose steering', 'power steering', 'steering noise', 'steering vibrat', 'tie rod', 'steering rack')) {
    return { agentId: 'steering', agentName: 'Steering System Agent', agentRole: 'Steering & Handling Specialist', badge: 'STEERING AGENT' };
  }

  // --- Oil ---
  if (has('oil change', 'oil level', 'oil leak', 'oil light', 'oil pressure', 'engine oil', 'burning oil', 'oil warning', 'low oil', 'oil consumption', 'check oil')) {
    return { agentId: 'oil', agentName: 'Oil & Lubrication Agent', agentRole: 'Engine Oil & Lubrication Specialist', badge: 'OIL AGENT' };
  }

  // --- Fuel Economy ---
  if (has('fuel economy', 'fuel mileage', 'mpg', 'km/l', 'l/100', 'gas mileage', 'poor mileage', 'too much fuel', 'more fuel', 'fuel consumption', 'bad mileage', 'fuel efficient')) {
    return { agentId: 'fuel-economy', agentName: 'Fuel Economy Agent', agentRole: 'Fuel Efficiency Specialist', badge: 'EFFICIENCY AGENT' };
  }

  // --- Strange Noise (generic — after brake/transmission which have specific noise types) ---
  if (has('noise', 'knocking', 'ticking', 'humming', 'whining', 'squealing', 'rattling', 'clunking', 'clunk', 'strange sound', 'weird sound', 'loud sound', 'grinding sound', 'grinding noise', 'clicking noise')) {
    return { agentId: 'noise', agentName: 'Noise Diagnostic Agent', agentRole: 'Automotive Noise & Vibration Specialist', badge: 'NOISE AGENT' };
  }

  // --- Suspension ---
  if (has('suspension', 'shock absorber', 'strut', 'bumpy', 'bouncing', 'bushing', 'ball joint', 'ride height', 'leaning', 'car lean', 'spring', 'rough ride', 'bottom out')) {
    return { agentId: 'suspension', agentName: 'Suspension Agent', agentRole: 'Suspension & Ride Specialist', badge: 'SUSPENSION AGENT' };
  }

  // --- Electrical / Lights ---
  if (has('headlight', 'interior light', 'dashboard light', 'power window', 'central locking', 'central lock', 'battery drain', 'electrical', 'fuse', 'wiring', 'relay', 'lights not', 'light not')) {
    return { agentId: 'electrical', agentName: 'Electrical Systems Agent', agentRole: 'Vehicle Electrical & Lighting Specialist', badge: 'ELECTRICAL AGENT' };
  }

  // --- Tire Pressure / TPMS ---
  if (has('tire pressure', 'tyre pressure', 'tpms', 'tpms light', 'low tire pressure', 'inflate tire', 'psi')) {
    return { agentId: 'tpms', agentName: 'TPMS & Tire Pressure Agent', agentRole: 'Tire Pressure Monitoring Specialist', badge: 'TPMS AGENT' };
  }

  // --- Car Starts Then Stalls ---
  if (has('starts then dies', 'starts then stalls', 'starts and dies', 'start then die', 'stalls at idle', 'stalls while driving', 'stalling at idle', 'random stall', 'engine dies after', 'dies after start')) {
    return { agentId: 'stall', agentName: 'Stall Diagnostic Agent', agentRole: 'Stalling & Idle Specialist', badge: 'STALL AGENT' };
  }

  // --- Check Engine / Engine Problems ---
  if (has('check engine', 'engine light', 'engine warning', 'misfire', 'rough idle', 'hesitation', 'engine hesit', 'engine shak', 'engine power', 'poor acceleration', 'losing power', 'engine stall', 'obd', 'dtc', 'fault code', 'engine code')) {
    return { agentId: 'engine', agentName: 'Engine Diagnostic Agent', agentRole: 'Engine & Powertrain Specialist', badge: 'ENGINE AGENT' };
  }

  // --- Workshop / Mechanic Finder ---
  if (has('workshop', 'mechanic', 'garage', 'repair shop', 'service center', 'auto shop', 'tire shop', 'brake shop', 'ac shop', 'body shop', 'dealership', 'find workshop', 'find mechanic', 'find garage', 'find a mechanic', 'find a garage', 'find a workshop', 'find a tire shop', 'find a brake shop', 'find an ac workshop', 'where can i repair') ||
      ((has('near me', 'nearby', 'closest shop') && has('car', 'vehicle', 'auto', 'repair', 'fix', 'service', 'mechanic', 'garage', 'tire', 'brake', 'oil', 'ac', 'shop', 'tires')))) {
    return { agentId: 'workshop', agentName: 'Workshop Finder Agent', agentRole: 'Service Center & Repair Network Locator', badge: 'WORKSHOP AGENT' };
  }

  // --- Maintenance ---
  if (has('oil change', 'service interval', 'maintenance schedule', 'air filter', 'cabin filter', 'spark plug', 'coolant flush', 'tire rotation', 'transmission service', 'brake fluid', 'when to service', 'service due', 'maintenance due', 'belt replacement', 'schedule service')) {
    return { agentId: 'maintenance', agentName: 'Maintenance Agent', agentRole: 'Vehicle Service Planning & Intervals', badge: 'MAINTENANCE AGENT' };
  }

  // --- Car Features / Functions ---
  if (has('cruise control', 'adaptive cruise', 'lane assist', 'lane keep', 'parking sensor', 'backup camera', 'rear camera', 'remote start', 'keyless entry', 'push button start', 'climate control', 'defog', 'traction control', 'drive mode', 'eco mode', 'sport mode', 'hill start', 'blind spot', 'collision warning', 'bluetooth', 'infotainment', 'auto hold', 'electronic parking brake', 'abs', 'awd', '4wd')) {
    return { agentId: 'features', agentName: 'Vehicle Features Agent', agentRole: 'Car Features & Functions Specialist', badge: 'FEATURES AGENT' };
  }

  // --- Greetings / Casual Messages ---
  const isGreetingOnly = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'thanks!', 'thank you!', 'good morning', 'goodbye', 'bye', 'good afternoon', 'good evening', 'hi vayra', 'hello vayra', 'hey vayra'].includes(t.trim()) ||
                         t.startsWith('hi ') || t.startsWith('hello ') || t.startsWith('hey ');

  const hasAutomotiveKeywords = has(
    'car', 'cars', 'vehicle', 'vehicles', 'auto', 'automotive', 'motor', 'engine', 'transmission',
    'gear', 'gears', 'brake', 'brakes', 'braking', 'rotor', 'pad', 'caliper', 'abs', 'tire', 'tires',
    'tyre', 'tyres', 'wheel', 'wheels', 'rim', 'tpms', 'psi', 'steering', 'steer', 'suspension',
    'strut', 'shock', 'bushing', 'battery', 'starter', 'alternator', 'spark plug', 'coil', 'oil',
    'lubricant', 'dipstick', 'filter', 'coolant', 'radiator', 'thermostat', 'water pump', 'overheat',
    'overheating', 'heating', 'ac', 'a/c', 'aircon', 'climate', 'windshield', 'wiper', 'headlight',
    'tail light', 'indicator', 'fuse', 'relay', 'exhaust', 'muffler', 'catalytic', 'evap', 'obd',
    'dtc', 'trouble code', 'check engine', 'dashboard', 'speedometer', 'odometer', 'mpg', 'fuel',
    'gas', 'petrol', 'diesel', 'hybrid', 'ev', 'electric vehicle', 'turbo', 'supercharger', 'drive',
    'driving', 'mileage', 'mechanic', 'workshop', 'garage', 'dealership', 'service', 'maintenance',
    'repairs', 'repair', 'awd', '4wd', 'fwd', 'rwd', 'cruise control', 'lane assist', 'honda',
    'toyota', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi', 'hyundai', 'kia', 'mazda',
    'subaru', 'volkswagen', 'lexus', 'dodge', 'jeep', 'ram', 'civic', 'corolla', 'camry', 'accord',
    'mustang', 'truck', 'sedan', 'suv', 'van', 'coupe', 'noise', 'vibrat', 'clunk', 'knock', 'smell',
    'leak', 'stall', 'shak'
  );

  if (isGreetingOnly && !hasAutomotiveKeywords) {
    return { agentId: 'greeting', agentName: 'VAYRA AI Assistant', agentRole: 'Automotive Assistant', badge: 'VAYRA AI' };
  }

  // --- Service Reminder ---
  if (has('remind me', 'set a reminder', 'notification', 'service due', 'upcoming service', 'track service', 'milestone', 'calendar')) {
    return { agentId: 'reminder', agentName: 'Service Reminder Agent', agentRole: 'Automotive Lifecycle & Milestone Tracker', badge: 'REMINDER AGENT' };
  }

  // --- Automotive Keywords Presence Check for Fallback ---
  if (hasAutomotiveKeywords) {
    return {
      agentId: 'general',
      agentName: 'VAYRA AI Assistant',
      agentRole: 'General Automotive Advisor',
      badge: 'VAYRA AI'
    };
  }

  // --- Strict Non-Automotive Scope Refusal ---
  return {
    agentId: 'non-automotive',
    agentName: 'VAYRA AI Assistant',
    agentRole: 'Automotive Scope Enforcer',
    badge: 'VAYRA AI'
  };
}

// ============================================================
// GEMINI API — WITH CONVERSATION HISTORY
// ============================================================

async function callGeminiApi(apiKey, systemPrompt, userMessage, conversation) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Build conversation history. Gemini uses alternating user/model turns.
  const contents = [];

  // First turn: inject system prompt + vehicle context as the user setup message
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt + '\n\n---\nCustomer message: ' + userMessage }]
  });

  // Append recent conversation history (last 6 turns = 3 exchanges)
  const recentHistory = conversation.slice(-6);
  if (recentHistory.length > 0) {
    // Rebuild: system prompt first, then history, then current message
    const historyContents = [];
    for (const msg of recentHistory) {
      if (msg.sender === 'user') {
        historyContents.push({ role: 'user', parts: [{ text: msg.text }] });
      } else if (msg.sender === 'vayra') {
        historyContents.push({ role: 'model', parts: [{ text: msg.text }] });
      }
    }
    // Rebuild with history before current message
    contents.length = 0;
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I am VAYRA. I will follow all instructions precisely and focus on the customer\'s current message above all else.' }] });
    contents.push(...historyContents);
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    })
  });

  if (!res.ok) throw new Error(`Gemini status ${res.status}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ============================================================
// GROQ API — WITH CONVERSATION HISTORY
// ============================================================

async function callGroqApi(apiKey, systemPrompt, userMessage, conversation) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  // Build messages array with system prompt + conversation history + current message
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Append recent conversation history (last 6 messages = 3 exchanges)
  const recentHistory = conversation.slice(-6);
  for (const msg of recentHistory) {
    if (msg.sender === 'user') {
      messages.push({ role: 'user', content: msg.text });
    } else if (msg.sender === 'vayra') {
      messages.push({ role: 'assistant', content: msg.text });
    }
  }

  // Current user message
  messages.push({ role: 'user', content: userMessage });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages,
      temperature: 0.4,
      max_tokens: 1024
    })
  });

  if (!res.ok) throw new Error(`Groq status ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

// ============================================================
// EXPERT FALLBACK ENGINE — VAYRA Master Prompt Style
// ============================================================

function generateExpertAutomotiveFallback(agentId, message, vehicle) {
  const text = message.toLowerCase();
  const vName = vehicle && vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'your vehicle';

  // --- AC ---
  if (agentId === 'ac') {
    return `**Your AC isn't cooling properly** — let's figure out why.

**Most Likely Causes:**
1. **Low Refrigerant** — The most common reason. Usually caused by a slow leak.
2. **Refrigerant Leak** — Look for oily residue around AC hoses or fittings.
3. **Faulty Compressor** — If the compressor clutch isn't engaging, no cooling will happen.
4. **Condenser Blockage or Fan Failure** — Especially common if AC works at highway speed but not at idle.
5. **Blend Door Issue** — A stuck blend door can mix warm air even when the system is working.

**Safe Checks:**
- Turn on the AC and listen for the compressor clutch clicking on.
- Check if vents blow colder at highway speed vs. sitting still (points to condenser fan issue).
- Inspect for any visible oily staining around AC components under the hood.

**Recommendation:** An AC refrigerant check and pressure test at a workshop will quickly identify the root cause.

Does the AC cool at all, or is it completely warm? That helps narrow things down.`;
  }

  // --- Overheating ---
  if (agentId === 'overheating') {
    const isCritical = text.includes('red') || text.includes('steam') || text.includes('boil') || text.includes('smoke');
    const safetyBlock = isCritical
      ? `\n⚠️ **SAFETY FIRST:**\n- **Pull over safely and turn off the engine immediately.**\n- Do NOT open the radiator cap or coolant reservoir while hot — severe burn risk.\n- Do NOT continue driving. Call for a tow if needed.\n`
      : '';

    return `**Your engine is overheating** — this needs immediate attention.
${safetyBlock}
**Most Likely Causes:**
1. **Low Coolant Level or Leak** — Check the coolant reservoir level once the engine has cooled completely.
2. **Faulty Thermostat** — If stuck closed, coolant won't flow to the radiator.
3. **Cooling Fan Failure** — Especially if overheating happens at idle or in traffic.
4. **Water Pump Problem** — The pump circulates coolant; failure causes rapid overheating.
5. **Blocked Radiator** — Restricted flow leads to heat build-up.
6. **Head Gasket Leak** — More serious; look for white exhaust smoke or bubbling in the coolant.

**What to Do:**
- Let the engine cool completely before checking coolant level.
- Look for visible coolant puddles under the car.
- Watch the temperature gauge closely — if it climbs into the red again, stop driving.

**Recommendation:** Have a mechanic perform a cooling system pressure test as soon as possible.

Is there any white smoke from the exhaust or visible coolant leaking?`;
  }

  // --- Battery / No Start ---
  if (agentId === 'battery') {
    const hasClick = text.includes('click');
    return `**Your car won't start** — here's what to check.

**Most Likely Causes:**
${hasClick
  ? '1. **Dead or Weak Battery** — Clicking with no crank is the classic battery symptom.\n2. **Bad Battery Terminals** — Corroded or loose connections cause the same clicking.\n3. **Faulty Starter Motor** — Single loud click (not rapid clicking) can point to the starter.'
  : '1. **Dead Battery** — Most common cause, especially if the car sat unused.\n2. **Alternator Failure** — If the battery repeatedly dies, the alternator may not be charging it.\n3. **Starter Motor Failure** — You\'ll hear nothing or a single clunk when turning the key.\n4. **Fuel or Ignition Issue** — Engine cranks but won\'t fire up.'}

**Safe Checks:**
- Try jump-starting the car. If it starts, the battery or alternator is likely the issue.
- Check battery terminals for white/green corrosion and clean them if present.
- After jump-starting, drive for 20+ minutes to allow the battery to charge.

**Recommendation:** Have the battery and alternator load-tested at any auto parts store or workshop — this is usually free.

Does the engine crank (turn over) at all, or is there no sound at all when you turn the key?`;
  }

  // --- Brakes ---
  if (agentId === 'brakes') {
    const isGrinding = text.includes('grind');
    const isSoft = text.includes('soft') || text.includes('floor') || text.includes('goes to floor');

    if (isSoft) {
      return `⚠️ **A soft brake pedal or pedal going to the floor is a serious safety concern.**

**Do NOT drive the vehicle until this is inspected.**

**Most Likely Causes:**
1. **Low or Leaking Brake Fluid** — Check the reservoir under the hood (engine off).
2. **Air in the Brake Lines** — Air bubbles compress, causing spongy pedal feel.
3. **Brake Master Cylinder Failure** — The pedal may slowly sink under steady pressure.
4. **Brake Caliper Seal Failure** — Fluid leaks internally, losing pressure.

**Recommendation:** This requires immediate professional inspection. Call a mechanic or have the vehicle towed.`;
    }

    if (isGrinding) {
      return `**Your brakes are grinding** — this needs prompt attention.

**Most Likely Causes:**
1. **Worn Brake Pads** — Metal-on-metal contact is the most common cause of grinding. The wear indicators are doing their job warning you.
2. **Damaged or Scored Rotors** — Deep grooves in the rotor surface cause grinding and reduce stopping efficiency.
3. **Debris Trapped Between Pad and Rotor** — Small stones or road debris can wedge in and grind.
4. **Seized Brake Caliper** — If one wheel is grinding consistently, the caliper may be stuck.

**Safe Checks:**
- Notice if the grinding happens on all four wheels or just one.
- Check if braking performance has decreased (longer stopping distances).
- Look through the wheel spokes for visible wear on the brake pads.

**Recommendation:** Book a brake inspection soon. Driving on grinding brakes wears down rotors quickly, turning a pad replacement into a much more expensive rotor replacement.

Is the grinding constant, or only when you apply the brakes?`;
    }

    return `**You have a brake concern** — here's what it could be.

**Most Likely Causes:**
1. Worn brake pads (most common)
2. Worn or warped rotors
3. Low brake fluid
4. Sticky caliper

**Recommendation:** Have the brakes inspected at a workshop. Brake problems should never be ignored.

Can you describe exactly what you're experiencing — grinding, squealing, vibration, or a soft pedal?`;
  }

  // --- Transmission ---
  if (agentId === 'transmission') {
    return `**Your transmission is having issues** — let's identify the cause.

**Most Likely Causes:**
1. **Low or Degraded Transmission Fluid** — Low fluid causes jerking, slipping, and harsh shifts. Check first.
2. **Shift Solenoid Problem** — Electronic solenoids control gear changes; faults cause rough or delayed shifts.
3. **Worn Clutch (Manual)** — Slipping or difficulty engaging gears points to clutch wear.
4. **Torque Converter Issue (Automatic)** — Can cause shuddering during gear changes at low speeds.
5. **Internal Transmission Wear** — More serious; often accompanied by a warning light.

**Safe Checks:**
- Check the transmission fluid level and condition (should be pinkish-red, not dark or burnt-smelling).
- Note when it happens — at a specific speed, on cold start, or all the time?
- Check for a transmission warning light on the dashboard.

**Recommendation:** Have the transmission fluid checked and a diagnostic scan run for fault codes. Early attention prevents expensive damage.

Does the jerking/shifting problem happen only in certain gears, or all the time?`;
  }

  // --- Tires / Wheels / Vibration ---
  if (agentId === 'tires') {
    return `**Your car is vibrating or shaking** — here's what's most likely causing it.

**Most Likely Causes:**
1. **Unbalanced Wheels** — The most common cause of speed-related vibration (usually 80–110 km/h).
2. **Damaged or Flat-Spotted Tires** — A bubble, bulge, or flat spot causes rhythmic shaking.
3. **Bent Wheel/Rim** — Even a small bend causes noticeable vibration.
4. **Worn CV Joints** — Vibration or clicking specifically during acceleration or turns.
5. **Wheel Alignment Issue** — Causes pulling and uneven wear alongside vibration.

**Safe Checks:**
- Note the speed at which vibration starts and if it gets worse or disappears at higher speeds.
- Check tires visually for bulges, uneven wear, or obvious damage.
- Notice if the shaking comes from the steering wheel (front wheels) or the seat (rear wheels).

**Recommendation:** A wheel balance and tire inspection is the first step — quick and inexpensive at any workshop.

At roughly what speed does the vibration start or feel worst?`;
  }

  // --- Steering ---
  if (agentId === 'steering') {
    return `**Your steering is difficult or showing problems** — here's what to check.

**Most Likely Causes:**
1. **Low Power Steering Fluid** — Most common on hydraulic systems. Check the reservoir.
2. **Power Steering Pump Failure** — Whining noise + hard steering = pump issue.
3. **Faulty Electric Power Steering (EPS) Module** — If you have electric steering, a sensor or module fault can cause sudden stiffness.
4. **Worn Tie Rods or Steering Rack** — Loose or clunky steering feel.
5. **Low Tire Pressure** — Can make steering feel heavier than normal.

⚠️ **If steering becomes difficult while driving, safely reduce speed and pull over. Sudden steering loss is dangerous.**

**Recommendation:** Have the power steering system and front-end components inspected promptly.

Does the steering feel hard all the time, or only when turning at low speed?`;
  }

  // --- Oil ---
  if (agentId === 'oil') {
    const isPressure = text.includes('pressure') || text.includes('warning') || text.includes('light');
    if (isPressure) {
      return `⚠️ **An oil pressure warning is serious — stop the engine safely as soon as possible.**

Driving with low oil pressure can cause severe and irreversible engine damage within minutes.

**What to Do:**
1. Safely pull over and turn off the engine.
2. Wait 5 minutes, then check the oil level using the dipstick.
3. If oil level is normal, do NOT restart — have the vehicle towed for inspection.
4. If oil is low, add the correct grade and check if the light goes off after a restart.

**Most Likely Causes:**
- Low oil level (top priority to check)
- Oil pump failure
- Blocked oil filter
- Internal engine wear

**Recommendation:** Do not drive until the cause is identified.`;
    }

    return `**You have an oil-related concern** — here's guidance.

**For Oil Change Questions:**
- Most modern vehicles: every 8,000–12,000 km with synthetic oil, or per your owner's manual.
- Check your oil level monthly using the dipstick.

**For Oil Leaks:**
- Look for dark stains where you park.
- Check under the vehicle for wet or oily patches near the engine.

**For Burning Oil:**
- Blue/grey smoke from the exhaust is a sign of oil burning.
- Common causes: worn valve seals, piston rings, or PCV system issues.

**Recommendation:** Have the leak or consumption diagnosed at a workshop to prevent engine damage.

What specifically are you noticing — a warning light, a leak, or just due for a service?`;
  }

  // --- Maintenance ---
  if (agentId === 'maintenance') {
    return `**Here's a general maintenance guide for ${vName}.**

**Standard Service Intervals (general guidelines):**
- **Engine Oil & Filter:** Every 8,000–12,000 km (synthetic) or per your owner's manual.
- **Engine Air Filter:** Every 15,000–20,000 km or when visibly dirty.
- **Cabin Air Filter:** Every 15,000–20,000 km for clean airflow and AC efficiency.
- **Spark Plugs:** Every 40,000–100,000 km depending on plug type (copper vs. iridium).
- **Brake Fluid:** Every 2 years or 30,000 km (absorbs moisture over time).
- **Coolant Flush:** Every 60,000–100,000 km depending on the vehicle.
- **Transmission Fluid:** Every 40,000–80,000 km (check your manual for type).
- **Tire Rotation:** Every 8,000–10,000 km for even wear.

> **Note:** Driving conditions (short trips, extreme heat, towing, stop-and-go traffic) shorten all intervals. Always check your owner's manual for vehicle-specific specifications.

Is there a specific service item you'd like more detail on?`;
  }

  // --- Workshop Finder ---
  if (agentId === 'workshop') {
    return `**To find a reputable workshop near you**, here are the best approaches:

**How to Find a Good Workshop:**
1. **Google Maps** — Search "auto repair near me" or the specific service you need (e.g., "brake repair near [your city]"). Check reviews and ratings.
2. **Your Manufacturer's Website** — Find authorized service centers for warranty-backed work.
3. **Word of Mouth** — Ask friends or family for trusted mechanics they've used.
4. **Online Directories** — Sites like YellowPages or local automotive forums often list reputable shops.

**What to Look For:**
- Certified technicians (ASE certified or manufacturer-trained)
- Transparent pricing and written estimates
- Warranty on parts and labor
- Good customer reviews (4+ stars)
- Specialization relevant to your repair (e.g., transmission specialists, AC shops)

To give you more specific recommendations, could you share your city or area?`;
  }

  // --- Strange Noise ---
  if (agentId === 'noise') {
    return `**You're hearing a noise from your vehicle** — let's narrow it down.

The cause depends on where the noise comes from and when it happens.

**Common Noise Types:**
- **Grinding when braking** → Worn brake pads or rotors
- **Clicking when turning** → CV joint wear (especially on front-wheel drive)
- **Knocking from the engine** → Low oil, worn bearings, or detonation
- **Humming at speed** → Wheel bearing wear
- **Squealing when braking** → Brake pad wear indicators or glazed pads
- **Rattling over bumps** → Loose heat shield, suspension component, or exhaust

**To Help Me Diagnose This:**
- Where is the noise coming from? (front, rear, engine, underneath)
- When does it happen? (accelerating, braking, turning, at idle, over bumps)
- Is it affected by vehicle speed or engine RPM?`;
  }

  // --- Suspension ---
  if (agentId === 'suspension') {
    return `**Your suspension may need attention.** Here's what's likely going on.

**Most Likely Causes:**
1. **Worn Shock Absorbers or Struts** — Causes bouncing, poor handling, and a rough ride.
2. **Worn Bushings** — Rubber bushings degrade over time; causes clunking and imprecise handling.
3. **Ball Joint Wear** — Clunking over bumps; can be dangerous if a ball joint fails completely.
4. **Broken Spring** — Causes uneven ride height and a very harsh, bottoming-out feel on one corner.
5. **Worn Sway Bar Links** — Clunking noise when cornering or going over speed bumps.

**Safe Check:**
- Push down firmly on each corner of the car and release. More than 1–2 bounces = worn shocks/struts.
- Listen for clunking over speed bumps or rough road sections.

**Recommendation:** Have a suspension inspection done at a workshop, especially if you notice pulling, uneven tire wear, or clunking.

Is the problem mainly a rough/bouncy ride, or are you hearing specific clunking noises?`;
  }

  // --- Fuel Economy ---
  if (agentId === 'fuel-economy') {
    return `**Your fuel economy has dropped** — here's what's most likely causing it.

**Common Causes:**
1. **Low Tire Pressure** — Under-inflated tires increase rolling resistance. Check all four tires.
2. **Dirty Air Filter** — A clogged filter restricts airflow and forces the engine to work harder.
3. **Worn Spark Plugs** — Misfiring plugs reduce combustion efficiency.
4. **Short Trips** — Frequent cold starts use significantly more fuel.
5. **Aggressive Driving** — Hard acceleration and heavy braking dramatically reduce economy.
6. **Excessive Idling** — Idling burns fuel with zero distance covered.
7. **Faulty Oxygen or MAF Sensor** — Causes incorrect fuel mixture, leading to over-fuelling.
8. **Dragging Brakes** — A seized caliper creates constant resistance and burns extra fuel.

**Quick Checks:**
- Inflate tires to the recommended PSI (found on the door jamb sticker).
- Check when the air filter was last replaced.
- Note if the check engine light is on — it can indicate a sensor issue causing poor economy.

Has anything changed recently — new driving routes, weather, or recent service work?`;
  }

  // --- Car Starts Then Stalls ---
  if (agentId === 'stall') {
    return `**Your car starts but then stalls** — this needs diagnosis.

**Most Likely Causes:**
1. **Fuel Delivery Problem** — Weak fuel pump or clogged fuel filter starves the engine once it's running.
2. **Mass Airflow (MAF) Sensor Fault** — Incorrect air reading causes the engine to stall.
3. **Idle Air Control Valve (IAC)** — Controls idle speed; failure causes the engine to die at idle.
4. **Faulty Crankshaft Position Sensor** — Intermittent signal loss causes the engine to cut out.
5. **Vacuum Leak** — Causes rough idle that can't be sustained.
6. **Weak Alternator** — If the charging system can't support the electrical load, the engine may stall shortly after starting.

⚠️ **If the car stalls while driving, this is a safety concern.** Pull over safely if it happens.

**Recommendation:** Have a diagnostic scan (OBD-II) performed to read any fault codes stored in the ECU.

Does it stall immediately on start, after a few seconds, or only once it warms up?`;
  }

  // --- Electrical ---
  if (agentId === 'electrical') {
    return `**You have an electrical issue** — here's how to approach it.

**Common Electrical Problems:**
- **Lights not working** → Check the fuse first, then the bulb, then the wiring.
- **Power windows not working** → Fuse, window switch, or window motor.
- **Central locking issue** → Fuse, actuator, or key fob battery.
- **Battery draining overnight** → Parasitic drain; a workshop can test with a multimeter.
- **Flickering lights** → Loose battery terminal or failing alternator.

**Safe Check:**
- Always check the fuse box first (refer to your owner's manual for fuse locations).
- A blown fuse is an inexpensive fix — but if it blows again, there's an underlying short circuit.

**Recommendation:** Electrical faults can be tricky to trace. If fuse checks don't resolve it, a professional with a scan tool and wiring diagram will find it faster.

Which electrical component is giving you trouble?`;
  }

  // --- TPMS ---
  if (agentId === 'tpms') {
    return `**Your tire pressure warning light (TPMS) is on** — here's what to do.

**What It Means:**
One or more of your tires is below the recommended inflation pressure. Driving on under-inflated tires reduces fuel economy, handling, and tire lifespan — and increases blowout risk.

**What to Do:**
1. Check all four tire pressures with a gauge (don't forget the spare if your TPMS monitors it).
2. Inflate to the recommended PSI — found on the sticker inside your driver's door jamb (NOT the max PSI on the tire sidewall).
3. After inflating, drive for a few minutes. The TPMS light should turn off automatically.

**If the Light Stays On:**
- You may have a slow puncture or nail in the tire.
- One of the TPMS sensors may have a low battery (sensors last 5–10 years).

**Note:** VAYRA cannot provide your exact recommended PSI without your vehicle model. Always use the figure from your door jamb sticker.

Do you know which tire is low, or is the light on for all of them?`;
  }

  // --- Features ---
  if (agentId === 'features') {
    return `I'd be happy to explain that feature on ${vName}. The exact operation can vary depending on your trim level and model year.

Could you tell me which specific feature you'd like to know about? For example:
- Cruise control / Adaptive cruise control
- Lane keep assist
- Parking sensors or backup camera
- Climate control settings
- Drive modes (ECO, SPORT, etc.)
- Electronic parking brake / Auto-hold

Knowing your exact trim level will also help me give you the most accurate answer.`;
  }

  // --- Engine ---
  if (agentId === 'engine') {
    const isFlashing = text.includes('flash') || text.includes('blink');
    if (isFlashing) {
      return `⚠️ **A flashing (blinking) check engine light is urgent — avoid further driving.**

A flashing light indicates an active misfire that is damaging your catalytic converter right now. Unlike a steady check engine light, a flashing one should not be ignored.

**What to Do:**
- Reduce speed and avoid high engine loads.
- Pull over safely if the car feels rough or unstable.
- Have the vehicle towed to a workshop for immediate diagnostic scanning.

**Most Likely Causes:**
- Ignition coil failure
- Spark plug failure
- Fuel injector fault

Do not continue driving until a mechanic has scanned the fault codes.`;
    }

    return `**Your check engine light is on or your engine has a performance issue** — let's investigate.

**Most Likely Causes:**
1. **Spark Plug or Ignition Coil Fault** — Causes rough idle, misfires, and poor acceleration.
2. **Oxygen Sensor Fault** — Affects fuel economy and emissions; usually not a drivability emergency.
3. **Catalytic Converter Issue** — Poor performance and a rotten egg smell from the exhaust.
4. **MAF or Throttle Position Sensor** — Can cause hesitation, poor power, and rough idle.
5. **Vacuum Leak** — Causes rough idle and lean running condition.
6. **Fuel System Issue** — Weak fuel pump or clogged injectors affect power and starting.

**Recommendation:** An OBD-II diagnostic scan will give you the exact fault code(s) causing the light. Many auto parts stores offer free code reading.

Is the check engine light steady or flashing? And is the car driving normally, or do you notice any performance issues?`;
  }

  // --- Greetings / Casual Messages ---
  if (agentId === 'greeting') {
    return `Hi! I'm VAYRA, your automotive assistant. How can I help with your car?`;
  }

  // --- Strict Non-Automotive Scope Refusal ---
  if (agentId === 'non-automotive') {
    return `I'm VAYRA, an automotive assistant. I can only help with car and automotive-related questions.`;
  }

  // --- General Fallback ---
  return `I'm here to help with any question about ${vName}.

Ask me about:
- **Symptoms & problems** — I'll help identify possible causes and next steps.
- **Maintenance** — Service intervals, what's due and when.
- **Car features** — How specific features on your vehicle work.
- **Finding a workshop** — I'll guide you on how to find the right service.

What can I help you with?`;
}
