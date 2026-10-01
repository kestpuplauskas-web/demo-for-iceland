import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/privatumo-politika/$")({
  beforeLoad: () => {
    throw redirect({ href: "/privacy-policy", statusCode: 301 });
  },
});
