#!/usr/bin/env bash
#
# Detect drift between each Lambda's committed iam-policy.json (desired state)
# and the live INLINE policy on its IAM role. READ-ONLY: never calls
# put-role-policy or any other write API.
#
# Role/policy names are an explicit, hand-verified map — we do NOT derive them
# from directory names. The naming is inconsistent (e.g. chat-stream's role is
# `thechrisgrey-chat-stream-role` per CLAUDE.md, while docs elsewhere say
# `chat-stream-lambda-role`), so guessing `thechrisgrey-<dir>-role` would
# mis-target a live role. Each entry below is only treated as authoritative if a
# repo source (docs/ runbook or CLAUDE.md) documents it.
#
# UNVERIFIED entries (metrics, kb-sync, mcp-server) have NO role/policy name
# documented anywhere in the repo. They are reported as UNVERIFIED — never
# checked against a guessed name — until confirmed. To confirm a real name, run:
#   aws lambda get-function-configuration \
#     --function-name thechrisgrey-<name> --region us-east-1 \
#     --query 'Role' --output text          # -> role ARN; tail is the role name
#   aws iam list-role-policies --role-name <thatRole> \
#     --query 'PolicyNames' --output text   # -> the inline policy name
# Then move the confirmed entry into MAP below.
#
# Usage:
#   bash scripts/iam-drift.sh              # check all mapped Lambdas
#   npm run iam:drift
#
# Exit code 0 = no drift across all CHECKED Lambdas (UNVERIFIED skips do not
# fail the run); 1 = drift or fetch error on a mapped Lambda.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# dir|role-name|policy-name
# VERIFIED ONLY — each name is documented in a repo source:
#   chat-stream : role  CLAUDE.md ("Role: thechrisgrey-chat-stream-role")
#                 policy docs/ai-chat-implementation-plan.md (chat-stream-permissions)
#   kb-builder  : docs/plans/2026-03-02-kb-admin-implementation.md
#   blueprint   : docs/blueprint/phase-5-deployment-runbook.md
MAP=(
  "kb-builder|thechrisgrey-kb-builder-role|kb-builder-policy"
  "chat-stream|thechrisgrey-chat-stream-role|chat-stream-permissions"
  "blueprint|thechrisgrey-blueprint-role|thechrisgrey-blueprint-policy"
)

# Lambdas with iam-policy.json but NO role/policy name documented in-repo.
# Format: dir|best-guess-role|best-guess-policy  (guess may be empty = UNKNOWN).
# These are REPORTED as UNVERIFIED and NOT checked, so a wrong guess can never
# mis-target a live role or produce a misleading OK/DRIFT line. Confirm with the
# aws commands in the header, then promote the entry into MAP above.
UNVERIFIED=(
  "metrics|thechrisgrey-metrics-role?|metrics-policy?"
  "kb-sync|UNKNOWN|UNKNOWN"
  "mcp-server|UNKNOWN|UNKNOWN"
)

# Account and Bedrock resource identifiers differ per AWS account, so the
# committed iam-policy.json files carry ${PLACEHOLDER} tokens instead of literals
# and are expanded here before comparison. Defaults mirror the env-first pattern
# used by the Lambda code (see 2647a8e): the value falls back to the ORIGINAL
# account so behaviour is unchanged when nothing is exported, while checking a
# different account is just:
#
#   ACCOUNT_ID=512880383078 KB_ID=PSSJPTMXHQ PODCAST_KB_ID=AFLBVXFPUZ \
#   GUARDRAIL_ID=xiekxgo2pdoq bash scripts/iam-drift.sh
#
# Hardcoding these literals is what let a migration copy policies with the right
# account number but the wrong knowledge-base and guardrail IDs -- ARNs that were
# well-formed yet named resources that did not exist, so bedrock:Retrieve failed
# SILENTLY while the agent answered anyway.
ACCOUNT_ID="${ACCOUNT_ID:-205930636302}"
KB_ID="${KB_ID:-ARFYABW8HP}"
PODCAST_KB_ID="${PODCAST_KB_ID:-FCNAZHLCUH}"
GUARDRAIL_ID="${GUARDRAIL_ID:-5kofhp46ssob}"

