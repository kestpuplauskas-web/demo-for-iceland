import { createFileRoute } from "@tanstack/react-router";

import { availabilityResultsRoute } from "@/pages/laisvi-kambariai";

export const Route = createFileRoute("/availability")(
  availabilityResultsRoute("en") as never,
);
