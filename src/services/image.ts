import { jsPDF } from "jspdf";
export type Point = { x: number; y: number };
export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(Error("Imagem inválida."));
    i.src = src;
  });
}
export async function transform(
  src: string,
  points: Point[],
  rotation: number,
) {
  const crosses = points.map((p, i) => {
    const q = points[(i + 1) % 4],
      r = points[(i + 2) % 4];
    return (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x);
  });
  if (crosses.some((v) => v <= 0.0001))
    throw Error("Mantenha os quatro cantos em ordem, sem cruzá-los.");
  const img = await loadImage(src);
  const w = Math.min(
    1800,
    Math.round(
      Math.max(
        Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
        Math.hypot(points[2].x - points[3].x, points[2].y - points[3].y),
      ) * img.width,
    ),
  );
  const h = Math.min(
    2400,
    Math.round(
      Math.max(
        Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y),
        Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y),
      ) * img.height,
    ),
  );
  if (w < 20 || h < 20) throw Error("Selecione uma área maior.");
  const input = document.createElement("canvas");
  input.width = img.width;
  input.height = img.height;
  const ctx = input.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
  // Homography from unit rectangle to four selected corners.
  const [a, b, c, d] = points;
  const dx1 = b.x - c.x,
    dx2 = d.x - c.x,
    dx3 = a.x - b.x + c.x - d.x,
    dy1 = b.y - c.y,
    dy2 = d.y - c.y,
    dy3 = a.y - b.y + c.y - d.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(det) > 1e-8 ? (dx3 * dy2 - dx2 * dy3) / det : 0;
  const k = Math.abs(det) > 1e-8 ? (dx1 * dy3 - dx3 * dy1) / det : 0;
  const A = b.x - a.x + g * b.x,
    B = d.x - a.x + k * d.x,
    D = b.y - a.y + g * b.y,
    E = d.y - a.y + k * d.y;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const oc = out.getContext("2d")!;
  const data = oc.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1),
        v = y / (h - 1),
        z = g * u + k * v + 1;
      const sx = Math.max(
          0,
          Math.min(
            img.width - 1,
            Math.round(((A * u + B * v + a.x) / z) * img.width),
          ),
        ),
        sy = Math.max(
          0,
          Math.min(
            img.height - 1,
            Math.round(((D * u + E * v + a.y) / z) * img.height),
          ),
        );
      const p = (sy * img.width + sx) * 4,
        q = (y * w + x) * 4;
      data.data.set(pixels.subarray(p, p + 4), q);
    }
  oc.putImageData(data, 0, 0);
  const final = document.createElement("canvas");
  final.width = rotation % 180 ? h : w;
  final.height = rotation % 180 ? w : h;
  const fc = final.getContext("2d")!;
  fc.translate(final.width / 2, final.height / 2);
  fc.rotate((rotation * Math.PI) / 180);
  fc.drawImage(out, -w / 2, -h / 2);
  return final.toDataURL("image/jpeg", 0.9);
}
export async function makePdf(pages: string[]) {
  if (!pages.length) throw Error("Adicione uma página.");
  const pdf = new jsPDF();
  for (let i = 0; i < pages.length; i++) {
    if (i) pdf.addPage();
    const img = await loadImage(pages[i]);
    const scale = Math.min(190 / img.width, 277 / img.height);
    pdf.addImage(
      img,
      "JPEG",
      (210 - img.width * scale) / 2,
      (297 - img.height * scale) / 2,
      img.width * scale,
      img.height * scale,
    );
  }
  return pdf.output("blob");
}
