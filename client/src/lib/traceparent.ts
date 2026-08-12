/**
 * T042 — W3C traceparent header utility.
 *
 * Generates a fresh W3C traceparent string for each outbound HTTP request from
 * the Apollo client. This propagates a root trace context into the BFF so
 * temperature resolver spans can be correlated with the originating browser
 * operation in any OTEL-compatible backend (Constitution gate 15).
 *
 * Format: `00-<traceId>-<spanId>-01`
 *   - version:  `00`  (W3C spec fixed value)
 *   - traceId:  32 lowercase hex chars (128-bit)
 *   - spanId:   16 lowercase hex chars (64-bit)
 *   - flags:    `01`  (sampled)
 *
 * Uses `crypto.randomUUID()` which is available in all modern browsers and
 * Node 15+.  No external dependencies are required.
 */

/** Remove hyphens from a UUID and return the 32-char lowercase hex string. */
function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, '');
}

/**
 * Generate a W3C traceparent header value.
 *
 * @returns A string in the form `00-<traceId>-<spanId>-01`.
 */
export function generateTraceparent(): string {
  const traceId = uuidToHex(crypto.randomUUID());
  // SpanId is 64-bit (16 hex chars). Take the first 16 chars of another UUID.
  const spanId = uuidToHex(crypto.randomUUID()).slice(0, 16);
  return `00-${traceId}-${spanId}-01`;
}
