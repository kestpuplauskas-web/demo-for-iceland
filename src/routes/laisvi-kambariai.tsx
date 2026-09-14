import { createFileRoute } from "@tanstack/react-router";

import { availabilityResultsRoute } from "@/pages/laisvi-kambariai";

export const Route = createFileRoute("/laisvi-kambariai")(
  availabilityResultsRoute("en") as never,
);
