import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LocaleLink } from "@/components/site/LocaleLink";
import { useContent, useLocale } from "@/content";
import { mainNav, type NavEntry, type NavLink } from "@/data/nav";
import { localizePath } from "@/lib/locale";
import { AVAILABILITY_SECTION_ID, scrollToId } from "@/lib/scroll-to";
import { cn } from "@/lib/utils";

function isGroup(entry: NavEntry): entry is { label: string; items: NavLink[] } {
  return "items" in entry;
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const locale = useLocale();
  const content = useContent();
  const common = content.common;
  const nav = mainNav(locale);
  const homePath = localizePath("/", locale);
  const isHeroPage = pathname === homePath;

  // The header CTA leads to the shared availability calendar on the home page.
  const goToAvailability = () => {
    if (pathname === homePath) {
      scrollToId(AVAILABILITY_SECTION_ID);
      return;
    }
    void navigate({ to: homePath, hash: AVAILABILITY_SECTION_ID }).then(() => {
      window.setTimeout(() => scrollToId(AVAILABILITY_SECTION_ID), 80);
    });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close every menu after a route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const solid = scrolled || menuOpen || !isHeroPage;
  const linkTone = "text-warm-white/70 hover:text-warm-white";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500",
        solid
          ? "border-border bg-ink/90 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[84rem] items-center justify-between gap-5 px-6 py-3 lg:px-8 xl:px-12">
        <LocaleLink
          to="/"
          aria-label={`${common.brand} — ${common.nav.home}`}
          onClick={() => {
            if (pathname !== homePath) return;
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          }}
          className={cn(
            "inline-flex items-center transition-colors",
            "text-warm-white",
          )}
        >
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-normal uppercase tracking-[0.14em] xl:text-xl">
              Mánahlíð
            </span>
            <span className="mt-1 text-[0.52rem] uppercase tracking-[0.28em] text-warm-white/60">
              Tröllaskagi · Iceland
            </span>
          </span>
        </LocaleLink>

        <div className="flex items-center gap-4 xl:gap-6">
          <nav aria-label="Main" className="hidden items-center gap-4 xl:gap-6 lg:flex">
            {nav.map((entry) =>
              isGroup(entry) ? null : (
                <LocaleLink
                  key={entry.to}
                  to={entry.to}
                  activeProps={{ className: "text-aurora" }}
                  className={cn("text-[0.74rem] uppercase tracking-[0.15em] transition-colors", linkTone)}
                >
                  {entry.label}
                </LocaleLink>
              ),
            )}
          </nav>

          <button
            type="button"
            onClick={goToAvailability}
            className="hidden rounded-full bg-aurora px-4 py-3 text-[0.64rem] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:bg-aurora-deep xl:px-6 lg:inline-flex"
          >
            {common.cta.checkDates}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="Menu"
            className="text-warm-white lg:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="max-h-[80vh] overflow-y-auto border-t border-border bg-ink px-6 pb-8 pt-2 lg:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {nav.map((entry) =>
              isGroup(entry) ? null : (
                <LocaleLink
                  key={entry.to}
                  to={entry.to}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/60 py-4 text-base font-medium text-paper"
                >
                  {entry.label}
                </LocaleLink>
              ),
            )}
          </nav>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              goToAvailability();
            }}
            className="mt-6 w-full rounded-full bg-aurora px-5 py-3.5 text-sm font-medium text-ink"
          >
            {common.cta.checkDates}
          </button>
        </div>
      ) : null}
    </header>
  );
}
