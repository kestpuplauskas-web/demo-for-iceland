import { createFileRoute } from "@tanstack/react-router";

import { confirmationRoute } from "@/pages/rezervacija-patvirtinta";

export const Route = createFileRoute("/booking/confirmed")(confirmationRoute("en") as never);
