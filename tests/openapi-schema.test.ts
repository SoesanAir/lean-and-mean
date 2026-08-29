import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Validates the checked-in ChatGPT Action schema (single source of truth,
// deployed verbatim to GitHub Pages).

const raw = readFileSync(resolve(__dirname, "../public/chatgpt-action-openapi.json"), "utf8");

const EXPECTED_OPS = [
  "getToday",
  "getDay",
  "getWeek",
  "findExercises",
  "getExerciseHistory",
  "getRecentNotes",
];

describe("chatgpt-action-openapi.json", () => {
  const doc = JSON.parse(raw) as {
    openapi: string;
    servers: Array<{ url: string }>;
    security?: unknown[];
    paths: Record<string, Record<string, { operationId?: string; security?: unknown[]; responses: Record<string, unknown> }>>;
    components: { securitySchemes: Record<string, { type: string; scheme?: string }> };
  };

  it("is valid JSON and OpenAPI 3.1", () => {
    expect(doc.openapi).toMatch(/^3\.1\./);
  });

  it("uses the production server URL", () => {
    expect(doc.servers).toHaveLength(1);
    expect(doc.servers[0].url).toBe(
      "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read",
    );
  });

  it("contains exactly the intended operations with unique operationIds", () => {
    const ids: string[] = [];
    for (const methods of Object.values(doc.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        expect(method).toBe("get"); // read-only API
        expect(op.operationId).toBeTruthy();
        ids.push(op.operationId!);
      }
    }
    expect(new Set(ids).size).toBe(ids.length); // unique
    expect(ids.sort()).toEqual([...EXPECTED_OPS].sort());
  });

  it("requires bearer auth globally and defines the http bearer scheme", () => {
    expect(doc.security).toEqual([{ bearerAuth: [] }]);
    expect(doc.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(doc.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    // no operation opts out of security
    for (const methods of Object.values(doc.paths)) {
      for (const op of Object.values(methods)) {
        expect(op.security).toBeUndefined();
      }
    }
  });

  it("every operation documents a 401 response", () => {
    for (const methods of Object.values(doc.paths)) {
      for (const op of Object.values(methods)) {
        expect(Object.keys(op.responses)).toContain("401");
      }
    }
  });

  it("contains no real personal access token", () => {
    // real tokens are lnm_ + 43 base64url chars; the schema may only mention
    // the prefix in prose
    expect(raw).not.toMatch(/lnm_[A-Za-z0-9_-]{20,}/);
  });

  it("defines real response schemas, not empty objects", () => {
    expect(raw).toContain("SessionDetail");
    expect(raw).toContain("SetResult");
    expect(raw).toContain("actualRepsLeft");
    expect(raw).toContain("blockWeightKg");
    expect(raw).not.toContain('"object": {}');
  });
});
