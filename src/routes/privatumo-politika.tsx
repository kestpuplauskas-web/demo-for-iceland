import { createFileRoute } from "@tanstack/react-router";

import { legalRoute } from "@/pages/legal";

export const Route = createFileRoute("/privatumo-politika")(legalRoute("en", "privacy") as never);
