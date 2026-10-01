import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/rezervacija/$")({
  beforeLoad: () => {
    throw redirect({ href: "/booking/confirmed", statusCode: 301 });
  },
});
