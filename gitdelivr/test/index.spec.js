import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import worker from "../src";

function testEnv(snapshot) {
	return {
		...env,
		HEALTH_STATUS_KV: {
			get: vi.fn(async () => snapshot),
			put: vi.fn(async () => undefined),
		},
	};
}

describe("GitDelivr worker", () => {
	it("serves a saved network health snapshot", async () => {
		const snapshot = {
			generatedAt: new Date().toISOString(),
			checkedFrom: "test-kv",
			summary: {
				overall: "healthy",
				total: 1,
				healthy: 1,
				degraded: 0,
				down: 0,
				averageLatency: 100,
				slowest: null,
			},
			results: [],
		};
		const ctx = createExecutionContext();
		const response = await worker.fetch(new Request("https://cdn.gitdelivr.in/status.json"), testEnv(snapshot), ctx);

		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("application/json");
		await expect(response.json()).resolves.toMatchObject({
			checkedFrom: "test-kv",
			summary: { overall: "healthy" },
		});
	});

	it("rejects unsupported methods on the status endpoint", async () => {
		const ctx = createExecutionContext();
		const response = await worker.fetch(new Request("https://cdn.gitdelivr.in/status.json", { method: "POST" }), env, ctx);

		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(405);
		expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
	});
});
