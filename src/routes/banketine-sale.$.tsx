import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/banketine-sale/$")({
  beforeLoad: () => {
    throw redirect({ href: "/banquet-hall", statusCode: 301 });
  },
});
