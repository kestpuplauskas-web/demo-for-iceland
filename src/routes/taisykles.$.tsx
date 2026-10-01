import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/taisykles/$")({
  beforeLoad: () => {
    throw redirect({ href: "/terms", statusCode: 301 });
  },
});
