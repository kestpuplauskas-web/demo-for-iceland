import { createFileRoute } from "@tanstack/react-router";

import { rulesRoute } from "@/pages/rules";

export const Route = createFileRoute("/about/house-rules")(rulesRoute("en") as never);
