import { jsPDF } from "jspdf";
import { currencySymbol } from "@/lib/properties";

const FONT = "DejaVuSans";
let fontCache: { normal: string; bold: string } | null = null;

async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function registerUnicodeFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!fontCache) {
      const [normal, bold] = await Promise.all([
        fetchFontBase64("/fonts/DejaVuSans.ttf"),
        fetchFontBase64("/fonts/DejaVuSans-Bold.ttf"),
      ]);
      fontCache = { normal, bold };
    }
    doc.addFileToVFS("DejaVuSans.ttf", fontCache.normal);
    doc.addFont("DejaVuSans.ttf", FONT, "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", fontCache.bold);
    doc.addFont("DejaVuSans-Bold.ttf", FONT, "bold");
    return true;
  } catch {
    return false;
  }
}

export type InvoiceLineItem = {
  name: string;
  qty: number;
  unit: string;
  unitPriceNet: number;
  lineNet: number;
  lineVat: number;
  lineTotal: number;
};

export type InvoicePartyData = {
  name: string;
  code: string;
  vatCode: string;
  address: string;
  iban?: string;
  bankName?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  brandName?: string;
};

export type InvoiceStay = { property: string; checkIn: string; checkOut: string; guests?: number };

export type InvoiceDocData = {
  fullNumber: string;
  issueDate: string;
  isVatInvoice: boolean;
  vatRate: number;
  currency: string;
  seller: InvoicePartyData;
  buyer: InvoicePartyData;
  lineItems: InvoiceLineItem[];
  subtotalNet: number;
  vatAmount: number;
  total: number;
  notes: string;
  issuedBy: string;
  bookingNumber?: string;
  stay?: InvoiceStay | null;
  status?: "paid" | "due";
};

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigitWords(n: number): string {
  if (n < 10) return ONES[n] as string;
  if (n < 20) return TEENS[n - 10] as string;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? (TENS[t] as string) : `${TENS[t]}-${ONES[o]}`;
}

function threeDigitWords(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${ONES[h]} hundred`);
  if (rest > 0) parts.push(twoDigitWords(rest));
  return parts.join(" ").trim();
}

export function numberToEnglishWords(n: number): string {
  const value = Math.max(0, Math.round(n));
  if (value === 0) return "zero";
  const thousands = Math.floor(value / 1000);
  const rem = value % 1000;
  const parts: string[] = [];
  if (thousands > 0) {
    parts.push(`${threeDigitWords(thousands)} thousand`);
  }
  if (rem > 0) parts.push(threeDigitWords(rem));
  return parts.join(" ").trim();
}

/** Kept for backward-compat imports; now produces English words. */
export const numberToLithuanianWords = numberToEnglishWords;

function currencyWord(currencyCode: string, plural: boolean): string {
  const c = (currencyCode || "EUR").toUpperCase();
  const names: Record<string, [string, string]> = {
    EUR: ["euro", "euros"],
    USD: ["dollar", "dollars"],
    GBP: ["pound", "pounds"],
    ISK: ["krona", "kronur"],
    NOK: ["krone", "kroner"],
  };
  const [singular, pluralForm] = names[c] ?? [c, c];
  return plural ? pluralForm : singular;
}

export function amountInWords(total: number, currencyCode: string): string {
  const rounded = Math.round(total * 100) / 100;
  const whole = Math.floor(rounded);
  const cents = Math.round((rounded - whole) * 100);
  const wholeWords = `${numberToEnglishWords(whole)} ${currencyWord(currencyCode, whole !== 1)}`;
  const centsWords = `${numberToEnglishWords(cents)} cents`;
  return `${wholeWords} and ${centsWords}`;
}

function curSymbol(code: string) {
  return currencySymbol(code);
}

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Number(n) || 0);
}

function usDate(v: string): string {
  if (!v) return "";
  const d = new Date(`${v.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
}

async function loadImageAsPng(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = objUrl;
      });
      const w = img.naturalWidth || 600;
      const h = img.naturalHeight || 200;
      const scale = Math.min(1, 1200 / w) * (w < 400 ? 3 : 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/png"), w, h };
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  } catch {
    return null;
  }
}

