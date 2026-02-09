// Import polyfill FIRST before AWS SDK
import "../polyfills/structuredClone";

import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AWSErrorName } from "@constants/awsErrors";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { simpleHash } from "@utils/system/simpleHash";
import { TranslationMemoryService } from "@services/TranslationMemoryService";
import type { LanguageCode } from "@services/translationTypes";

const DEFAULT_SOURCE_LANGUAGE: LanguageCode = "en";
const CACHE_PREFIX = "translation_cache:";
const CACHE_EXPIRY_DAYS = 30; // Cache translations for 30 days

interface TranslationCache {
  translatedText: string;
  timestamp: number;
}

// In-memory cache for pending requests (prevents duplicate API calls)
interface PendingRequest {
  promise: Promise<string>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const PENDING_REQUEST_TIMEOUT = 60000; // 1 minute timeout for pending requests
let globalCleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Service for translating text using AWS Translate
 * Includes caching to minimize API calls and request deduplication
 */
export class TranslationService {
  private client: TranslateClient | null = null;
  private region: string;

  constructor(region: string = "us-east-1") {
    this.region = region;
    this.initializeClient();
    // Clean up stale pending requests periodically (only start once globally)
    this.startCleanupInterval();
  }

  /**
   * Start the cleanup interval for stale pending requests
   * Only creates one global interval to avoid memory leaks
   */
  private startCleanupInterval(): void {
    // Only start one interval globally (check if already exists)
    if (!globalCleanupInterval) {
      globalCleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, request] of pendingRequests.entries()) {
          if (now - request.timestamp > PENDING_REQUEST_TIMEOUT) {
            pendingRequests.delete(key);
          }
        }
      }, 30000); // Clean up every 30 seconds
    }
  }

  /**
   * Cleanup method to clear intervals (useful for testing)
   */
  static destroyCleanupInterval(): void {
    if (globalCleanupInterval) {
      clearInterval(globalCleanupInterval);
      globalCleanupInterval = null;
    }
  }

  /**
   * Initialize AWS Translate client
   * Uses credentials from (in order of priority):
   * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, optional AWS_SESSION_TOKEN)
   * 2. AWS credentials file (~/.aws/credentials) - if available
   * 3. IAM role (if running on EC2/Lambda)
   */
  private initializeClient(): void {
    try {
      const config: { region: string; credentials?: any } = {
        region: this.region,
      };

      const logger = getServiceLogger("TranslationService");
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        // Priority 1: Use environment variables
        logger.info("Using credentials from environment variables");
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
        if (process.env.AWS_SESSION_TOKEN) {
          config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
        }
      } else {
        // Priority 2+: Let SDK use default credential provider chain
        // This will try: env vars, credentials file, IAM role
        logger.info("Using default credential provider chain");
      }

      this.client = new TranslateClient(config);
    } catch (error) {
      getServiceLogger("TranslationService").error(
        "Error initializing Translate client",
        error
      );
      this.client = null;
    }
  }

  /**
   * Generate cache key for a translation
   */
  private getCacheKey(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): string {
    // Use first 100 chars + hash for key (to avoid extremely long keys)
    const textKey =
      text.length > 100 ? text.substring(0, 100) + simpleHash(text) : text;
    const textHash = simpleHash(textKey);
    return `${CACHE_PREFIX}${sourceLanguage}:${targetLanguage}:${textHash}`;
  }

  /**
   * Get request key for deduplication
   */
  private getRequestKey(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): string {
    return `${sourceLanguage}:${targetLanguage}:${simpleHash(text)}`;
  }

  /**
   * Get cached translation if available
   */
  private async getCachedTranslation(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string | null> {
    try {
      const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        const cacheData: TranslationCache = JSON.parse(cached);
        const now = Date.now();
        const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        // Check if cache is still valid
        if (now - cacheData.timestamp < expiryTime) {
          return cacheData.translatedText;
        } else {
          // Cache expired, remove it
          await AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      getServiceLogger("TranslationService").error(
        "Error reading cache",
        error
      );
    }

    return null;
  }

  /**
   * Cache a translation
   */
  private async cacheTranslation(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    translatedText: string
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
      const cacheData: TranslationCache = {
        translatedText,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      getServiceLogger("TranslationService").error(
        "Error caching translation",
        error
      );
    }
  }

  /**
   * Translate text using AWS Translate
   * @param text - Text to translate
   * @param targetLanguage - Target language code (default: "en")
   * @param sourceLanguage - Source language code (default: "en", auto-detect if not provided)
   * @returns Translated text or original text if translation fails
   */
  async translateText(
    text: string,
    targetLanguage: LanguageCode = "en",
    sourceLanguage: LanguageCode = DEFAULT_SOURCE_LANGUAGE
  ): Promise<string> {
    const logger = getServiceLogger("TranslationService");
    // Return original text if no translation needed
    if (
      sourceLanguage === targetLanguage ||
      !text ||
      text.trim().length === 0
    ) {
      logger.debug(
        "Skipping translation",
        {
          sourceLanguage,
          targetLanguage,
          reason:
            sourceLanguage === targetLanguage ? "same language" : "empty text",
        },
        undefined,
        "📝"
      );
      return text;
    }

    // Check long-lived translation memory first (offline-capable)
    const memoryHit = await TranslationMemoryService.getTranslation(
      text,
      sourceLanguage,
      targetLanguage
    );
    if (memoryHit) {
      return memoryHit;
    }

    logger.debug(
      "translateText called",
      {
        text: text.substring(0, 50),
        sourceLanguage,
        targetLanguage,
        hasClient: !!this.client,
      },
      undefined,
      "📝"
    );

    // Check cache first
    const cached = await this.getCachedTranslation(
      text,
      sourceLanguage,
      targetLanguage
    );
    if (cached) {
      logger.debug(
        "Using cached translation",
        {
          text: text.substring(0, 50),
          cached: cached.substring(0, 50),
        },
        undefined,
        "📝"
      );
      return cached;
    }

    // Check for pending request (deduplication)
    const requestKey = this.getRequestKey(text, sourceLanguage, targetLanguage);
    const pending = pendingRequests.get(requestKey);
    if (pending) {
      return pending.promise;
    }

    // If client not initialized, return original text
    if (!this.client) {
      return text;
    }

    // Create new request promise
    const translationPromise = this.performTranslation(
      text,
      sourceLanguage,
      targetLanguage
    );

    // Store pending request
    pendingRequests.set(requestKey, {
      promise: translationPromise,
      timestamp: Date.now(),
    });

    // Clean up after completion (catch errors to prevent unhandled rejections)
    translationPromise
      .then(() => {
        pendingRequests.delete(requestKey);
      })
      .catch(() => {
        pendingRequests.delete(requestKey);
      });

    return translationPromise;
  }

  /**
   * Perform the actual translation API call
   */
  private async performTranslation(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string> {
    const logger = getServiceLogger("TranslationService");
    // Safety check: client should be initialized before calling this method
    if (!this.client) {
      logger.warn(
        "Client not initialized in performTranslation, returning original text"
      );
      return text;
    }

    try {
      // Clean HTML tags from text before translation
      const cleanText = text.replace(/<[^>]*>/g, "").trim();

      if (!cleanText) {
        return text; // Return original if cleaned text is empty
      }

      // AWS Translate has a limit of 10,000 bytes per request
      // Split long text into chunks if needed
      const maxBytes = 10000;

      // Calculate UTF-8 byte length (React Native compatible)
      let textBytes: number;
      try {
        // Try using TextEncoder if available (modern React Native)
        if (typeof TextEncoder !== "undefined") {
          textBytes = new TextEncoder().encode(cleanText).length;
        } else {
          // Fallback: approximate UTF-8 byte length
          // Most characters are 1 byte, but some are 2-4 bytes
          // This is a conservative estimate
          textBytes = cleanText.length * 2; // Approximate: assume average 2 bytes per char
        }
      } catch {
        // Fallback to character count * 2 (conservative estimate)
        textBytes = cleanText.length * 2;
      }

      if (textBytes > maxBytes) {
        // Truncate to fit within limit (approximate)
        const truncated = cleanText.substring(
          0,
          Math.floor((maxBytes / textBytes) * cleanText.length)
        );
        return await this.translateText(
          truncated,
          targetLanguage,
          sourceLanguage
        );
      }

      const command = new TranslateTextCommand({
        Text: cleanText,
        SourceLanguageCode: sourceLanguage,
        TargetLanguageCode: targetLanguage,
      });

      const response = await this.client.send(command);

      if (response.TranslatedText) {
        const translatedText = response.TranslatedText;

        // Cache the translation
        await this.cacheTranslation(
          text,
          sourceLanguage,
          targetLanguage,
          translatedText
        );

        // Persist to translation memory for future offline use
        await TranslationMemoryService.storeTranslation(
          text,
          translatedText,
          sourceLanguage,
          targetLanguage
        );

        return translatedText;
      } else {
        return text;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : undefined;

      // Check if it's a clock skew error
      const isClockSkewError =
        errorMessage.includes("Signature not yet current") ||
        errorMessage.includes(AWSErrorName.InvalidSignatureException) ||
        errorName === AWSErrorName.InvalidSignatureException;

      const logger = getServiceLogger("TranslationService");
      // Provide specific guidance for clock skew
      if (isClockSkewError) {
        logger.error(
          "Clock Skew Error Detected!",
          {
            issue: "Device clock is out of sync with AWS servers",
            solution: "Sync your device's date/time with network time",
            details:
              "AWS requires requests to be within 15 minutes of server time. Your device appears to be ahead by several days.",
            quickFix: "Check device settings → Date & Time → Set Automatically",
          },
          undefined,
          "📝"
        );
      }

      // Provide helpful error message for missing credentials
      if (
        errorMessage.includes("Credential") ||
        errorMessage.includes("credentials")
      ) {
        logger.warn(
          "AWS credentials not found. Translation disabled.",
          {
            suggestion:
              "Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (and optionally AWS_SESSION_TOKEN), or configure ~/.aws/credentials",
          },
          undefined,
          "📝"
        );
      }

      // Return original text on error
      return text;
    }
  }

  /**
   * Translate multiple texts in batch (optimized)
   * @param texts - Array of texts to translate
   * @param targetLanguage - Target language code
   * @param sourceLanguage - Source language code
   * @returns Array of translated texts
   */
  async translateBatch(
    texts: string[],
    targetLanguage: LanguageCode = "en",
    sourceLanguage: LanguageCode = DEFAULT_SOURCE_LANGUAGE
  ): Promise<string[]> {
    // Check cache for all texts first
    const results: string[] = [];
    const textsToTranslate: { index: number; text: string }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cached = await this.getCachedTranslation(
        text,
        sourceLanguage,
        targetLanguage
      );
      if (cached) {
        results[i] = cached;
      } else {
        results[i] = ""; // Placeholder
        textsToTranslate.push({ index: i, text });
      }
    }

    // Translate remaining texts in parallel (with deduplication)
    const translationPromises = textsToTranslate.map(({ index, text }) =>
      this.translateText(text, targetLanguage, sourceLanguage).then(
        translated => {
          results[index] = translated;
        }
      )
    );

    await Promise.all(translationPromises);

    return results;
  }

  /**
   * Clear translation cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      getServiceLogger("TranslationService").info(
        `Cleared ${cacheKeys.length} cached translations`,
        { count: cacheKeys.length }
      );
    } catch (error) {
      getServiceLogger("TranslationService").error(
        "Error clearing cache",
        error
      );
    }
  }
}

// Singleton instance
let translationServiceInstance: TranslationService | null = null;

/**
 * Get or create the translation service instance
 */
export const getTranslationService = (region?: string): TranslationService => {
  if (!translationServiceInstance) {
    translationServiceInstance = new TranslationService(region);
  }
  return translationServiceInstance;
};
