import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lithuanian URL — permanently redirected to the English address. */
export const Route = createFileRoute("/apartamentai/$")({
  beforeLoad: ({ location }) => {
    const rest = location.pathname
      .replace(/^\/apartamentai/, "")
      .replace(/^\/tipas\//, "/type/")
      .replace(/^\/(standartiniai|su-terasa)\/?$/, "");
    throw redirect({ href: "/stays" + rest + (location.searchStr ?? ""), statusCode: 301 });
  },
});
