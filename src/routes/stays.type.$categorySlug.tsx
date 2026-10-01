import { createFileRoute } from "@tanstack/react-router";

import { categoryRoute } from "@/pages/apartamentai-category";

export const Route = createFileRoute("/stays/type/$categorySlug")(categoryRoute("en") as never);
