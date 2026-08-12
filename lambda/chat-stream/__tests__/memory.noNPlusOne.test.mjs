import { test } from "node:test";
import assert from "node:assert/strict";
import { getFacts, putFact, forgetDevice } from "../memory.mjs";

// N+1 query detection for the Alti visitor-memory table.
//
// getFacts reads a visitor's facts with paginated Query (pageSize = min(limit*2, 100))
// and forgetDevice deletes them with Query + BatchWrite in 25-item batches. These
// tests assert both operations use batch/bounded DB access and never issue a
// per-item Get or Delete. If someone rewrote forgetDevice to delete facts one at a
// time, or getFacts to GetItem per fact, these tests would fail (a DeleteCommand or
// GetCommand would appear, and the call count would scale linearly with item count).

class QueryCommand {
  constructor(input) {
    this.input = input;
    this.__name = "QueryCommand";
  }
}
class BatchWriteCommand {
  constructor(input) {
    this.input = input;
    this.__name = "BatchWriteCommand";
  }
}
class PutCommand {
  constructor(input) {
    this.input = input;
    this.__name = "PutCommand";
  }
}

/** Fake doc client that serves paginated Query results from a seeded item list. */
function paginatingClient(items) {
  const calls = [];
  return {
    calls,
    send: async (cmd) => {
      calls.push(cmd);
      const name = cmd.__name;
      if (name === "QueryCommand") {
        const limit = cmd.input.Limit || 100;
        let start;
        if (cmd.input.ExclusiveStartKey) {
          const idx = items.findIndex((it) => it.factId === cmd.input.ExclusiveStartKey.factId);
          start = idx + 1;
        } else {
          start = 0;
        }
        const page = items.slice(start, start + limit);
        const hasMore = start + limit < items.length;
        const last = page.length > 0 ? page[page.length - 1] : undefined;
        return {
          Items: page,
          LastEvaluatedKey: hasMore && last ? { deviceHash: last.deviceHash, factId: last.factId } : undefined,
        };
      }
      if (name === "BatchWriteCommand") return { UnprocessedItems: {} };
      if (name === "PutCommand") return {};
      return {};
    },
  };
}

function makeItems(n) {
  return Array.from({ length: n }, (_, i) => ({
    deviceHash: "hash",
    factId: `fact-${String(i).padStart(4, "0")}`,
    content: `fact ${i}`,
    createdAt: 1000 + i,
    ttl: 9999999999, // far future -> never expired in getFacts' TTL check
  }));
}

test("getFacts uses Query (paginated), never per-item Get (no N+1)", async () => {
  const items = makeItems(30);
  const client = paginatingClient(items);
  await getFacts(client, QueryCommand, "device-1", { limit: 20 });
  const types = client.calls.map((c) => c.__name);
  assert.ok(
    types.every((t) => t === "QueryCommand"),
    `getFacts should only Query, got ${types.join(", ")}`,
  );
  assert.ok(!types.includes("GetCommand"), "getFacts must not GetItem per fact (N+1)");
});

test("getFacts Query call count is sub-linear in item count (paginated, no N+1)", async () => {
  const items = makeItems(250);
  const client = paginatingClient(items);
  await getFacts(client, QueryCommand, "device-1", { limit: 200 });
  const queryCalls = client.calls.filter((c) => c.__name === "QueryCommand").length;
  // pageSize = min(200*2, 100) = 100 -> ceil(250/100) = 3 pages max, NOT 250 Gets.
  assert.ok(queryCalls <= 3, `getFacts should use <=3 Query pages, got ${queryCalls}`);
  assert.ok(queryCalls < 250, "getFacts must be sub-linear in item count (paginated Query, not per-item Get)");
});

test("forgetDevice uses BatchWrite (25-item batches), never per-item Delete (no N+1)", async () => {
  const items = makeItems(60);
  const client = paginatingClient(items);
  await forgetDevice(client, QueryCommand, BatchWriteCommand, "device-1");
  const types = client.calls.map((c) => c.__name);
  assert.ok(!types.includes("DeleteCommand"), "forgetDevice must not DeleteItem per fact (N+1)");
  assert.ok(types.includes("BatchWriteCommand"), "forgetDevice must batch deletes");
  const batchCalls = types.filter((t) => t === "BatchWriteCommand").length;
  // 60 items -> 3 BatchWrite calls (25 + 25 + 10), not 60 DeleteItem calls.
  assert.equal(batchCalls, 3, `60 items = 3 batch writes, got ${batchCalls}`);
});

test("forgetDevice BatchWrite call count is ceil(n/25), sub-linear in item count", async () => {
  for (const n of [25, 100, 250]) {
    const items = makeItems(n);
    const client = paginatingClient(items);
    await forgetDevice(client, QueryCommand, BatchWriteCommand, "device-1");
    const batchCalls = client.calls.filter((c) => c.__name === "BatchWriteCommand").length;
    const expected = Math.ceil(n / 25);
    assert.equal(batchCalls, expected, `${n} items should be ${expected} batch writes`);
    assert.ok(batchCalls < n, "batch writes must be sub-linear in item count (no N+1)");
  }
});

test("forgetDevice never issues GetCommand or per-item DeleteCommand", async () => {
  const items = makeItems(50);
  const client = paginatingClient(items);
  await forgetDevice(client, QueryCommand, BatchWriteCommand, "device-1");
  const types = client.calls.map((c) => c.__name);
  assert.ok(!types.includes("GetCommand"), "forgetDevice must not GetItem");
  assert.ok(!types.includes("DeleteCommand"), "forgetDevice must not DeleteItem per fact");
});

test("putFact makes exactly one PutCommand call (no N+1)", async () => {
  const client = paginatingClient([]);
  await putFact(client, PutCommand, "device-1", "a remembered fact");
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].__name, "PutCommand");
});
