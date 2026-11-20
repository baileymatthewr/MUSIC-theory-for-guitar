/** Browser-only helpers for turning the diagram SVG into downloadable files. */

export function slugify(s: string): string {
  return (
    s
      .trim()
      .replace(/#/g, "sharp")
      .replace(/\//g, "-over-")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "chord"
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(svg: string, filename: string) {
  triggerDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
}

export function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not rasterise SVG"));
    };
    img.src = url;
  });
}

export async function downloadPng(svg: string, width: number, height: number, filename: string) {
  triggerDownload(await svgToPngBlob(svg, width, height), `${filename}.png`);
}

export async function copyPng(svg: string, width: number, height: number) {
  // Passing a promise keeps Safari happy (clipboard write must start in the click handler).
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": svgToPngBlob(svg, width, height) }),
  ]);
}
