import { test } from "node:test";
import assert from "node:assert/strict";
import { RATE_LIMIT_TABLE_SCHEMA, SHARED_DYNAMODB_TABLE_SCHEMAS } from "../dynamoDbSchemas.mjs";

/**
 * Schema well-formedness checks shared by every DynamoDbTableSchema. Returns
 * the schema so individual tests can add cross-checks.
 * @param {import("../dynamoDbSchemas.mjs").DynamoDbTableSchema} schema
 */
function assertWellFormed(schema) {
  assert.ok(schema.tableName, "tableName is required");
  assert.ok(schema.description, "description is required");
  assert.ok(Array.isArray(schema.keySchema) && schema.keySchema.length > 0, "keySchema must be a non-empty array");
  const hashKeys = schema.keySchema.filter((k) => k.keyType === "HASH");
  assert.equal(hashKeys.length, 1, "exactly one HASH key required");
  for (const key of schema.keySchema) {
    assert.ok(
      schema.attributeDefinitions.some((a) => a.attributeName === key.attributeName),
      `key attribute ${key.attributeName} must be in attributeDefinitions`,
    );
  }
  assert.ok(Array.isArray(schema.attributeDefinitions), "attributeDefinitions must be an array");
  for (const attr of schema.attributeDefinitions) {
    assert.ok(
      ["S", "N", "B"].includes(attr.attributeType),
      `attribute ${attr.attributeName} has invalid type ${attr.attributeType}`,
    );
  }
  assert.ok(schema.ttl && schema.ttl.attributeName, "ttl.attributeName required");
  assert.ok(Array.isArray(schema.globalSecondaryIndexes), "globalSecondaryIndexes must be an array");
  assert.ok(["PAY_PER_REQUEST", "PROVISIONED"].includes(schema.billingMode), "billingMode must be valid");
  assert.ok(
    Array.isArray(schema.ownerServices) && schema.ownerServices.length > 0,
    "ownerServices must be a non-empty array",
  );
  assert.ok(schema.exampleItem, "exampleItem required");
  for (const key of schema.keySchema) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(schema.exampleItem, key.attributeName),
      `exampleItem missing key attribute ${key.attributeName}`,
    );
  }
  assert.ok(
    Object.prototype.hasOwnProperty.call(schema.exampleItem, schema.ttl.attributeName),
    "exampleItem missing ttl attribute",
  );
  return schema;
}

test("SHARED_DYNAMODB_TABLE_SCHEMAS includes the rate-limit schema", () => {
  assert.ok(SHARED_DYNAMODB_TABLE_SCHEMAS.length > 0);
  assert.ok(SHARED_DYNAMODB_TABLE_SCHEMAS.some((s) => s.tableName === RATE_LIMIT_TABLE_SCHEMA.tableName));
});

test("RATE_LIMIT_TABLE_SCHEMA is well-formed", () => {
  assertWellFormed(RATE_LIMIT_TABLE_SCHEMA);
});

test("rate-limit table has a single string partition key 'pk'", () => {
  assert.equal(RATE_LIMIT_TABLE_SCHEMA.keySchema.length, 1);
  const [pk] = RATE_LIMIT_TABLE_SCHEMA.keySchema;
  assert.equal(pk.attributeName, "pk");
  assert.equal(pk.keyType, "HASH");
  const attr = RATE_LIMIT_TABLE_SCHEMA.attributeDefinitions.find((a) => a.attributeName === "pk");
  assert.equal(attr?.attributeType, "S");
});

test("rate-limit table TTL attribute is 'ttl' with per-call duration", () => {
  assert.equal(RATE_LIMIT_TABLE_SCHEMA.ttl.attributeName, "ttl");
  // seconds is null because the TTL duration is per-call (windowSeconds + ttlBuffer).
  assert.equal(RATE_LIMIT_TABLE_SCHEMA.ttl.seconds, null);
});

test("rate-limit example item conforms to the RateLimitItem shape", () => {
  const item = RATE_LIMIT_TABLE_SCHEMA.exampleItem;
  assert.equal(typeof item.pk, "string");
  assert.equal(typeof item.requestCount, "number");
  assert.equal(typeof item.windowStart, "number");
  assert.equal(typeof item.ttl, "number");
});

test("rate-limit table is shared by all six HTTP Lambda services", () => {
  const expected = ["chat-stream", "blueprint", "kb-builder", "metrics", "mcp-server", "session-token"];
  for (const svc of expected) {
    assert.ok(RATE_LIMIT_TABLE_SCHEMA.ownerServices.includes(svc), `ownerServices missing ${svc}`);
  }
  assert.equal(RATE_LIMIT_TABLE_SCHEMA.ownerServices.length, expected.length);
});

test("rate-limit table name matches the deployed default used by handlers", () => {
  // Matches the default in chat-stream, mcp-server, kb-builder, metrics, and
  // the fallback in blueprint/session-token index.mjs. If the deployed table
  // name changes, update the schema here so agents get the right table.
  assert.equal(RATE_LIMIT_TABLE_SCHEMA.tableName, "thechrisgrey-chat-ratelimit");
  assert.equal(RATE_LIMIT_TABLE_SCHEMA.tableNameEnvVar, "CHAT_RATE_LIMIT_TABLE");
});
