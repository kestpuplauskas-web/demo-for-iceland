import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/apie/$")({
  beforeLoad: () => {
    throw redirect({ href: "/about", statusCode: 301 });
  },
});
