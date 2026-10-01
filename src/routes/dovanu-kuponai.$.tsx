import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/dovanu-kuponai/$")({
  beforeLoad: () => {
    throw redirect({ href: "/gift-vouchers", statusCode: 301 });
  },
});
