import { createFileRoute } from "@tanstack/react-router";

import { contactsRoute } from "@/pages/kontaktai";

export const Route = createFileRoute("/contact")(contactsRoute("en") as never);
