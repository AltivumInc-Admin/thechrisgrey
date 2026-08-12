import { test } from "node:test";
import assert from "node:assert/strict";
import { MEMORY_TABLE, MEMORY_TTL_SECONDS, MAX_FACT_LENGTH } from "../memory.mjs";
import { CHAT_MEMORY_TABLE_SCHEMA } from "../memory.schema.mjs";

test("CHAT_MEMORY_TABLE_SCHEMA is well-formed", () => {
  assert.ok(CHAT_MEMORY_TABLE_SCHEMA.tableName);
  assert.ok(CHAT_MEMORY_TABLE_SCHEMA.description);
  assert.equal(CHAT_MEMORY_TABLE_SCHEMA.keySchema.length, 2);
  const [hash, range] = CHAT_MEMORY_TABLE_SCHEMA.keySchema;
  assert.equal(hash.keyType, "HASH");
  assert.equal(range.keyType, "RANGE");
  for (const key of CHAT_MEMORY_TABLE_SCHEMA.keySchema) {
    assert.ok(
      CHAT_MEMORY_TABLE_SCHEMA.attributeDefinitions.some((a) => a.attributeName === key.attributeName),
      `key attribute ${key.attributeName} must be in attributeDefinitions`,
    );
  }
  for (const attr of CHAT_MEMORY_TABLE_SCHEMA.attributeDefinitions) {
    assert.ok(["S", "N", "B"].includes(attr.attributeType));
  }
  assert.ok(CHAT_MEMORY_TABLE_SCHEMA.ttl.attributeName);
  assert.equal(CHAT_MEMORY_TABLE_SCHEMA.billingMode, "PAY_PER_REQUEST");
  assert.ok(CHAT_MEMORY_TABLE_SCHEMA.ownerServices.includes("chat-stream"));
  assert.ok(CHAT_MEMORY_TABLE_SCHEMA.exampleItem);
});

test("chat-memory table name matches memory.mjs MEMORY_TABLE default", () => {
  // Cross-check: the schema must agree with the table name the handler uses.
  assert.equal(CHAT_MEMORY_TABLE_SCHEMA.tableName, MEMORY_TABLE);
});

test("chat-memory TTL matches memory.mjs MEMORY_TTL_SECONDS", () => {
  assert.equal(CHAT_MEMORY_TABLE_SCHEMA.ttl.attributeName, "ttl");
  assert.equal(CHAT_MEMORY_TABLE_SCHEMA.ttl.seconds, MEMORY_TTL_SECONDS);
  assert.equal(CHAT_MEMORY_TABLE_SCHEMA.ttl.seconds, 90 * 24 * 60 * 60);
});

test("chat-memory example item conforms to ChatMemoryItem shape", () => {
  const item = CHAT_MEMORY_TABLE_SCHEMA.exampleItem;
  assert.equal(typeof item.deviceHash, "string");
  assert.equal(typeof item.factId, "string");
  assert.equal(typeof item.content, "string");
  assert.equal(typeof item.createdAt, "number");
  assert.equal(typeof item.ttl, "number");
  assert.ok(item.content.length <= MAX_FACT_LENGTH, "example content must respect MAX_FACT_LENGTH");
});

test("chat-memory sort key is the factId used by memory.mjs", () => {
  const range = CHAT_MEMORY_TABLE_SCHEMA.keySchema.find((k) => k.keyType === "RANGE");
  assert.equal(range?.attributeName, "factId");
});
