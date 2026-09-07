import { getLlmApiKey } from "@/lib/config/env";

export interface AgentDecision {
  responseText: string;
  intent: "COMMAND_ACQUIRED" | "STATUS_METRICS" | "RESERVATION" | "INTERRUPTION_TEST" | "CONVERSATIONAL" | "LLM_GENERATED";
  toolCall?: {
    name: string;
    args: Record<string, any>;
    simulatedResult: Record<string, any>;
    delayMs?: number;
  };
}

/**
/**
 * Cleans text for spoken TTS audio playback (strips markdown code blocks, asterisks, etc.)
 */
function sanitizeForVoice(text: string): string {
  return text
    .replace(/```[a-zA-Z]*\n?/g, " ") // remove code block opening
    .replace(/```/g, " ") // remove code block closing
    .replace(/`([^`]+)`/g, "$1") // strip inline backticks
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1") // strip asterisks / bold / italics
    .replace(/^#+\s+/gm, "") // strip headers
    .replace(/^\s*[-*•]\s+/gm, "") // strip bullet points
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip markdown links
    .replace(/[_~]/g, "") // strip underscores and strikethrough
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calls Qwen AI Brain (DashScope / OpenAI-compatible endpoint) if configured.
 */
async function tryLlmGeneration(userInput: string, stateVersion: number): Promise<string | null> {
  const { key: llmKey, provider, model, baseUrl } = getLlmApiKey();

  const systemPrompt = `You are Astra, a brilliantly intelligent, real-time voice AI assistant powered by Rime Coda speech synthesis, LiveKit audio streaming, and VoiceTrace.
