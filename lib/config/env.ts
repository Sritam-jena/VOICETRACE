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

export function getLlmApiKey(): {
  key: string;
  provider: "qwen" | null;
  model: string;
  baseUrl: string;
} {
  // Try reading dynamically from tests/key.env and .env first so file edits are picked up immediately
  try {
    const rootDir = process.cwd();
    for (const filename of ["tests/key.env", ".env", ".env.local"]) {
      const fullPath = path.join(rootDir, filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");

        // Qwen / DashScope
        const qwenMatch = content.match(/^[ \t]*(?:QWEN_API_KEY|DASHSCOPE_API_KEY)[ \t]*=[ \t]*(.*)$/m);
        if (qwenMatch && qwenMatch[1]) {
          const val = qwenMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
          if (val && val.length > 5) {
            process.env.QWEN_API_KEY = val;
            const modelMatch = content.match(/^[ \t]*QWEN_MODEL[ \t]*=[ \t]*(.*)$/m);
            const model = modelMatch?.[1]?.trim() || process.env.QWEN_MODEL || "qwen-plus";
            const baseMatch = content.match(/^[ \t]*QWEN_BASE_URL[ \t]*=[ \t]*(.*)$/m);
            const baseUrl = baseMatch?.[1]?.trim() || process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
            return { key: val, provider: "qwen", model, baseUrl };
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to dynamically read LLM key from files:", err);
  }

  // Fallback to process.env
  const qwen = (process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY)?.trim();
  if (qwen && qwen.length > 5) {
    return {
      key: qwen,
      provider: "qwen",
      model: process.env.QWEN_MODEL?.trim() || "qwen-plus",
      baseUrl: process.env.QWEN_BASE_URL?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    };
  }

  return {
    key: "",
    provider: null,
    model: "qwen-plus",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  };
}

export function setLlmApiKey(provider: "qwen", key: string, model: string = "qwen-plus"): void {
  const cleaned = key.trim();
  process.env.QWEN_API_KEY = cleaned;
  process.env.QWEN_MODEL = model;

  try {
    const rootDir = process.cwd();
    for (const filename of [".env", "tests/key.env"]) {
      const filePath = path.join(rootDir, filename);
      let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";

      if (/^[ \t]*QWEN_API_KEY[ \t]*=/m.test(content)) {
        content = content.replace(/^[ \t]*QWEN_API_KEY[ \t]*=.*$/m, `QWEN_API_KEY=${cleaned}`);
      } else {
        content = `QWEN_API_KEY=${cleaned}\n` + content;
      }

      if (/^[ \t]*QWEN_MODEL[ \t]*=/m.test(content)) {
        content = content.replace(/^[ \t]*QWEN_MODEL[ \t]*=.*$/m, `QWEN_MODEL=${model}`);
      } else {
        content = `QWEN_MODEL=${model}\n` + content;
      }

      // Purge old Gemini, Groq, OpenAI, Ollama keys
      content = content.replace(/^[ \t]*(?:GEMINI_API_KEY|GOOGLE_API_KEY|GROQ_API_KEY|OPENAI_API_KEY|OLLAMA_HOST)[ \t]*=.*$\r?\n?/gm, "");

      fs.writeFileSync(filePath, content, "utf-8");
    }
  } catch (err) {
    console.warn("Failed to write Qwen key to file:", err);
  }
}

export function getLiveKitConfig(): {
  isConfigured: boolean;
  url: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
} {
  let url = process.env.LIVEKIT_URL?.trim() || "";
  let apiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
  let apiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";

  try {
    const rootDir = process.cwd();
    for (const filename of [".env", ".env.local"]) {
      const fullPath = path.join(rootDir, filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const urlMatch = content.match(/^[ \t]*LIVEKIT_URL[ \t]*=[ \t]*(.*)$/m);
        if (urlMatch && urlMatch[1]) url = urlMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");

        const keyMatch = content.match(/^[ \t]*LIVEKIT_API_KEY[ \t]*=[ \t]*(.*)$/m);
        if (keyMatch && keyMatch[1]) apiKey = keyMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");

        const secretMatch = content.match(/^[ \t]*LIVEKIT_API_SECRET[ \t]*=[ \t]*(.*)$/m);
        if (secretMatch && secretMatch[1]) apiSecret = secretMatch[1].replace(/\r$/, "").trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch (err) {
    console.warn("Failed to dynamically read LiveKit config:", err);
  }

  return {
    isConfigured: Boolean(url && apiKey && apiSecret),
    url,
    hasApiKey: Boolean(apiKey && apiKey.length > 2),
    hasApiSecret: Boolean(apiSecret && apiSecret.length > 2),
  };
}

export function setLiveKitConfig(config: { url?: string; apiKey?: string; apiSecret?: string }): void {
  if (config.url !== undefined) process.env.LIVEKIT_URL = config.url.trim();
  if (config.apiKey !== undefined) process.env.LIVEKIT_API_KEY = config.apiKey.trim();
  if (config.apiSecret !== undefined) process.env.LIVEKIT_API_SECRET = config.apiSecret.trim();

  try {
    const rootDir = process.cwd();
    const envPath = path.join(rootDir, ".env");
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    const updates: Record<string, string | undefined> = {
      LIVEKIT_URL: config.url?.trim(),
      LIVEKIT_API_KEY: config.apiKey?.trim(),
      LIVEKIT_API_SECRET: config.apiSecret?.trim(),
    };

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        const regex = new RegExp(`^[ \\t]*${key}[ \\t]*=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${val}`);
        } else {
          content += `\n${key}=${val}`;
        }
      }
    }

    fs.writeFileSync(envPath, content, "utf-8");
  } catch (err) {
    console.warn("Failed to write LiveKit config to file:", err);
  }
}



