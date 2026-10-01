import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/dovanu-kuponai/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/gift-vouchers" + (location.searchStr ?? ""), statusCode: 301 });
  },
});
