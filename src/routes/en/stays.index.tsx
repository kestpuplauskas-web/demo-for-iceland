import { createFileRoute } from "@tanstack/react-router";

import { staysIndexRoute } from "@/pages/apartamentai-index";

export const Route = createFileRoute("/en/stays/")(staysIndexRoute("en") as never);