You can answer ANY question, fix code, debug software, write logic, analyze problems, give advice, and discuss any topic.
Rules for voice synthesis:
1. Speak naturally, warmly, intelligently, and directly (2 to 4 spoken sentences).
2. NEVER use markdown code fences, backticks, asterisks, bullet points, or emojis, because your response is synthesized directly into human speech by the TTS engine.
3. If explaining or writing code, explain the solution and code clearly in spoken words so it sounds natural when heard out loud.
Active state version is v${stateVersion}.`;

  // Qwen AI Brain (Qwen 2.5 / DashScope / OpenAI-compatible endpoint)
  if (provider === "qwen" && llmKey) {
    const candidateModels = [model || "qwen-plus", "qwen-turbo", "qwen2.5-72b-instruct", "qwen-max"];
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    for (const m of candidateModels) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${llmKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: m,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userInput },
            ],
            max_tokens: 350,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) return sanitizeForVoice(text);
        } else {
          console.warn(`Qwen (${m}) response not ok:`, res.status);
        }
      } catch (e) {
        console.warn(`Qwen (${m}) call failed:`, e);
      }
    }
  }

  return null;
}

/**
 * Intelligent semantic conversational agent: understands natural human queries
 * without sounding like a robotic template.
 */
export async function processVoiceCommand(
  userInput: string,
  stateVersion: number
): Promise<AgentDecision> {
  const text = userInput.trim().toLowerCase();

  // Try real LLM first if configured in environment
  const llmResponse = await tryLlmGeneration(userInput, stateVersion);
  if (llmResponse) {
    return {
      intent: "LLM_GENERATED",
      responseText: llmResponse,
    };
  }

  // 1. Name & Identity Queries
  if (
    text.includes("your name") ||
    text.includes("who are you") ||
    text.includes("what are you called") ||
    text.includes("what is your name") ||
    text.includes("who am i speaking to") ||
    text.includes("what's your name") ||
    text.includes("ask your name")
  ) {
    return {
      intent: "CONVERSATIONAL",
      responseText:
        "My name is Astra. I am your real-time voice AI assistant, synthesized live using Rime's Coda speech model and monitored by VoiceTrace.",
    };
  }

  // 2. Capabilities & Functionality
  if (
    text.includes("what can you do") ||
    text.includes("help me with") ||
    text.includes("capabilities") ||
    text.includes("features")
  ) {
    return {
      intent: "CONVERSATIONAL",
      responseText:
        "I can have natural voice conversations, handle table bookings, track real-time system latency, and demonstrate sub-35 millisecond barge-in interruptions whenever you speak.",
    };
  }

  // 3. Take command / Handshake
  if (
    text.includes("take command") ||
    text.includes("take access") ||
    text.includes("access of mic") ||
    text.includes("listen to me") ||
    text.includes("are you ready")
  ) {
    return {
      intent: "COMMAND_ACQUIRED",
      responseText: `Command authority established. VoiceTrace is actively listening to your microphone under state version v${stateVersion}. Rime real-time synthesis is active. How can I help you today?`,
      toolCall: {
        name: "acquire_command_authority",
        args: { inputMethod: "LIVE_BROWSER_MIC", stateVersion },
        simulatedResult: { status: "ACTIVE", audioStream: "16khz_pcm" },
        delayMs: 200,
      },
    };
  }

  // 4. Greetings & Pleasantries
  if (
    text === "hello" ||
    text === "hi" ||
    text === "hey" ||
    text.startsWith("hello ") ||
    text.startsWith("hey ") ||
    text.startsWith("hi ") ||
    text.includes("good morning") ||
    text.includes("good evening") ||
    text.includes("good afternoon")
  ) {
    const greetings = [
      "Hello! I am Astra, your voice assistant. What would you like to explore or test today?",
      "Hi there! All systems are online with low-latency Rime synthesis. What can I do for you?",
      "Hey! Great to hear your voice. What command should we run?",
    ];
    const picked = greetings[Math.floor(Math.random() * greetings.length)];
    return {
      intent: "CONVERSATIONAL",
      responseText: picked,
    };
  }

  // 5. How are you / Status check
  if (
    text.includes("how are you") ||
    text.includes("how's it going") ||
    text.includes("what's up") ||
    text.includes("how do you feel")
  ) {
    return {
      intent: "CONVERSATIONAL",
      responseText:
        "I'm feeling great! My speech synthesis pipeline is humming with sub-150 millisecond response times, and observed-output consistency is 100 percent active. How are you doing?",
    };
  }

  // 6. Gratitude & Goodbyes
  if (text.includes("thank you") || text.includes("thanks") || text.includes("appreciate it")) {
    return {
      intent: "CONVERSATIONAL",
      responseText: "You're very welcome! Feel free to ask another question or test an interruption whenever you'd like.",
    };
  }
  if (text.includes("bye") || text.includes("goodbye") || text.includes("see you")) {
    return {
      intent: "CONVERSATIONAL",
      responseText: "Goodbye! Have a wonderful day, and talk to you soon.",
    };
  }

  // 7. Time & Date
  if (text.includes("what time") || text.includes("current time") || text.includes("what is the time")) {
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return {
      intent: "CONVERSATIONAL",
      responseText: `The current time is ${now}.`,
    };
  }
  if (text.includes("what day") || text.includes("what date") || text.includes("today's date")) {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return {
      intent: "CONVERSATIONAL",
      responseText: `Today is ${today}.`,
    };
  }

  // 8. Jokes & Humor
  if (text.includes("joke") || text.includes("funny") || text.includes("make me laugh")) {
    const jokes = [
      "Why did the AI cross the road? Because it was programmed by a developer who forgot to implement stopping criteria!",
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "How many voice assistants does it take to change a lightbulb? Just one, but they might interrupt you halfway through!",
    ];
    return {
      intent: "CONVERSATIONAL",
      responseText: jokes[Math.floor(Math.random() * jokes.length)],
    };
  }

  // 9. Interruption / Barge-in Testing
  if (
    text.includes("interrupt") ||
    text.includes("barge in") ||
    text.includes("long speech") ||
    text.includes("story") ||
    text.includes("speak continuously") ||
    text.includes("don't stop")
  ) {
    return {
      intent: "INTERRUPTION_TEST",
      responseText:
        "Starting extended speech now. You can speak into your microphone at any second to test our sub-35 millisecond barge-in cancellation. The audio engine is currently streaming chunks through the Rime synthesis pipeline while continuously evaluating state version consistency across all pipeline stages. Speak now to interrupt me!",
      toolCall: {
        name: "test_barge_in_stream",
        args: { durationTargetMs: 8000 },
        simulatedResult: { status: "STREAMING" },
        delayMs: 150,
      },
    };
  }

  // 10. Latency & Telemetry
  if (
    text.includes("latency") ||
    text.includes("metrics") ||
    text.includes("health") ||
    text.includes("telemetry") ||
    text.includes("ttfa") ||
    text.includes("system status")
  ) {
    return {
      intent: "STATUS_METRICS",
      responseText: `All systems nominal. Rime Coda synthesis model is responding with average Time-to-First-Audio of 112 milliseconds. Observed-output consistency guards are active, with zero stale playback leaks.`,
      toolCall: {
        name: "query_system_telemetry",
        args: { metrics: ["ttfa", "stale_playback_leaks", "cancellation_latency"] },
        simulatedResult: { ttfaMs: 112, stalePlaybackLeaks: 0, cancellationLatencyMs: 14 },
        delayMs: 120,
      },
    };
  }

  // 11. Reservations & Table booking
  if (
    text.includes("reserve") ||
    text.includes("table") ||
    text.includes("book") ||
    text.includes("party of") ||
    text.includes("guests")
  ) {
    const partyMatch = text.match(/\b(\d+)\b/);
    const partyCount = partyMatch ? partyMatch[1] : "4";
    return {
      intent: "RESERVATION",
      responseText: `Reservation confirmed for ${partyCount} guests at Bella Italia. State version v${stateVersion} validated, and calendar dispatch has been committed.`,
      toolCall: {
        name: "reserve_table",
        args: { restaurant: "Bella Italia", partySize: parseInt(partyCount, 10), stateVersion },
        simulatedResult: { reservationId: `RES-${Math.floor(1000 + Math.random() * 9000)}`, status: "CONFIRMED" },
        delayMs: 300,
      },
    };
  }

  // 12. Arithmetic / Math (e.g. "what is 25 times 40", "what is 12 plus 15")
  const mathMatch = text.match(/what is (\d+)\s*(\+|\-|\*|\/|plus|minus|times|divided by)\s*(\d+)/);
  if (mathMatch) {
    const num1 = parseInt(mathMatch[1], 10);
    const op = mathMatch[2];
    const num2 = parseInt(mathMatch[3], 10);
    let result = 0;
    if (op === "+" || op === "plus") result = num1 + num2;
    else if (op === "-" || op === "minus") result = num1 - num2;
    else if (op === "*" || op === "times") result = num1 * num2;
    else if (op === "/" || op === "divided by") result = num2 !== 0 ? Math.round((num1 / num2) * 100) / 100 : 0;

    return {
      intent: "CONVERSATIONAL",
      responseText: `${num1} ${op} ${num2} equals ${result}.`,
    };
  }

  // 13. Coding & Software Debugging Queries (e.g. "can you fix a code", "help me debug", "write code")
  if (
    text.includes("fix a code") ||
    text.includes("fix code") ||
    text.includes("fix my code") ||
    text.includes("debug") ||
    text.includes("write code") ||
    text.includes("write a code") ||
    text.includes("can you code") ||
    text.includes("can u code") ||
    text.includes("programming") ||
    text.includes("python") ||
    text.includes("javascript") ||
    text.includes("typescript") ||
    text.includes("coding") ||
    text.includes("developer")
  ) {
    return {
      intent: "CONVERSATIONAL",
      responseText:
        "Yes, absolutely! I can analyze bugs, debug code, and explain software algorithms across Python, JavaScript, and TypeScript. For full open-ended code generation, you can also link your Qwen key in Settings. What code or error are you looking to fix?",
    };
  }


  // 14. "Can you..." General Capability Queries
  if (text.startsWith("can you ") || text.startsWith("could you ") || text.startsWith("are you able to ")) {
    return {
      intent: "CONVERSATIONAL",
      responseText:
        `Yes, I can certainly help with that! Tell me more about what you need, and we can work through it together.`,
    };
  }

  // 15. Dynamic Conversational Fallback (Spoken-first, intelligent dialogue)
  const thoughtfulResponses = [
    `I'm following along! Tell me more about what you'd like to do, and I'll assist you right away.`,
    `Got it. I am ready to help you with that or run any voice experiment you have in mind.`,
    `That sounds great. How would you like us to proceed?`,
  ];
  const selectedFallback = thoughtfulResponses[Math.abs(userInput.length) % thoughtfulResponses.length];

  return {
    intent: "CONVERSATIONAL",
    responseText: selectedFallback,
  };
}
