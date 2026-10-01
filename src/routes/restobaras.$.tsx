import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/restobaras/$")({
  beforeLoad: () => {
    throw redirect({ href: "/restaurant", statusCode: 301 });
  },
});
