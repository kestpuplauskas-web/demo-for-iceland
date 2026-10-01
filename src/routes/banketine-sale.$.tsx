import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/banketine-sale/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/banquet-hall" + (location.searchStr ?? ""), statusCode: 301 });
  },
});
