/** Safely parses JSON strings that may be encoded multiple times (e.g. `"\"{...}\""`). @param input - Value that may be a JSON string (possibly encoded multiple times). @param maxDepth - Maximum number of parse attempts (defaults to 3). @returns Parsed value when possible; otherwise returns original input (or null if invalid at depth 0). */
export const safeJsonParseDeep = (
  input: unknown,
  maxDepth: number = 3
): unknown => {
  if (maxDepth <= 0) {
    return input;
  }

  if (typeof input !== "string") {
    return input;
  }

  let current: unknown = input;

  for (let depth = 0; depth < maxDepth; depth++) {
    if (typeof current !== "string") {
      return current;
    }

    try {
      current = JSON.parse(current);
    } catch {
      // If the very first parse fails, treat it as invalid JSON.
      // If a later parse fails, return the last successfully-decoded string.
      return depth === 0 ? null : current;
    }
  }

  return current;
};
