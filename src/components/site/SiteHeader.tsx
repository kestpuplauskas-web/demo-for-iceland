import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
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
    setOpenGroup(null);
    setMobileGroup(null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    const onClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

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

        <div ref={navRef} className="flex items-center gap-4 xl:gap-6">
          <nav aria-label="Main" className="hidden items-center gap-4 xl:gap-6 lg:flex">
            {nav.map((entry) =>
              isGroup(entry) ? (
                <div
                  key={entry.label}
                  className="relative"
                  onMouseEnter={() => setOpenGroup(entry.label)}
                  onMouseLeave={() => setOpenGroup((value) => (value === entry.label ? null : value))}
                >
                  <button
                    type="button"
                    aria-expanded={openGroup === entry.label}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenGroup((value) => (value === entry.label ? null : entry.label))
                    }
                    className={cn(
                      "inline-flex items-center gap-1 text-[0.74rem] uppercase tracking-[0.15em] transition-colors",
                      linkTone,
                    )}
                  >
                    {entry.label}
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {openGroup === entry.label ? (
                    <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3">
                      <ul className="overflow-hidden rounded-md border border-border bg-surface py-2 shadow-lift">
                        {entry.items.map((item) => (
                          <li key={item.to}>
                            <LocaleLink
                              to={item.to}
                              activeProps={{ className: "text-sage" }}
                              className="block px-5 py-2.5 text-sm text-stone transition-colors hover:bg-surface-2 hover:text-aurora"
                            >
                              {item.label}
                            </LocaleLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
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

          <LanguageSwitcher
            className="hidden text-warm-white/70 lg:flex"
            tone="light"
          />

          <LanguageSwitcher
            className="flex text-sm text-warm-white/70 lg:hidden"
            tone="light"
          />

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
              isGroup(entry) ? (
                <div key={entry.label} className="border-b border-border/60">
                  <button
                    type="button"
                    aria-expanded={mobileGroup === entry.label}
                    onClick={() =>
                      setMobileGroup((value) => (value === entry.label ? null : entry.label))
                    }
                    className="flex w-full items-center justify-between py-4 text-base font-medium text-paper"
                  >
                    {entry.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        mobileGroup === entry.label && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {mobileGroup === entry.label ? (
                    <ul className="pb-3 pl-4">
                      {entry.items.map((item) => (
                        <li key={item.to}>
                          <LocaleLink
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className="block py-2.5 text-sm text-stone"
                          >
                            {item.label}
                          </LocaleLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
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
