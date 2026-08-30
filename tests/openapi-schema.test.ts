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
    paths: Record<
      string,
      Record<
        string,
        {
          operationId?: string;
          description?: string;
          security?: unknown[];
          parameters?: Array<Record<string, unknown>>;
          responses: Record<string, unknown>;
        }
      >
    >;
    components: {
      securitySchemes: Record<string, { type: string; scheme?: string }>;
      parameters?: Record<string, unknown>;
    };
  };

  const allOps = Object.values(doc.paths).flatMap((methods) => Object.values(methods));

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

  // ---- ChatGPT Actions compatibility (import fails otherwise) ----

  it("every operation description is 300 characters or fewer", () => {
    for (const op of allOps) {
      expect(op.description, op.operationId).toBeTruthy();
      expect(op.description!.length, `${op.operationId} description length`).toBeLessThanOrEqual(300);
    }
  });

  it("no operation parameter uses $ref — all parameters are inline", () => {
    for (const op of allOps) {
      for (const p of op.parameters ?? []) {
        expect(p.$ref, `${op.operationId} has a $ref parameter`).toBeUndefined();
      }
    }
    // and the reusable-parameters section is gone
    expect(doc.components.parameters).toBeUndefined();
    expect(raw).not.toContain("#/components/parameters/");
  });

  it("every parameter has a string name, in=query, a schema and a description", () => {
    for (const op of allOps) {
      for (const p of op.parameters ?? []) {
        expect(typeof p.name, `${op.operationId} param name`).toBe("string");
        expect((p.name as string).length).toBeGreaterThan(0);
        expect(p.in, `${op.operationId} param ${p.name}`).toBe("query");
        expect(typeof p.required, `${op.operationId} param ${p.name} required`).toBe("boolean");
        expect(p.schema, `${op.operationId} param ${p.name} schema`).toBeTruthy();
        expect(typeof p.description).toBe("string");
      }
    }
  });

  it("expected inline parameters exist per operation", () => {
    const paramsOf = (opId: string) => {
      const op = allOps.find((o) => o.operationId === opId)!;
      return (op.parameters ?? []).map((p) => p.name);
    };
    expect(paramsOf("getToday")).toEqual(["tz"]);
    expect(paramsOf("getDay")).toEqual(["date", "tz"]);
    expect(paramsOf("getWeek")).toEqual(["date", "tz"]);
    expect(paramsOf("findExercises")).toEqual(["query", "limit"]);
    expect(paramsOf("getExerciseHistory")).toEqual(["exerciseId", "limit"]);
    expect(paramsOf("getRecentNotes")).toEqual(["limit"]);
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