# Expand ${...} placeholders on stdin. Deliberately NOT `envsubst` (not present
# on a stock macOS) and NOT `eval` (the file is JSON, not shell).
expand() {
  sed -e "s/\${ACCOUNT_ID}/${ACCOUNT_ID}/g" \
      -e "s/\${KB_ID}/${KB_ID}/g" \
      -e "s/\${PODCAST_KB_ID}/${PODCAST_KB_ID}/g" \
      -e "s/\${GUARDRAIL_ID}/${GUARDRAIL_ID}/g"
}

# Canonicalize a JSON document on stdin to a deterministic string so that
# formatting / key-order differences don't register as drift. Sorts keys
# RECURSIVELY (a top-level `JSON.stringify(o, Object.keys(o).sort())` replacer
# would blank every nested object, making two policies that differ only inside
# Statement[] normalize identically -> a false OK that hides real drift).
canon() {
  node -e '
    let s = "";
    process.stdin.on("data", d => (s += d)).on("end", () => {
      const sort = (v) =>
        Array.isArray(v)
          ? v.map(sort)
          : v && typeof v === "object"
            ? Object.keys(v).sort().reduce((a, k) => ((a[k] = sort(v[k])), a), {})
            : v;
      process.stdout.write(JSON.stringify(sort(JSON.parse(s))));
    });
  '
}

# Pretty-print a JSON document on stdin (2-space indent) for human-readable
# diff output on the drift path. Shares the parse/stringify shape with canon().
pretty() {
  node -e '
    let s = "";
    process.stdin.on("data", d => (s += d)).on("end", () => {
      process.stdout.write(JSON.stringify(JSON.parse(s), null, 2));
    });
  '
}

lookup() {  # $1=dir field -> echoes "role|policy" or returns 1
  local dir="$1" entry
  for entry in "${MAP[@]}"; do
    [ "${entry%%|*}" = "$dir" ] && { echo "${entry#*|}"; return 0; }
  done
  return 1
}

unverified_hint() {  # $1=dir -> echoes "role|policy" guess or returns 1
  local dir="$1" entry
  for entry in "${UNVERIFIED[@]}"; do
    [ "${entry%%|*}" = "$dir" ] && { echo "${entry#*|}"; return 0; }
  done
  return 1
}

DRIFT=0
for dir in "$ROOT"/lambda/*/; do
  name="$(basename "$dir")"
  policy_file="$dir/iam-policy.json"
  [ -f "$policy_file" ] || continue

  if ! rolepol="$(lookup "$name")"; then
    if hint="$(unverified_hint "$name")"; then
      echo "UNVERIFIED $name — role/policy name not documented in-repo (guess: role=${hint%%|*} policy=${hint#*|}); confirm with 'aws lambda get-function-configuration --query Role' + 'aws iam list-role-policies' before trusting drift"
    else
      echo "SKIP   $name — no verified role/policy mapping (add to MAP after confirming the real role name)"
    fi
    continue
  fi
  role="${rolepol%%|*}"; policy="${rolepol#*|}"

  echo "==> $name  (role=$role policy=$policy)"
  live="$(aws iam get-role-policy --role-name "$role" --policy-name "$policy" \
            --query 'PolicyDocument' --output json 2>/tmp/iam-drift.err)"
  if [ $? -ne 0 ]; then
    echo "ERROR  $name — get-role-policy failed: $(cat /tmp/iam-drift.err)"
    DRIFT=1; continue
  fi

  # Normalize both sides (recursively sorted keys) so formatting differences
  # don't show as drift while real content differences still do. Guard canon's
  # exit status on the local file: if iam-policy.json is malformed, canon emits
  # nothing and we'd otherwise report a confusing DRIFT instead of the real
  # cause, so fail with a clear "invalid local policy" error.
  if ! desired="$(expand <"$policy_file" | canon)"; then
    echo "ERROR  $name — iam-policy.json is not valid JSON after placeholder expansion (canonicalization failed)"
    DRIFT=1; continue
  fi
  livenorm="$(printf '%s' "$live" | canon)"

  if [ "$desired" = "$livenorm" ]; then
    echo "OK     $name — live inline policy matches iam-policy.json"
  else
    echo "DRIFT  $name — live inline policy differs from iam-policy.json"
    diff <(printf '%s' "$desired"  | pretty) \
         <(printf '%s' "$livenorm" | pretty) \
      || true
    DRIFT=1
  fi
done

[ "$DRIFT" -eq 0 ] && echo "All checked Lambdas: no drift." || echo "Drift or errors detected."
exit "$DRIFT"
