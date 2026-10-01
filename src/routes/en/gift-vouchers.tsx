import { createFileRoute } from "@tanstack/react-router";

import { vouchersRoute } from "@/pages/dovanu-kuponai";

export const Route = createFileRoute("/en/gift-vouchers")(vouchersRoute("en") as never);