// Palette (matches the brand: ink, aurora green, paper)
const INK: [number, number, number] = [24, 31, 30];
const MUTED: [number, number, number] = [110, 118, 116];
const LINE: [number, number, number] = [222, 224, 220];
const ACCENT: [number, number, number] = [62, 140, 104];
const PAPER: [number, number, number] = [246, 244, 239];

export async function buildInvoicePdf(data: InvoiceDocData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const hasUnicodeFont = await registerUnicodeFont(doc);
  const font = hasUnicodeFont ? FONT : "helvetica";
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mx = 18;
  const right = W - mx;
  const sym = curSymbol(data.currency);
  const cur = (n: number) => `${n < 0 ? "-" : ""}${sym}${money(Math.abs(n))}`;
  const brand = data.seller.brandName || data.seller.name;
  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const label = (t: string, x: number, y: number, align: "left" | "right" = "left") => {
    doc.setFont(font, "bold");
    doc.setFontSize(7);
    color(MUTED);
    doc.setCharSpace(0.4);
    doc.text(t.toUpperCase(), x, y, { align });
    doc.setCharSpace(0);
  };

  // Top accent bar
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 4, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 4, W, 0.8, "F");

  // Brand block
  let y = 18;
  let textX = mx;
  if (data.seller.logoUrl) {
    const img = await loadImageAsPng(data.seller.logoUrl);
    if (img) {
      const maxH = 16;
      const maxW = 48;
      let h = maxH;
      let w = (img.w / img.h) * h;
      if (w > maxW) {
        w = maxW;
        h = (img.h / img.w) * w;
      }
      try {
        doc.addImage(img.data, "PNG", mx, y - 4, w, h, undefined, "FAST");
        y += h + 2;
      } catch {
        /* skip logo */
      }
    }
  }
  doc.setFont(font, "bold");
  doc.setFontSize(13);
  color(INK);
  doc.text(brand || "", textX, y);
  y += 5;
  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  color(MUTED);
  const brandLines = [
    data.seller.address,
    [data.seller.phone, data.seller.email].filter(Boolean).join("  ·  "),
  ].filter(Boolean) as string[];
  for (const l of brandLines) {
    doc.text(l, textX, y, { maxWidth: 95 });
    y += 4.2;
  }
  const brandBottom = y;

  // Title + meta (right)
  let ry = 20;
  doc.setFont(font, "bold");
  doc.setFontSize(26);
  color(INK);
  doc.text("INVOICE", right, ry, { align: "right" });
  ry += 9;
  const meta: Array<[string, string]> = [
    ["Invoice #", data.fullNumber],
    ["Invoice date", usDate(data.issueDate)],
  ];
  if (data.bookingNumber) meta.push(["Booking #", data.bookingNumber]);
  doc.setFontSize(9);
  for (const [k, v] of meta) {
    doc.setFont(font, "normal");
    color(MUTED);
    doc.text(k, right - 38, ry, { align: "right" });
    doc.setFont(font, "bold");
    color(INK);
    doc.text(v, right, ry, { align: "right" });
    ry += 5;
  }
  // Status pill
  const paid = (data.status ?? "paid") === "paid";
  const pill = paid ? "PAID" : "DUE";
  doc.setFontSize(8);
  const pw = doc.getTextWidth(pill) + 8;
  doc.setFillColor(...(paid ? ACCENT : INK));
  doc.roundedRect(right - pw, ry - 1, pw, 6, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, "bold");
  doc.text(pill, right - pw / 2, ry + 3, { align: "center" });
  ry += 9;

  y = Math.max(brandBottom, ry) + 4;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(mx, y, right, y);
  y += 8;

  // Bill to / Stay details
  const colW = (right - mx) / 2;
  const bx = mx;
  const sx = mx + colW + 6;
  label("Bill to", bx, y);
  if (data.stay) label("Stay details", sx, y);
  let by = y + 5.5;
  let sy = y + 5.5;
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  color(INK);
  doc.text(data.buyer.name || "—", bx, by, { maxWidth: colW - 6 });
  by += 5;
  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  color(MUTED);
  const buyerLines = [
    data.buyer.code ? `ID / Reg. no. ${data.buyer.code}` : "",
    data.buyer.vatCode ? `Tax ID ${data.buyer.vatCode}` : "",
    data.buyer.address,
    data.buyer.phone,
    data.buyer.email,
  ].filter(Boolean) as string[];
  for (const l of buyerLines) {
    doc.text(l, bx, by, { maxWidth: colW - 6 });
    by += 4.2;
  }
  if (data.stay) {
    const s = data.stay;
    const nights = Math.max(
      0,
      Math.round((new Date(s.checkOut).getTime() - new Date(s.checkIn).getTime()) / 86400000),
    );
    const rows: Array<[string, string]> = [
      ["Property", s.property],
      ["Check-in", usDate(s.checkIn)],
      ["Check-out", usDate(s.checkOut)],
      ["Length", `${nights} night${nights === 1 ? "" : "s"}${s.guests ? ` · ${s.guests} guest${s.guests === 1 ? "" : "s"}` : ""}`],
    ];
    doc.setFontSize(8.5);
    for (const [k, v] of rows) {
      doc.setFont(font, "normal");
      color(MUTED);
      doc.text(k, sx, sy);
      doc.setFont(font, "bold");
      color(INK);
      const vl = doc.splitTextToSize(v || "—", colW - 30) as string[];
      doc.text(vl, sx + 22, sy);
      sy += 4.2 * vl.length + 0.8;
    }
  }
  y = Math.max(by, sy) + 6;

  // Line items table
  const cols = data.isVatInvoice
    ? [
        { key: "name", label: "Description", x: mx + 3, align: "left" as const },
        { key: "qty", label: "Qty", x: 112, align: "right" as const },
        { key: "rate", label: "Rate", x: 138, align: "right" as const },
        { key: "tax", label: "Tax", x: 162, align: "right" as const },
        { key: "amount", label: "Amount", x: right - 3, align: "right" as const },
      ]
    : [
        { key: "name", label: "Description", x: mx + 3, align: "left" as const },
        { key: "qty", label: "Qty", x: 130, align: "right" as const },
        { key: "rate", label: "Rate", x: 158, align: "right" as const },
        { key: "amount", label: "Amount", x: right - 3, align: "right" as const },
      ];
  const descW = (data.isVatInvoice ? 112 - 14 : 130 - 14) - mx;

  const drawHeader = () => {
    doc.setFillColor(...INK);
    doc.rect(mx, y, right - mx, 8, "F");
    doc.setFont(font, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setCharSpace(0.3);
    for (const c of cols) doc.text(c.label.toUpperCase(), c.x, y + 5.3, { align: c.align });
    doc.setCharSpace(0);
    y += 8;
  };
  drawHeader();

  doc.setFontSize(9);
  data.lineItems.forEach((item, i) => {
    const nameLines = doc.splitTextToSize(item.name, descW) as string[];
    const unitLine = item.unit ? 1 : 0;
    const rowH = Math.max(10, (nameLines.length + unitLine) * 4.2 + 4);
    if (y + rowH > H - 60) {
      doc.addPage();
      y = 20;
      drawHeader();
    }
    if (i % 2 === 1) {
      doc.setFillColor(...PAPER);
      doc.rect(mx, y, right - mx, rowH, "F");
    }
    const ty = y + 5.5;
    doc.setFont(font, "normal");
    color(INK);
    doc.text(nameLines, mx + 3, ty);
    if (item.unit) {
      doc.setFontSize(7.5);
      color(MUTED);
      doc.text(item.unit, mx + 3, ty + nameLines.length * 4.2);
      doc.setFontSize(9);
      color(INK);
    }
    const rate = data.isVatInvoice ? item.unitPriceNet : item.qty > 0 ? item.lineTotal / item.qty : item.lineTotal;
    for (const c of cols) {
      let v = "";
      if (c.key === "qty") v = String(item.qty);
      else if (c.key === "rate") v = cur(rate);
      else if (c.key === "tax") v = cur(item.lineVat);
      else if (c.key === "amount") v = cur(data.isVatInvoice ? item.lineNet : item.lineTotal);
      else continue;
      doc.text(v, c.x, ty, { align: c.align });
    }
    y += rowH;
    doc.setDrawColor(...LINE);
    doc.line(mx, y, right, y);
  });

  // Totals
  y += 8;
  const tlx = right - 70;
  const totalRow = (k: string, v: string) => {
    doc.setFont(font, "normal");
    doc.setFontSize(9);
    color(MUTED);
    doc.text(k, tlx, y);
    color(INK);
    doc.text(v, right - 3, y, { align: "right" });
    y += 6;
  };
  totalRow("Subtotal", cur(data.isVatInvoice ? data.subtotalNet : data.total));
  if (data.isVatInvoice) totalRow(`Tax (${data.vatRate}%)`, cur(data.vatAmount));
  y += 1;
  doc.setFillColor(...INK);
  doc.roundedRect(tlx - 4, y - 5, right - tlx + 4, 12, 1.5, 1.5, "F");
  doc.setFont(font, "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(paid ? "TOTAL PAID" : "TOTAL DUE", tlx, y + 2.6);
  doc.setFontSize(13);
  doc.text(`${cur(data.total)} ${data.currency.toUpperCase()}`, right - 3, y + 2.8, { align: "right" });
  const totalsBottom = y + 12;

  // Payment details + issued by (left of totals)
  let py = totalsBottom - 30;
  if (py < y - 20) py = y - 20;
  const payLines = [
    data.seller.name && data.seller.name !== brand ? data.seller.name : "",
    data.seller.code ? `Reg. no. ${data.seller.code}` : "",
    data.seller.vatCode ? `Tax ID ${data.seller.vatCode}` : "",
    data.seller.bankName,
    data.seller.iban ? `Account ${data.seller.iban}` : "",
  ].filter(Boolean) as string[];
  y = totalsBottom + 8;
  if (payLines.length) {
    label("Payment details", mx, y);
    let ly = y + 5;
    doc.setFont(font, "normal");
    doc.setFontSize(8.5);
    color(INK);
    for (const l of payLines) {
      doc.text(l, mx, ly, { maxWidth: colW });
      ly += 4.2;
    }
    py = ly;
  } else py = y;
  if (data.issuedBy) {
    label("Issued by", sx, y);
    doc.setFont(font, "bold");
    doc.setFontSize(9.5);
    color(INK);
    doc.text(data.issuedBy, sx, y + 5.5);
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    color(MUTED);
    doc.text(`on behalf of ${brand}`, sx, y + 10);
  }
  y = Math.max(py, y + 12) + 6;

  if (data.notes) {
    label("Notes", mx, y);
    doc.setFont(font, "normal");
    doc.setFontSize(8.5);
    color(MUTED);
    const nl = doc.splitTextToSize(data.notes, right - mx) as string[];
    doc.text(nl, mx, y + 5);
    y += 5 + nl.length * 4.2;
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont(font, "bold");
    doc.setFontSize(10);
    color(ACCENT);
    if (p === pages) doc.text(`Thank you for staying with ${brand || "us"}.`, W / 2, H - 22, { align: "center" });
    doc.setDrawColor(...LINE);
    doc.line(mx, H - 16, right, H - 16);
    doc.setFont(font, "normal");
    doc.setFontSize(7.5);
    color(MUTED);
    doc.text([brand, data.seller.email, data.seller.phone].filter(Boolean).join("  ·  "), mx, H - 11);
    doc.text(`Page ${p} of ${pages}`, right, H - 11, { align: "right" });
  }
  doc.setTextColor(0);
  return doc;
}
