import { useCallback, useState } from "react";

export interface ApiKeys {
  claude: string;
  openai: string;
  groq: string;
  together: string;
  gemini: string;
  github: string;
}

const STORAGE_KEYS = {
  claude: "apikey_claude",
  openai: "apikey_openai",
  groq: "apikey_groq",
  together: "apikey_together",
  gemini: "apikey_gemini",
  github: "github_pat",
} as const;

function readKeys(): ApiKeys {
  return {
    claude: localStorage.getItem(STORAGE_KEYS.claude) || "",
    openai: localStorage.getItem(STORAGE_KEYS.openai) || "",
    groq: localStorage.getItem(STORAGE_KEYS.groq) || "",
    together: localStorage.getItem(STORAGE_KEYS.together) || "",
    gemini: localStorage.getItem(STORAGE_KEYS.gemini) || "",
    github: localStorage.getItem(STORAGE_KEYS.github) || "",
  };
}

export function useApiKeys() {
  const [keys, setKeysState] = useState<ApiKeys>(readKeys);

  const saveKeys = useCallback((newKeys: ApiKeys) => {
    for (const [k, storageKey] of Object.entries(STORAGE_KEYS)) {
      const val = newKeys[k as keyof ApiKeys];
      if (val) {
        localStorage.setItem(storageKey, val);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
    setKeysState(newKeys);
  }, []);

  const refreshKeys = useCallback(() => {
    setKeysState(readKeys());
  }, []);

  return { keys, saveKeys, refreshKeys };
}
