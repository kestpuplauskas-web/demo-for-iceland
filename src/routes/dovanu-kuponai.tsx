import { createFileRoute } from "@tanstack/react-router";

import { vouchersRoute } from "@/pages/dovanu-kuponai";

export const Route = createFileRoute("/dovanu-kuponai")(vouchersRoute("en") as never);
