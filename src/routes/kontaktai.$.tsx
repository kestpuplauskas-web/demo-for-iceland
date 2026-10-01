import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/kontaktai/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/contact" + (location.searchStr ?? ""), statusCode: 301 });
  },
});
