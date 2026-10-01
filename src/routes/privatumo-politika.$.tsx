import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/privatumo-politika/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/privacy-policy" + (location.searchStr ?? ""), statusCode: 301 });
  },
});
