import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { listAllProperties } from "@/lib/properties.functions";
import { createBooking } from "@/lib/bookings.functions";
import type { RoomAllocation } from "@/lib/room-allocation";
import {
  BookingForm,
  defaultBookingForm,
  type BookingFormValues,
} from "@/components/admin/BookingForm";

type NewBookingSearch = {
  propertyId?: string;
  from?: string;
  to?: string;
};

export const Route = createFileRoute("/_authenticated/admin/bookings/new")({
  validateSearch: (search: Record<string, unknown>): NewBookingSearch => ({
    propertyId: typeof search.propertyId === "string" ? search.propertyId : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  component: NewBookingPage,
});

function addDaysISO(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function NewBookingPage() {
  const { t } = useTranslation();
  const { propertyId, from, to } = Route.useSearch();
  const fetchProps = useServerFn(listAllProperties);
  const create = useServerFn(createBooking);
  const navigate = useNavigate();
  const { data: props = [] } = useQuery({ queryKey: ["admin-props"], queryFn: () => fetchProps() });
  const m = useMutation({
    mutationFn: async ({
      values,
      rooms,
    }: {
      values: BookingFormValues;
      rooms?: RoomAllocation[];
    }) => {
      if (!rooms || rooms.length === 0) return create({ data: values });
      // Kiekvienam kambariui — atskira rezervacija; papildomos paslaugos tik pirmam.
      for (let i = 0; i < rooms.length; i += 1) {
        const r = rooms[i]!;
        const guests = r.adults + r.children + r.infants;
        await create({
          data: {
            ...values,
            property_id: r.propertyId,
            adults_count: Math.max(1, r.adults),
            children_count: r.children,
            infants_count: r.infants,
            total_guests: Math.max(1, guests),
            guests: Math.max(1, guests),
            extras: i === 0 ? values.extras : [],
            extras_total: i === 0 ? values.extras_total : 0,
            total_amount:
              i === 0 ? Number((r.amount + (values.extras_total ?? 0)).toFixed(2)) : r.amount,
          },
        });
      }
      return { ok: true };
    },
    onSuccess: () => navigate({ to: "/admin/bookings" }),
  });
  const base = defaultBookingForm(props);
  const initial: BookingFormValues = {
    ...base,
    property_id: propertyId ?? base.property_id,
    date_from: from ?? base.date_from,
    date_to: from ? (to && to !== from ? to : addDaysISO(from, 1)) : base.date_to,
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{t("bookings.new")}</h1>
      <BookingForm
        key={`${initial.property_id}-${initial.date_from}-${initial.date_to}-${props.length}`}
        properties={props}
        initial={initial}
        onSubmit={(v) => m.mutate(v)}
        submitting={m.isPending}
      />
      {m.error && (
        <p className="mt-3 text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : String(m.error)}
        </p>
      )}
    </div>
  );
}