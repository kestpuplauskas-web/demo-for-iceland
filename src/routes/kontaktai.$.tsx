import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/kontaktai/$")({
  beforeLoad: () => {
    throw redirect({ href: "/contact", statusCode: 301 });
  },
});
