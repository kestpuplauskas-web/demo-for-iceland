import { createFileRoute } from "@tanstack/react-router";

import { legalRoute } from "@/pages/legal";

export const Route = createFileRoute("/en/privacy-policy")(legalRoute("en", "privacy") as never);
