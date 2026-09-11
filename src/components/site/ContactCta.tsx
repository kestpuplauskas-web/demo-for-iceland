import { useContent } from "@/content";
import { contact } from "@/data/contact";

/** Small closing block used on the quieter service pages. */
export function ContactCta({ title, text }: { title: string; text?: string }) {
  const { common } = useContent();
  const phone = contact.phones[0] ?? "";
  return (
    <div className="border border-border bg-surface px-8 py-12 text-center text-warm-white/75">
      <h2 className="font-display text-[clamp(1.6rem,3.2vw,2.125rem)]">{title}</h2>
      {text ? <p className="mx-auto mt-4 max-w-xl text-sm text-warm-white/65">{text}</p> : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-medium uppercase tracking-[0.15em]">
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="rounded-full bg-aurora px-6 py-3.5 text-ink transition-colors hover:bg-[#9be3c4]"
        >
          {phone}
        </a>
        <a
          href={`mailto:${contact.email}`}
          className="rounded-full border border-border px-6 py-3.5 text-warm-white transition-colors hover:border-aurora hover:text-aurora"
        >
          {common.cta.contactUs}
        </a>
      </div>
    </div>
  );
}
