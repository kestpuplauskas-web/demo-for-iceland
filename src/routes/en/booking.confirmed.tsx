import { createFileRoute } from "@tanstack/react-router";

import { confirmationRoute } from "@/pages/rezervacija-patvirtinta";

export const Route = createFileRoute("/en/booking/confirmed")(confirmationRoute("en") as never);
