import { createFileRoute } from "@tanstack/react-router";

import { propertyRoute } from "@/pages/apartamentai-property";

export const Route = createFileRoute("/stays/$propertyId")(propertyRoute("en") as never);
