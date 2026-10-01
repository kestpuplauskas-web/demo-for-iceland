import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/namelis/$")({
  beforeLoad: () => {
    throw redirect({ href: "/stays", statusCode: 301 });
  },
});
