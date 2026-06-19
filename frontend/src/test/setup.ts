import "@testing-library/jest-dom/vitest";
import { apiClient } from "@/core/api/api-client";
import { registerAuthInterceptor } from "@/core/api/auth-interceptor";
import { server } from "@/test/msw/server";

// jsdom does not implement HTMLCanvasElement#getContext; stub it so libraries
// that probe for canvas support do not flood test output with warnings.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

registerAuthInterceptor(apiClient);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
