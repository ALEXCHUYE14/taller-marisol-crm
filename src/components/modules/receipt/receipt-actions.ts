"use client";

import { toPng } from "html-to-image";

/**
 * Captura el ticket completo como PNG. Se fuerza el tamaño real del nodo (aunque el modal tenga scroll) y se
 * quita sombra/margen/transformaciones: si no, la imagen sale recortada o desplazada.
 */
export async function nodeToPng(node: HTMLElement) {
  if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  const width = Math.ceil(node.offsetWidth);
  const height = Math.ceil(Math.max(node.offsetHeight, node.scrollHeight));
  return toPng(node, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
    skipFonts: true, // el ticket usa fuentes del sistema (Courier New / Georgia)
    width,
    height,
    style: { margin: "0", boxShadow: "none", transform: "none" },
  });
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: blob.type });
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function downloadReceiptPng(node: HTMLElement, filename: string) {
  download(await nodeToPng(node), `${filename}.png`);
}

export async function createReceiptPdf(node: HTMLElement, filename: string): Promise<File> {
  const { jsPDF } = await import("jspdf");
  const png = await nodeToPng(node);
  const img = new Image();
  img.src = png;
  await img.decode();
  const widthMm = 80;
  const heightMm = (img.height / img.width) * widthMm;
  const pdf = new jsPDF({ unit: "mm", format: [widthMm, heightMm] });
  pdf.addImage(png, "PNG", 0, 0, widthMm, heightMm);
  const blob = pdf.output("blob");
  return new File([blob], `${filename}.pdf`, { type: "application/pdf" });
}

export async function downloadReceiptPdf(node: HTMLElement, filename: string) {
  const file = await createReceiptPdf(node, filename);
  const url = URL.createObjectURL(file);
  download(url, file.name);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/**
 * Imprime el ticket a 80 mm usando la misma imagen que el PDF/PNG (queda idéntico y completo).
 * Antes se imprimía el nodo dentro del modal con scroll y salía cortado.
 */
export async function printReceipt(node: HTMLElement) {
  const png = await nodeToPng(node);
  const img = new Image();
  img.src = png;
  await img.decode();
  const heightMm = Math.ceil((img.height / img.width) * 80);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("No se pudo preparar la impresión");
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Ticket</title><style>` +
      `@page{size:80mm ${heightMm}mm;margin:0}html,body{margin:0;padding:0;background:#fff}` +
      `img{display:block;width:80mm;height:${heightMm}mm}</style></head><body><img alt="Ticket"></body></html>`,
  );
  doc.close();
  const target = doc.querySelector("img");
  if (!target) {
    iframe.remove();
    throw new Error("No se pudo preparar la impresión");
  }
  target.src = png;
  await target.decode();
  win.addEventListener("afterprint", () => iframe.remove(), { once: true });
  win.focus();
  win.print();
  setTimeout(() => iframe.remove(), 120_000); // respaldo si el navegador no dispara afterprint
}

/**
 * Comparte el ticket como imagen usando la hoja nativa del celular (WhatsApp aparece allí).
 * Devuelve false si el navegador no soporta compartir archivos (escritorio): se usa wa.me con texto.
 */
export async function shareReceiptImage(node: HTMLElement, filename: string, text: string): Promise<boolean> {
  const file = await dataUrlToFile(await nodeToPng(node), `${filename}.png`);
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return true;
    } catch (e) {
      if ((e as Error).name === "AbortError") return true;
    }
  }
  return false;
}
