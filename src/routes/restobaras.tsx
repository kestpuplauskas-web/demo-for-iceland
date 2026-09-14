import { createFileRoute } from "@tanstack/react-router";

import { restobarasRoute } from "@/pages/restobaras";

export const Route = createFileRoute("/restobaras")(restobarasRoute("en") as never);
