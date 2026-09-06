/**
 * @file Canonical DynamoDB table schema definitions for the tables lambda-shared
 * itself owns — today that is the fleet-wide rate-limit table, which every HTTP
 * Lambda writes to through `rateLimit.checkRateLimit`. Single source of truth
 * for its key schema, attributes, TTL, and owning services, so agents and
 * tooling can read the data model without grepping handler code.
 *
 * A table owned by ONE service keeps its schema next to that service's code and
 * imports the `DynamoDbTableSchema` typedef from here — see
 * `chat-stream/memory.schema.mjs`, whose test cross-checks the definition
 * against `memory.mjs` itself. SHARED_DYNAMODB_TABLE_SCHEMAS is therefore the
 * shared-owned registry, not a fleet-wide index; do not read an absence here as
 * "no such table".
 *
 * DynamoDB is schemaless at the service level, so these definitions describe
 * the logical schema each handler assumes (key attributes, item shape, TTL).
 * They are validated by __tests__/dynamoDbSchemas.test.mjs.
 */

/**
 * A DynamoDB table schema definition.
 * @typedef {Object} DynamoDbTableSchema
 * @property {string} tableName - Default table name (may be overridden by env var).
 * @property {string} tableNameEnvVar - Env var that overrides the table name at runtime.
 * @property {string} description - Human-readable purpose of the table.
 * @property {Array<{ attributeName: string, keyType: 'HASH' | 'RANGE' }>} keySchema - Partition and optional sort key.
 * @property {Array<{ attributeName: string, attributeType: 'S' | 'N' | 'B' }>} attributeDefinitions - Attribute types for keys/GSIs.
 * @property {{ attributeName: string, seconds: number | null }} ttl - TTL attribute and duration in seconds (null when per-call).
 * @property {Array<{ indexName: string, keySchema: Array<{ attributeName: string, keyType: 'HASH' | 'RANGE' }> }>} globalSecondaryIndexes - GSIs (empty if none).
 * @property {string} billingMode - 'PAY_PER_REQUEST' or 'PROVISIONED'.
 * @property {string[]} ownerServices - Services that read or write this table.
 * @property {Record<string, string | number>} exampleItem - A sample item conforming to the schema.
 */

/**
 * Item shape for the shared rate-limit table.
 * @typedef {Object} RateLimitItem
 * @property {string} pk - `${prefix}${sha256(ip)}` (or bare `sha256(ip)` when no prefix).
 * @property {number} requestCount - Atomic ADD counter for the current window.
 * @property {number} windowStart - Epoch seconds of the sliding-window start.
 * @property {number} ttl - Epoch seconds; DynamoDB TTL deletes the row after this.
 */

/**
 * Shared rate-limit table. Used by every HTTP Lambda for per-IP sliding-window
 * rate limiting via `lambda-shared/rateLimit.checkRateLimit`. Each service
 * writes with a distinct PK prefix (e.g. `metrics-vitals-`, `kb-builder-`,
 * `blueprint-`) so they share one table without key collision. The TTL duration
 * is per-call (windowSeconds + ttlBuffer), so `seconds` is null here.
 *
 * @type {DynamoDbTableSchema}
 */
export const RATE_LIMIT_TABLE_SCHEMA = {
  tableName: "thechrisgrey-chat-ratelimit",
  tableNameEnvVar: "CHAT_RATE_LIMIT_TABLE",
  description:
    "Shared per-IP sliding-window rate-limit counter for all HTTP Lambdas. PK prefix disambiguates services.",
  keySchema: [{ attributeName: "pk", keyType: "HASH" }],
  attributeDefinitions: [{ attributeName: "pk", attributeType: "S" }],
  ttl: { attributeName: "ttl", seconds: null },
  globalSecondaryIndexes: [],
  billingMode: "PAY_PER_REQUEST",
  ownerServices: ["chat-stream", "blueprint", "kb-builder", "metrics", "mcp-server", "session-token"],
  exampleItem: {
    pk: "metrics-vitals-a1b2c3d4e5f6...",
    requestCount: 42,
    windowStart: 1721123200,
    ttl: 1721123800,
  },
};

/** All DynamoDB table schemas defined in the shared library. */
export const SHARED_DYNAMODB_TABLE_SCHEMAS = [RATE_LIMIT_TABLE_SCHEMA];
