# Migration Execution Plan — thechrisgrey.com

**From:** AWS 205930636302 (Altivum production, profile `default`)
**To:** AWS 512880383078 (personal, profile `personal-dev`, SSO)
**Plan date:** 2026-09-01 · **Migration started:** 2026-08-28

> Every "current state" claim below was verified live against both accounts on 2026-09-01, not taken from notes.

---

## Execution log — 2026-09-01

### Phase 1 — Function URLs: **COMPLETE**

All 8 functions now carry both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`. Every endpoint reaches its handler:

| Function                   | HTTP | Meaning                                                               |
| -------------------------- | ---- | --------------------------------------------------------------------- |
| chat-stream                | 200  | handler ran                                                           |
| blueprint                  | 401  | handler auth                                                          |
| mcp-server                 | 202  | accepted                                                              |
| kb-builder                 | 401  | Cognito auth                                                          |
| session-token              | 403  | `forbidden_origin` — **handler**, not service (no `x-amzn-errortype`) |
| metrics                    | 404  | route not matched                                                     |
| contact-email / newsletter | 400  | input validation                                                      |

The 21-hour blocker was two unrelated problems sharing one symptom: a genuine Bedrock account restriction (lifted 10:38 CDT) and a Function URL policy gap that was never a restriction at all.

### Phase 2 — Ingestion: **COMPLETE**

| Data source                | Result                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `XJCD62RDOG` kb-source     | **COMPLETE** — 2 documents indexed, 0 failed               |
| `UG78ZHKEUN` podcast       | **COMPLETE** — 659 documents indexed, 0 failed             |
| `HCAIBOZSTJ` autobiography | FAILED — **inherited dead config, not a migration defect** |

**On `HCAIBOZSTJ`:** it points at `thechrisgrey-512880383078`, which is in **us-east-2** while its knowledge base is in us-east-1 — S3 data sources must be co-regional, so it fails at the S3 call. Checking the source account settles it: the equivalent data source there (`SCUWAWO44T`) has exactly **one** ingestion in its entire history, a `FAILED` one from 2026-01-18. It has never worked. The live source is `Autobiography-Source-US-East-1`, with repeated `COMPLETE` runs through 2026-03-04 — whose target equivalent (`XJCD62RDOG`) succeeded above, indexing the same content as `Autobiography.txt`.

**Action:** delete `HCAIBOZSTJ` in the target as cleanup. The same dead data source in source disappears with teardown. No content is lost.

_Sequencing note:_ `XJCD62RDOG` and `HCAIBOZSTJ` share knowledge base `PSSJPTMXHQ`, which permits only one concurrent ingestion — starting both at once returns `ConflictException`. Any future re-run must serialize per KB.

### Phase 3 — Verification: **COMPLETE**

**Chat proven end to end in the target account.** A signed request returned:

> "Christian's favorite color is Ocean Blue, and his favorite color combination is Black and Gold."

Ocean Blue exists **only** in the knowledge base — no base model could produce it. That single answer proves the whole chain: Function URL → auth → Bedrock → KB retrieval → guardrail → streamed response.

#### The defect this caught: stale Bedrock resource IDs in IAM

The first run failed with two denials on `thechrisgrey-chat-stream-role`:

```
bedrock:Retrieve       on knowledge-base/PSSJPTMXHQ  -> AccessDenied
bedrock:ApplyGuardrail on guardrail/xiekxgo2pdoq     -> AccessDenied
```

**Cause:** migration rewrote the _account number_ in every IAM policy to `512880383078` correctly, but left the **Bedrock resource IDs** pointing at the source account's resources. The ARNs were well-formed and named things that do not exist here.

| Stale                       | Correct        |
| --------------------------- | -------------- |
| `knowledge-base/ARFYABW8HP` | `PSSJPTMXHQ`   |
| `knowledge-base/FCNAZHLCUH` | `AFLBVXFPUZ`   |
| `guardrail/5kofhp46ssob`    | `xiekxgo2pdoq` |

**4 of 9 roles were affected** — chat-stream (2 policies), mcp-server, blueprint, kb-sync. All 5 policies rewritten, backups in `scratchpad/iam-backup/`, full re-scan clean.

**Why this one mattered more than it looks.** Retrieval failed _silently_: the agent logged `kb_retrieval_error` and carried on. Only the guardrail denial produced a visible error. **Had the guardrail permission been correct, chat would have returned fluent, confident, entirely ungrounded answers** — a migration that passes every smoke test while serving an Alti that knows nothing about Christian. A status-code check would have called it healthy.

**Fixed at the source too (commit `9f973d7`).** The repo's own `iam-policy.json` files hardcoded these IDs and would have reintroduced the bug on the next deploy. All seven now carry `${ACCOUNT_ID}`, `${KB_ID}`, `${PODCAST_KB_ID}` and `${GUARDRAIL_ID}` placeholders, and `scripts/iam-drift.sh` expands them before comparing — defaulting to the original account so nothing changes when no env is exported. Verified: every file expands to byte-identical canonical JSON against the previous revision, so the commit is semantically a no-op today and portable tomorrow.

#### Auth model note

chat-stream requires an `Authorization: Bearer <session token>`; `ALLOW_LEGACY_HMAC` is off by default. Verification temporarily enabled that flag (self-reverting, confirmed off afterwards, unsigned requests rejected again) because the session-token Lambda is Turnstile- and origin-gated and cannot be satisfied from a terminal. CORS was a red herring — it is browser-enforced and never applied to these checks; the session-token 403 came from an explicit server-side origin check.

#### Direct retrieval scores (measured separately)

- Main KB `PSSJPTMXHQ` → score **0.83**, returned Christian's actual biography (Guatemala City, Boston, Clarksville) and the AWS 10,000 AIdeas finalist record.
- Podcast KB `AFLBVXFPUZ` → score **0.90**, returned real Vector Podcast opening copy.

Both were run against `bedrock-agent-runtime retrieve` directly, before the IAM fix, using operator credentials rather than the Lambda role — which is precisely why they passed while the Lambda still failed. Useful as proof the _indexes_ were populated; not a substitute for the end-to-end run above.

---

## Where we actually are

**The live site is 100% on the source account and has never been otherwise.** `www.thechrisgrey.com` → `d3oenbnjnlnosx.cloudfront.net` (source CloudFront). Site returns 200, source chat endpoint returns 200. No visitor has ever been served by the target account.

**Roughly 70% built, 0% cut over.**

### Target account — verified present

| Component                    | State                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Amplify app `d3btl94rm91y13` | built OK (job 3, Aug 28)                                                                    |
| Amplify env vars             | **correct** — app-level (3 endpoints) + branch-level (11), all pointing at target resources |
| 9 Lambdas                    | deployed (7 × us-east-1, 2 × us-east-2)                                                     |
| DynamoDB                     | `thechrisgrey-chat-memory`, `thechrisgrey-chat-ratelimit` — parity with source              |
| CloudWatch alarms            | 17 configured                                                                               |
| Cognito                      | pool `us-east-1_jmYXP3xhs`, 1 CONFIRMED user                                                |
| Bedrock                      | **working** as of 10:38 CDT today; quotas 10k RPM / 5M TPM                                  |
| SES                          | production access granted, all 3 identities verified, domain DKIM SUCCESS                   |
| SNS                          | `thechrisgrey-site-alerts` subscription confirmed                                           |
| ACM                          | `mcp.thechrisgrey.com` ISSUED, attached to CloudFront `E1ZHL4EX1A6ICL`                      |
| S3                           | podcast source 1,318 objects; kb-source + autobiography populated                           |

### Target account — verified missing

| Gap                                                     | Impact                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Function URL policies lack `lambda:InvokeFunction`      | **all 8 URLs return 403** — blocks everything              |
| KB ingestion: **0 jobs ever run** on all 3 data sources | knowledge bases are **empty**; Alti would retrieve nothing |
| No Amplify domain association                           | target serves no custom domain                             |
| Cloudflare MCP disconnected (410)                       | cannot perform DNS cutover                                 |

---

## Phase 1 — Unblock Function URLs

**Why first:** nothing downstream can be verified while every endpoint 403s.

Function URLs created after **October 2025** require the resource policy to grant **both** `lambda:InvokeFunctionUrl` _and_ `lambda:InvokeFunction`. Ours grants only the first. Policies created before that change (i.e. the source account) work with one — which is exactly why this broke only in the target. Confirmed by AWS Lambda Premium Support on case `178800539300618`.

**Action:** run `scratchpad/fix-function-url-perms.sh` — adds the second statement to all 8 functions, scoped with `--invoked-via-function-url` so no other invocation path opens up. Idempotent.

**Gate:** every URL returns something other than a service-level 403. A handler-issued 400/401/405 is success — it means code ran.

**Rollback:** `aws lambda remove-permission --statement-id FunctionUrlAllowPublicInvoke`. Additive change, no downtime risk — the target serves no traffic.

## Phase 2 — Populate the knowledge bases

**Why it matters:** this is the single largest untested surface. The KBs have never ingested. Until they do, the target's Alti is a shell.

Three ingestion jobs (already scripted, fires automatically once Phase 1 clears):

| KB           | Data source  | Bucket                                                        |
| ------------ | ------------ | ------------------------------------------------------------- |
| `PSSJPTMXHQ` | `XJCD62RDOG` | `thechrisgrey-kb-source-512880383078`                         |
| `PSSJPTMXHQ` | `HCAIBOZSTJ` | `thechrisgrey-512880383078`                                   |
| `AFLBVXFPUZ` | `UG78ZHKEUN` | `thechrisgrey-kb-podcast-source-512880383078` (1,318 objects) |

**Gate:** all three reach `COMPLETE`. Any `FAILED` surfaces its `failureReasons`. Podcast is the large one — expect the longest run.

**Rollback:** none needed; ingestion is additive and idempotent.

## Phase 3 — Verify the target stack end to end

Existence is not function. This phase proves behavior.

1. **Endpoint suite** (scripted) — all 8 URLs + a real HMAC-signed chat-stream request returning a streamed answer.
2. **RAG proof** — ask Alti something only the KB knows. A fluent answer with no retrieval is a _failure_, and the most likely way an empty-KB migration passes unnoticed.
3. **Cognito admin login** to `/admin` against the target pool.
4. **Contact + newsletter** submission through target Lambdas, confirming SES delivery.
5. **Amplify build** from a clean commit against target env vars.

**Gate:** all five observed working. Per the project's own hard-won rule, "tests pass" ≠ "it works" — this phase is the difference.

## Phase 4 — Cutover: **COMPLETE (2026-09-03 23:43 CDT)**

**thechrisgrey.com is now served by account 512880383078.** Option A was chosen and executed.

### Timeline

| Time     | Event                                                                          |
| -------- | ------------------------------------------------------------------------------ |
| 23:37:40 | source domain association deleted — downtime begins                            |
| 23:37:44 | claimed on target (4s gap)                                                     |
| 23:37:54 | `PENDING_VERIFICATION`; required cert record **already present** in Cloudflare |
| ~23:39   | DNS flipped to `d3cs6wvq0asy3d.cloudfront.net` while still down                |
| 23:40:31 | **first 200 — downtime ends, 2m51s total**                                     |
| 23:43:57 | domain `AVAILABLE`                                                             |

**Downtime was 2 minutes 51 seconds**, far below the "unknown, potentially long" estimate.

### Two things made it short

1. **The ACM validation record was already correct.** ACM issues the _same_ validation CNAME for a given domain across certificates, so the source's existing `_a7e030c3…` record validated the target's brand-new cert with no DNS change at all. Cert issuance dropped out of the critical path entirely.
2. **DNS was flipped while the site was already down.** Both origins were failing anyway, so moving DNS early took propagation off the critical path — the instant the target CloudFront came up, traffic was already pointed at it.

### Verified after cutover

- **Serving from target, proven by content hash:** `thechrisgrey.com` = `90c0203433f843d1` = target default domain; source default = `b2490cea580deb03`.
- All routes 200; unknown paths return a real 404; blog dynamic routes 200.
- 4/4 security headers intact (HSTS, CSP, nosniff, frame-options).
- **session-token origin check now passes** — returns `invalid_device_id` rather than `forbidden_origin`, resolving the pre-cutover chicken-and-egg.

**Not a regression:** `/admin` and `/blueprint` return 404 — but they do on _both_ apps' default domains, with identical rewrite rules. A pre-existing SPA deep-link gap worth its own look, unrelated to the migration.

**Quirk:** Amplify reports apex `verified=False` while status is `AVAILABLE` and the apex serves 200 — Cloudflare flattens the apex CNAME, so Amplify's CNAME check can't see it. Cosmetic.

### Rollback (still available)

Point apex + `www` back to `d3oenbnjnlnosx.cloudfront.net` (60s TTL) **and** re-create the domain association on source app `d3du8eg39a9peo` (apex + `www` → branch `main`). The source app, its Lambdas, and its knowledge bases are all still intact.

---

## Phase 4 — original analysis (retained for the record)

### Done

- **Cloudflare access restored** via the `cloudflare-api` MCP (not `cloudflare-builds`, which is Workers CI/CD only). Zone `thechrisgrey.com` = `6767430a4b8706c17749f181b6e3d9a1`, active, 21 records, read/write confirmed.
- **TTL lowered to 60s** on apex and `www` (both were "Auto" = 300s, both DNS-only/grey-cloud so DNS alone decides who serves). Verified live: apex cycles 60→40→20→60; `www` drains its old 300s window then follows. Content unchanged, no traffic moved, site still 200.

### The blocker: Amplify will not share a domain across apps

Attempting the domain attach returned:

```
BadRequestException: One or more domains requested are already associated
with another Amplify app: thechrisgrey.com, www.thechrisgrey.com
```

Source app `d3du8eg39a9peo` holds it (`AVAILABLE`, subdomain `www`). **The restriction holds across AWS accounts** — the target cannot claim the domain until the source releases it. The original plan assumed the target could be fully staged before the DNS flip. It cannot.

This inverts the risk profile. The sequence is forced to be:

1. **Delete** the domain association on source → the live site's custom domain stops resolving to a working origin
2. Create the association on target
3. Amplify provisions a **new ACM cert** → add its validation CNAME
4. Wait for `AVAILABLE`
5. Flip DNS

**Downtime runs from step 1 to step 5**, and DNS TTL does not help — the bottleneck is Amplify provisioning, not propagation. The target has **no pre-validated cert** for the apex or `www` (only `mcp.thechrisgrey.com` is ISSUED), so certificate issuance sits inside the window. AWS documentation does not give a reliable activation figure and none was found; treat the duration as **unknown and potentially long**.

### Option A — accept a maintenance window

Run the sequence above at the lowest-traffic hour, with every command staged in advance so the gap is provisioning time and nothing else.

- **Honest:** simple, no architectural change, well-understood rollback (re-associate on source).
- **Cost:** the site is down for an unknown period, plausibly tens of minutes.

### Option B — Cloudflare proxy + Origin Rule (no downtime)

Proxy apex/`www` through Cloudflare (orange cloud) and add an Origin Rule overriding the `Host` header and resolved origin to `main.d3btl94rm91y13.amplifyapp.com`. The target then serves the custom domain **without any Amplify domain association**, so the source never has to release it first and there is no gap.

- **Honest:** no downtime, and reversible by disabling one rule.
- **Cost:** genuinely changes the architecture. Cloudflare moves from DNS-only to in-path proxy, which touches TLS mode, the CSP/analytics assumptions, and caching behaviour. Origin Rules also _require_ proxying. This is a bigger change than the migration set out to make, and it deserves testing on a subdomain before the apex.

### Recommendation

**Option A, scheduled**, unless the downtime is unacceptable. It keeps the architecture unchanged and matches what has already been verified. Option B is worth prototyping on `mcp.thechrisgrey.com` first if a zero-downtime cutover is a hard requirement.

Either way, once traffic is on target: verify 200s across all 17 routes, chat streaming, Web Vitals reporting, CSP violations flat.

**Rollback:** re-point the CNAME (60s TTL, ~2 minutes) and, under Option A, re-associate the domain on source. **This is the only step that touches live traffic.**

**Do not proceed to Phase 5 for at least 48 hours.**

## Phase 5 — Decommission source _(requires explicit go-ahead, itemized)_

**Handle with care.** The source account is shared Altivum infrastructure, not a single-project account. Verified today:

- **10 Amplify apps** — only `d3du8eg39a9peo` belongs to this project
- **24 DynamoDB tables** — only 2 are `thechrisgrey-*`; the rest are Regain, portal, sitrep, vetroi, BLS
- **3 knowledge bases**

**Deliberately staying in source:** `altivum-media-assets` CDN (`d1x8296f4gso9u`) — shared Altivum infrastructure the site references.

**Also to remove:** orphaned CloudFront `E2MWY7TMWIJHVY` (dead Amplify origin); in the _target_, the temporary `migration-url-probe` function + role.

**Nothing gets deleted without a final itemized list, reviewed by Christian, one resource at a time.**

---

## Risk register

| Risk                                     | Likelihood                      | Mitigation                               |
| ---------------------------------------- | ------------------------------- | ---------------------------------------- |
| Empty/partial KB reaches production      | **high** — 0 ingestions to date | Phase 3 RAG proof, not just a 200        |
| DNS cutover with a long TTL              | medium                          | drop to 60s an hour ahead                |
| Deleting a shared Altivum resource       | medium                          | itemized review; source is multi-project |
| Signing-key / env drift between accounts | low                             | verified today: env vars correct         |
| Source deleted before target proven      | low                             | 48-hour soak enforced                    |

## Open items needing Christian

1. **Run the Phase 1 script** (or grant `aws lambda add-permission` permission).
2. **Reconnect the Cloudflare MCP** — blocks Phase 4.
3. **Go/no-go on cutover** (Phase 4) and on **each deletion** (Phase 5).
