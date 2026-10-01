import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/laisvi-kambariai/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/availability" + (location.searchStr ?? ""), statusCode: 301 });
  },
});
