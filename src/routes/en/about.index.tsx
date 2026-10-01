import { createFileRoute } from "@tanstack/react-router";

import { aboutRoute } from "@/pages/about";

export const Route = createFileRoute("/en/about/")(aboutRoute("en") as never);
