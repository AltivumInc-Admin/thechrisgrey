/**
 * @file Canonical DynamoDB schema for the Alti visitor-memory table
 * (`thechrisgrey-chat-memory`). Single source of truth for the key schema,
 * attributes, TTL, and item shape that `memory.mjs` assumes. Agents and
 * tooling can import this to understand the data model without reading prose
 * docs. Validated by `__tests__/memory.schema.test.mjs`, which cross-checks
 * the constants against `memory.mjs` so the schema cannot drift from the code.
 */

/**
 * Item shape for a remembered visitor fact.
 * @typedef {Object} ChatMemoryItem
 * @property {string} deviceHash - sha256(deviceId) (partition key).
 * @property {string} factId - `${paddedTimestamp}#${uuid}` (sort key; newest first via ScanIndexForward=false).
 * @property {string} content - Sanitized fact text (<=240 chars, PII-free per sanitizeFactContent).
 * @property {number} createdAt - Epoch seconds when the fact was written.
 * @property {number} ttl - Epoch seconds; 90-day DynamoDB TTL deletes the row after this.
 */

/**
 * Visitor memory table for the Alti chat agent. One row per remembered fact,
 * partitioned by device hash. 90-day TTL. PII is rejected before write
 * (`memory.mjs` `sanitizeFactContent`); emails and phone-shaped digit runs
 * never reach this table.
 *
 * @type {import("../shared/dynamoDbSchemas.mjs").DynamoDbTableSchema}
 */
export const CHAT_MEMORY_TABLE_SCHEMA = {
  tableName: "thechrisgrey-chat-memory",
  tableNameEnvVar: "CHAT_MEMORY_TABLE",
  description:
    "Per-visitor remembered facts for the Alti chat agent. Partitioned by device hash, 90-day TTL, PII rejected before write.",
  keySchema: [
    { attributeName: "deviceHash", keyType: "HASH" },
    { attributeName: "factId", keyType: "RANGE" },
  ],
  attributeDefinitions: [
    { attributeName: "deviceHash", attributeType: "S" },
    { attributeName: "factId", attributeType: "S" },
  ],
  ttl: { attributeName: "ttl", seconds: 90 * 24 * 60 * 60 },
  globalSecondaryIndexes: [],
  billingMode: "PAY_PER_REQUEST",
  ownerServices: ["chat-stream"],
  exampleItem: {
    deviceHash: "a1b2c3d4e5f6...",
    factId: "000000001721123200#f47ac10b-58cc-4372-a567-0e02b2c3d479",
    content: "Prefers concise answers without markdown.",
    createdAt: 1721123200,
    ttl: 1728908800,
  },
};
