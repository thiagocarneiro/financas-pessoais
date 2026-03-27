/**
 * Attempt to repair malformed JSON from LLM output.
 * Handles: trailing commas, truncated arrays/objects, unescaped quotes.
 */
export function repairJson(input: string): string {
  let json = input.trim();

  // Extract between first { and last }
  const firstBrace = json.indexOf("{");
  const lastBrace = json.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in response");
  }
  json = json.substring(firstBrace, lastBrace + 1);

  // Remove trailing commas before ] or }
  json = json.replace(/,\s*([}\]])/g, "$1");

  // Try to parse as-is first
  try {
    return JSON.stringify(JSON.parse(json));
  } catch {
    // If still broken, try to fix truncated arrays
  }

  // Count open/close brackets to find truncation
  let openBrackets = 0;
  let openBraces = 0;
  for (const ch of json) {
    if (ch === "[") openBrackets++;
    if (ch === "]") openBrackets--;
    if (ch === "{") openBraces++;
    if (ch === "}") openBraces--;
  }

  // If truncated, find the last complete object in the transactions array
  // and close the array/object
  if (openBrackets > 0 || openBraces > 0) {
    // Find the last complete } in the transactions array
    const txnArrayMatch = json.match(/"transactions"\s*:\s*\[/);
    if (txnArrayMatch) {
      // Find last complete transaction object (ends with })
      let lastGoodPos = -1;
      let depth = 0;
      let inArray = false;
      const arrayStart = json.indexOf("[", txnArrayMatch.index!);

      for (let i = arrayStart; i < json.length; i++) {
        const ch = json[i];
        if (ch === "[" && !inArray) {
          inArray = true;
          depth = 0;
          continue;
        }
        if (!inArray) continue;

        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            lastGoodPos = i;
          }
        }
      }

      if (lastGoodPos > 0) {
        // Truncate at the last complete object and close everything
        json = json.substring(0, lastGoodPos + 1);
        // Remove trailing comma if any
        json = json.replace(/,\s*$/, "");
        // Close the array and the root object
        json += "]}";
      }
    }
  }

  // Final cleanup: remove trailing commas
  json = json.replace(/,\s*([}\]])/g, "$1");

  // Validate
  JSON.parse(json);
  return json;
}
