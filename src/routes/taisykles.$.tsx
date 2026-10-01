import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/taisykles/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/terms" + (location.searchStr ?? ""), statusCode: 301 });
  },
});
