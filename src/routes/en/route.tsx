import { createFileRoute, redirect } from "@tanstack/react-router";

/** English segment: same Lithuanian slugs, translated copy. */
export const Route = createFileRoute("/en")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
