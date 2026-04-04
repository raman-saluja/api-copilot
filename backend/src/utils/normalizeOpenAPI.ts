/**
 * OpenAPI 3.x validation and normalization utility.
 *
 * Validates that a parsed JSON object looks like a real OpenAPI 3.x document
 * and converts it into a flat array of NormalizedEndpoint objects that are
 * easy to search, display, and index.
 */

export interface NormalizedParameter {
  name: string;
  in: string;
  type: string;
  required: boolean;
}

export interface NormalizedRequestBody {
  type: string;
  properties: Record<string, string>;
}

export interface NormalizedEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBody: NormalizedRequestBody | null;
  responses: string[];
  searchText: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateOpenAPI(json: unknown): asserts json is Record<string, unknown> {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("Invalid OpenAPI: root must be a JSON object");
  }

  const obj = json as Record<string, unknown>;

  if (typeof obj.openapi !== "string") {
    throw new Error(
      'Invalid OpenAPI: missing or non-string "openapi" version field'
    );
  }

  if (!obj.openapi.startsWith("3.")) {
    throw new Error(
      `Invalid OpenAPI: only OpenAPI 3.x is supported (got "${obj.openapi}")`
    );
  }

  if (typeof obj.info !== "object" || obj.info === null) {
    throw new Error('Invalid OpenAPI: missing "info" object');
  }

  if (typeof obj.paths !== "object" || obj.paths === null) {
    throw new Error('Invalid OpenAPI: missing "paths" object');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves a $ref like "#/components/schemas/Foo" to the actual sub-object
 * within the root OpenAPI document.
 */
function resolveRef(
  ref: string,
  root: Record<string, unknown>
): Record<string, unknown> | null {
  if (!ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = root;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return null;
    current = current[part];
  }
  return typeof current === "object" && current !== null ? current : null;
}

/**
 * Given a schema object (possibly a $ref), extract a flat map of
 * { propertyName -> typeString }.
 */
function extractProperties(
  schema: unknown,
  root: Record<string, unknown>
): Record<string, string> {
  if (typeof schema !== "object" || schema === null) return {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any = schema;

  if (s.$ref) {
    s = resolveRef(s.$ref, root) ?? s;
  }

  const props = s.properties;
  if (typeof props !== "object" || props === null) return {};

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(props as Record<string, unknown>)) {
    if (typeof val === "object" && val !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = (val as any).type ?? "string";
    }
  }
  return result;
}

/**
 * Build a search-friendly string from an endpoint's metadata.
 * Includes path tokens, method, summary, description, tags, param names,
 * and request body property names — all lowercased.
 */
function buildSearchText(endpoint: Omit<NormalizedEndpoint, "searchText">): string {
  const parts: string[] = [];

  // Path segments (strip leading slash, split on / and {})
  parts.push(
    ...endpoint.path
      .toLowerCase()
      .replace(/[{}]/g, " ")
      .split(/[/ ]+/)
      .filter(Boolean)
  );

  parts.push(endpoint.method.toLowerCase());
  parts.push(...endpoint.summary.toLowerCase().split(/\W+/).filter(Boolean));
  parts.push(...endpoint.description.toLowerCase().split(/\W+/).filter(Boolean));
  parts.push(...endpoint.tags.map((t) => t.toLowerCase()));
  parts.push(...endpoint.parameters.map((p) => p.name.toLowerCase()));

  if (endpoint.requestBody) {
    parts.push(...Object.keys(endpoint.requestBody.properties).map((k) => k.toLowerCase()));
  }

  // Deduplicate while preserving order
  return [...new Set(parts)].join(" ");
}

// ─── Normalization ────────────────────────────────────────────────────────────

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

export function normalizeOpenAPI(
  json: Record<string, unknown>
): NormalizedEndpoint[] {
  const paths = json.paths as Record<string, unknown>;
  const normalized: NormalizedEndpoint[] = [];

  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== "object" || pathItem === null) continue;

    const pathObj = pathItem as Record<string, unknown>;

    // Path-level parameters (shared among all methods on this path)
    const pathLevelParams = Array.isArray(pathObj.parameters)
      ? pathObj.parameters
      : [];

    for (const method of HTTP_METHODS) {
      const operation = pathObj[method];
      if (typeof operation !== "object" || operation === null) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const op = operation as any;

      // ── Parameters ──────────────────────────────────────────────────────
      const rawParams: unknown[] = [
        ...pathLevelParams,
        ...(Array.isArray(op.parameters) ? op.parameters : []),
      ];

      const parameters: NormalizedParameter[] = rawParams
        .map((p): NormalizedParameter | null => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let param: any = p;
          if (param?.$ref) {
            param = resolveRef(param.$ref, json) ?? param;
          }
          if (typeof param !== "object" || param === null) return null;
          return {
            name: param.name ?? "",
            in: param.in ?? "query",
            type: param.schema?.type ?? "string",
            required: param.required === true,
          };
        })
        .filter((p): p is NormalizedParameter => p !== null);

      // ── Request Body ─────────────────────────────────────────────────────
      let requestBody: NormalizedRequestBody | null = null;
      if (op.requestBody) {
        const content = op.requestBody.content ?? {};
        // Prefer application/json; fallback to first content type
        const contentTypes = Object.keys(content);
        const preferredType =
          contentTypes.find((ct) => ct.includes("json")) ?? contentTypes[0];
        const schema = preferredType ? content[preferredType]?.schema : null;

        requestBody = {
          type: "object",
          properties: extractProperties(schema, json),
        };
      }

      // ── Responses ────────────────────────────────────────────────────────
      const responses: string[] = op.responses
        ? Object.keys(op.responses)
        : [];

      // ── Tags ─────────────────────────────────────────────────────────────
      const tags: string[] = Array.isArray(op.tags) ? op.tags : [];

      const endpointBase: Omit<NormalizedEndpoint, "searchText"> = {
        path: routePath,
        method: method.toUpperCase(),
        summary: op.summary ?? "",
        description: op.description ?? "",
        tags,
        parameters,
        requestBody,
        responses,
      };

      normalized.push({
        ...endpointBase,
        searchText: buildSearchText(endpointBase),
      });
    }
  }

  return normalized;
}
