import { createFileRoute } from "@tanstack/react-router";

import { aboutRoute } from "@/pages/about";

export const Route = createFileRoute("/about/")(aboutRoute("en") as never);
