# AI Agents Guide

This document explains how to work with AI agents (like GitHub Copilot Chat in VS Code) on this repository. It covers scope, safe usage, and concrete recipes tailored to the Autodesk Tandem Data REST API samples in this project.

## Purpose
- Accelerate adding new examples and utilities around Tandem REST APIs.
- Generate small, reviewable changes to existing samples.
- Help with troubleshooting requests and response shapes by reading local helpers (`common/`).

## Tech Stack Context
- Runtime: Node.js (ES Modules).
- Install deps once: `npm i`.
- Key helpers:
  - `common/auth.js`: 2‑legged token creation (`createToken`).
  - `common/tandemClient.js`: Thin client wrapper for Tandem REST API.
  - `common/constants.js`: Enums, column families, flags, and constants.
  - `common/utils.js`: Encoding, key helpers, stream settings, and misc utilities.

## Guardrails (Important)
- Do not commit secrets. Replace `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, and URNs with placeholders or use environment-specific local values that you do not commit.
- Keep diffs minimal and focused; avoid refactors outside the requested scope.
- Follow existing patterns: examples are small, self‑contained scripts with a top "configuration" block and a `main()` function.
- When adding a new example, prefer a new file under an existing topic folder (e.g., `assets/`, `streams/`) rather than modifying many files.

## How Agents Should Work Here
- Read relevant helpers before coding: `common/auth.js`, `common/tandemClient.js`, and `common/constants.js` define the API surface to use.
- Generate scripts that:
  1) Define a few top‑level constants for local configuration.
  2) Fetch an access token via `createToken(clientId, clientSecret, scope)`.
  3) Instantiate `new TandemClient(() => token)` (optionally set `region` if needed).
  4) Call a small number of client methods to accomplish the task.
  5) Print concise output and exit with a non‑zero code on errors.
- Use small, surgical patches; keep the surrounding style intact.

## Running Examples (local)
1. Install dependencies once:
   ```sh
   npm i
   ```
2. Open an example and update the configuration variables at the top of the file (Client ID/Secret, Facility URN, etc.).
3. Run with Node.js (from repo root):
   ```sh
   node path/to/example.js
   ```

## Common Recipes

### Create a New Example Script
- Pick a folder based on topic (e.g., `elements/`, `streams/`, `facility/`).
- Use this structure:
  - A short description comment block at the top (what the script demonstrates).
  - A "configuration" constants block (`APS_CLIENT_ID`, `APS_CLIENT_SECRET`, required URNs/IDs, and any parameters).
  - `main()` that:
    - Creates a token via `createToken(APS_CLIENT_ID, APS_CLIENT_SECRET, 'data:read data:write')` (or narrower scope if only reads).
    - Creates a `TandemClient` bound to that token.
    - Calls one or two client methods (see `common/tandemClient.js`) to perform the operation.
    - Logs results in a compact, readable way.
  - A bottom runner that calls `main()` and exits with `process.exit(0|1)`.

### Listing or Reading Data
- Prefer the higher‑level client methods such as:
  - `client.getGroups()`, `client.getGroupFacilities(groupUrn)`, `client.getFacility(facilityUrn)`
  - `client.getStreams(modelUrn)`, `client.getStreamData(modelUrn, streamKey, ...)`
  - `client.getRooms(modelUrn)`, `client.getLevels(modelUrn)`
  - `client.getElements(modelUrn, keys?, families?, columns?, includeHistory?)`
- For element family/column selection, reuse constants from `common/constants.js` (`ColumnFamilies`, `QC`, `ElementFlags`, etc.).

### Writing or Mutating Data
- Use `client.mutateElements(modelUrn, keys, mutations, desc?, correlationId?)`.
- Construct `mutations` with `MutateActions` and the family/column constants.
- Provide a short `desc` (helps with history/audit).

### Stream Operations
- Creating streams: `client.createStream(...)`.
- Sending data: `client.sendStreamData(modelUrn, streamKey, data)`.
- Deleting time series slices: `client.deleteStreamsData(modelUrn, keys, substreams?, from?, to?)`.

## Prompting Tips for Agents
- Be explicit: mention the exact file path to create or modify, and the intended minimal change.
- Ask the agent to mirror the style of existing examples (top constants block, `main()`, clean console output).
- When dealing with keys/encoding, reference `common/utils.js` helpers (e.g., `Encoding.toFullKey`, `Encoding.fromXrefKey`).
- If adding a new example, specify the target folder and name (e.g., `streams/list-stream-metrics.js`).

## Project Conventions
- ES Module imports with relative paths ending in `.js`.
- No TypeScript; keep examples plain JavaScript.
- Exit codes: `0` on success, `1` on failure.
- Keep examples short and single‑purpose.

## Troubleshooting
- Authentication/permission errors: confirm the application is added as a Service to the facility (see README) and scopes match the operation (`data:read`, `data:write`).
- Region‑specific data: some endpoints accept a `Region` header; the client sets this if you assign `client.region` (see `Region` enum in `common/constants.js`).
- Non‑200 responses: client throws with status/details—check the thrown message and inputs.

## References
- README for setup and usage overview.
- `common/auth.js` (2‑legged OAuth helper).
- `common/tandemClient.js` (API wrapper—scan for available operations).
- `common/constants.js` (families, columns, flags, enums).
- `common/utils.js` (encoding, key helpers, stream settings utilities).

---

Maintainers: When reviewing AI‑generated changes, focus on:
- Secrets not being added.
- Minimal diffs matching existing style.
- Correct use of client helpers and constants.