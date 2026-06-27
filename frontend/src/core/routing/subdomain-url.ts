if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] Subdomain URL functions are deprecated. Import from './subdomain-router.ts' instead."
  );
}

export * from "./subdomain-router";
