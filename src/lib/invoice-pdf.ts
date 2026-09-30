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
};

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

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildInvoicePdf(data: InvoiceDocData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const hasUnicodeFont = await registerUnicodeFont(doc);
  const font = hasUnicodeFont ? FONT : "helvetica";
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 18;
  const rightEdge = pageWidth - marginX;
  let y = 20;

  if (data.seller.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(data.seller.logoUrl);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "PNG", marginX, y - 5, 22, 22, undefined, "FAST");
      } catch {
        // unsupported format — skip the logo, continue generating the rest of the invoice
      }
    }
  }

  doc.setFont(font, "bold");
  doc.setFontSize(15);
  doc.text(data.isVatInvoice ? "VAT INVOICE" : "INVOICE", rightEdge, y, { align: "right" });

  doc.setFont(font, "normal");
  doc.setFontSize(10);
  y += 7;
  const numberLabel = data.fullNumber.includes("-")
    ? `Series ${data.fullNumber.split("-")[0]} No. ${data.fullNumber.split("-").slice(1).join("-")}`
    : `No. ${data.fullNumber}`;
  doc.text(numberLabel, rightEdge, y, { align: "right" });
  y += 5;
  doc.text(`Invoice date ${data.issueDate}`, rightEdge, y, { align: "right" });
  y += 5;
  doc.text("Payment status: Paid", rightEdge, y, { align: "right" });

  y = 48;
  doc.setDrawColor(200);
  doc.line(marginX, y, rightEdge, y);
  y += 8;

  const colWidth = (pageWidth - marginX * 2 - 6) / 2;
  const sellerX = marginX;
  const buyerX = marginX + colWidth + 6;
  let sy = y;
  let by = y;

  doc.setFont(font, "bold");
  doc.setFontSize(9);
  doc.text("Seller", sellerX, sy);
  doc.text("Buyer", buyerX, by);
  doc.setFont(font, "normal");
  sy += 6;
  by += 6;

  const sellerLines = [
    data.seller.name,
    data.seller.code ? `Company code ${data.seller.code}` : "",
    data.seller.vatCode ? `VAT payer code ${data.seller.vatCode}` : "",
    data.seller.address,
    [data.seller.bankName, data.seller.iban].filter(Boolean).join(" — "),
  ].filter(Boolean);
  const buyerLines = [
    data.buyer.name,
    data.buyer.code ? `Company code ${data.buyer.code}` : "",
    data.buyer.vatCode ? `VAT payer code ${data.buyer.vatCode}` : "",
    data.buyer.address,
    data.buyer.phone,
    data.buyer.email,
  ].filter(Boolean);

  for (const line of sellerLines) {
    doc.text(String(line), sellerX, sy, { maxWidth: colWidth - 4 });
    sy += 5;
  }
  for (const line of buyerLines) {
    doc.text(String(line), buyerX, by, { maxWidth: colWidth - 4 });
    by += 5;
  }

  y = Math.max(sy, by) + 6;

  type Col = { key: string; label: string; x: number; align: "left" | "right"; maxWidth?: number };
  const cols: Col[] = data.isVatInvoice
    ? [
        { key: "name", label: "Description", x: marginX, align: "left", maxWidth: 46 },
        { key: "qty", label: "Qty", x: 70, align: "right" },
        { key: "unit", label: "Unit", x: 74, align: "left", maxWidth: 12 },
        { key: "unitPriceNet", label: "Price excl. VAT", x: 116, align: "right" },
        { key: "lineNet", label: "Amount excl. VAT", x: 139, align: "right" },
        { key: "lineVat", label: "VAT", x: 158, align: "right" },
        { key: "vatRate", label: "VAT %", x: 170, align: "right" },
        { key: "lineTotal", label: "Total", x: rightEdge, align: "right" },
      ]
    : [
        { key: "name", label: "Description", x: marginX, align: "left", maxWidth: 88 },
        { key: "qty", label: "Qty", x: 122, align: "right" },
        { key: "unit", label: "Unit", x: 126, align: "left", maxWidth: 20 },
        { key: "unitPriceNet", label: "Price", x: 162, align: "right" },
        { key: "lineTotal", label: "Amount", x: rightEdge, align: "right" },
      ];

  doc.setFont(font, "bold");
  doc.setFontSize(data.isVatInvoice ? 6.5 : 7);
  for (const c of cols) doc.text(c.label, c.x, y, { align: c.align });
  y += 2;
  doc.line(marginX, y, rightEdge, y);
  y += 5;

  doc.setFont(font, "normal");
  doc.setFontSize(data.isVatInvoice ? 7.5 : 8);
  const sym = curSymbol(data.currency);
  for (const item of data.lineItems) {
    const nameLines = doc.splitTextToSize(item.name, (cols[0]?.maxWidth ?? 54) - 2) as string[];
    const rowHeight = Math.max(6, nameLines.length * 4 + 2);
    if (y + rowHeight > 255) {
      doc.addPage();
      y = 20;
    }
    for (const c of cols) {
      let raw: string;
      switch (c.key) {
        case "name":
          doc.text(nameLines, c.x, y);
          continue;
        case "qty":
          raw = String(item.qty);
          break;
        case "unit":
          raw = item.unit;
          break;
        case "unitPriceNet":
          raw = `${money(item.unitPriceNet)} ${sym}`;
          break;
        case "lineNet":
          raw = `${money(item.lineNet)} ${sym}`;
          break;
        case "lineVat":
          raw = `${money(item.lineVat)} ${sym}`;
          break;
        case "vatRate":
          raw = `${data.vatRate}%`;
          break;
        case "lineTotal":
          raw = `${money(item.lineTotal)} ${sym}`;
          break;
        default:
          raw = "";
      }
      doc.text(raw, c.x, y, { align: c.align, maxWidth: c.maxWidth });
    }
    y += rowHeight;
  }

  y += 2;
  doc.line(marginX, y, rightEdge, y);
  y += 8;

  doc.setFontSize(9);
  doc.text(`Amount excl. VAT${data.isVatInvoice ? ` (${data.vatRate}%)` : ""}`, rightEdge - 42, y, { align: "right" });
  doc.text(`${money(data.subtotalNet)} ${sym}`, rightEdge, y, { align: "right" });
  y += 6;
  if (data.isVatInvoice) {
    doc.text(`VAT (${data.vatRate}%)`, rightEdge - 42, y, { align: "right" });
    doc.text(`${money(data.vatAmount)} ${sym}`, rightEdge, y, { align: "right" });
    y += 6;
  }
  doc.setFont(font, "bold");
  doc.text("Total amount", rightEdge - 42, y, { align: "right" });
  doc.text(`${money(data.total)} ${sym}`, rightEdge, y, { align: "right" });
  doc.setFont(font, "normal");
  y += 12;

  doc.setFontSize(9);
  doc.text(`Amount in words: ${amountInWords(data.total, data.currency)}`, marginX, y, { maxWidth: rightEdge - marginX });
  y += 14;

  if (data.issuedBy) {
    doc.text(`Invoice issued by: ${data.issuedBy}`, marginX, y);
    y += 10;
  }
  doc.text("Invoice accepted by: ______________________________", marginX, y);

  if (data.notes) {
    y += 14;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(data.notes, marginX, y, { maxWidth: rightEdge - marginX });
    doc.setTextColor(0);
  }

  return doc;
}