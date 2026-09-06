import fs from "fs";
import path from "path";

/**
 * Resolves the Rime API Key from process.env, .env, or .env.local dynamically.
 * This guarantees immediate recognition when the user pastes their API key into
 * .env or .env.local without requiring an explicit process restart.
 */
export function getRimeApiKey(): string {
  const envVal = process.env.RIME_API_KEY?.trim();
  if (envVal && envVal.length > 0 && envVal !== "RIME_MODEL=coda") {
    return envVal;
  }

  try {
    const rootDir = process.cwd();
    for (const filename of [".env", ".env.local", "tests/key.env"]) {
      const fullPath = path.join(rootDir, filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const match = content.match(/^[ \t]*RIME_API_KEY[ \t]*=[ \t]*(.*)$/m);
        if (match && match[1]) {
          const val = match[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
          if (val && val.length > 0) {
            process.env.RIME_API_KEY = val;
            return val;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to dynamically read .env file for RIME_API_KEY:", err);
  }

  // Clear corrupted cached value if empty
  if (process.env.RIME_API_KEY === "RIME_MODEL=coda" || process.env.RIME_API_KEY === "") {
    delete process.env.RIME_API_KEY;
  }

  return "";
}

/**
 * Persists a new RIME_API_KEY to process.env and updates the .env file.
 */
export function setRimeApiKey(newKey: string): void {
  const cleaned = newKey.trim();
  process.env.RIME_API_KEY = cleaned;

  try {
    const rootDir = process.cwd();
    const envPath = path.join(rootDir, ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf-8");
    }

    if (/^[ \t]*RIME_API_KEY[ \t]*=/m.test(content)) {
      content = content.replace(/^[ \t]*RIME_API_KEY[ \t]*=.*$/m, `RIME_API_KEY=${cleaned}`);
    } else {
      content = `RIME_API_KEY=${cleaned}\n` + content;
    }

    fs.writeFileSync(envPath, content, "utf-8");
  } catch (err) {
    console.warn("Failed to write RIME_API_KEY to .env file:", err);
  }
}

export function getLlmApiKey(): { key: string; provider: "groq" | "gemini" | "openai" | "ollama" | null } {
  // Try reading dynamically from tests/key.env and .env first so file edits are picked up immediately
  try {
    const rootDir = process.cwd();
    for (const filename of ["tests/key.env", ".env", ".env.local"]) {
      const fullPath = path.join(rootDir, filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");

        // 1. Groq
        const groqMatch = content.match(/^[ \t]*GROQ_API_KEY[ \t]*=[ \t]*(.*)$/m);
        if (groqMatch && groqMatch[1]) {
          const val = groqMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
          if (val && val.length > 5) {
            process.env.GROQ_API_KEY = val;
            return { key: val, provider: "groq" };
          }
        }

        // 2. Gemini
        const geminiMatch = content.match(/^[ \t]*(?:GEMINI_API_KEY|GOOGLE_API_KEY)[ \t]*=[ \t]*(.*)$/m);
        if (geminiMatch && geminiMatch[1]) {
          const val = geminiMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
          if (val && val.length > 5) {
            process.env.GEMINI_API_KEY = val;
            return { key: val, provider: "gemini" };
          }
        }

        // 3. OpenAI
        const openaiMatch = content.match(/^[ \t]*OPENAI_API_KEY[ \t]*=[ \t]*(.*)$/m);
        if (openaiMatch && openaiMatch[1]) {
          const val = openaiMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
          if (val && val.length > 5) {
            process.env.OPENAI_API_KEY = val;
            return { key: val, provider: "openai" };
          }
        }

        // 4. Ollama Host
        const ollamaMatch = content.match(/^[ \t]*OLLAMA_HOST[ \t]*=[ \t]*(.*)$/m);
        if (ollamaMatch && ollamaMatch[1]) {
          const val = ollamaMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
          if (val && val.length > 0) {
            process.env.OLLAMA_HOST = val;
            return { key: val, provider: "ollama" };
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to dynamically read LLM key from files:", err);
  }

  // Fallback to process.env
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq && groq.length > 5) return { key: groq, provider: "groq" };

  const gemini = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (gemini && gemini.length > 5) return { key: gemini, provider: "gemini" };

  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai && openai.length > 5) return { key: openai, provider: "openai" };

  const ollama = process.env.OLLAMA_HOST?.trim();
  if (ollama && ollama.length > 0) return { key: ollama, provider: "ollama" };

  return { key: "", provider: null };
}

export function setLlmApiKey(provider: "groq" | "gemini" | "openai" | "ollama", key: string): void {
  const cleaned = key.trim();
  const varName =
    provider === "groq"
      ? "GROQ_API_KEY"
      : provider === "gemini"
      ? "GEMINI_API_KEY"
      : provider === "openai"
      ? "OPENAI_API_KEY"
      : "OLLAMA_HOST";

  process.env[varName] = cleaned;

  try {
    const rootDir = process.cwd();
    for (const filename of [".env", "tests/key.env"]) {
      const filePath = path.join(rootDir, filename);
      let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
      const regex = new RegExp(`^[ \\t]*${varName}[ \\t]*=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${varName}=${cleaned}`);
      } else {
        content = `${varName}=${cleaned}\n` + content;
      }
      fs.writeFileSync(filePath, content, "utf-8");
    }
  } catch (err) {
    console.warn("Failed to write LLM key to file:", err);
  }
}


