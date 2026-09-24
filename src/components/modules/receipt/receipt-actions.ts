"use client";

import { toPng } from "html-to-image";

async function nodeToPng(node: HTMLElement) {
  return toPng(node, { pixelRatio: 2.5, backgroundColor: "#ffffff", cacheBust: true });
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
