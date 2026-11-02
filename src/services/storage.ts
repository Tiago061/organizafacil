import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { openDB, type DBSchema } from "idb";
export interface Doc {
  id: string;
  name: string;
  category: string;
  folder: string;
  created: string;
  mime: string;
  size: number;
  favorite: boolean;
  notes: string;
  expires: string;
  notificationId: number;
  blob?: Blob;
  path?: string;
  demo?: boolean;
}
export interface Category {
  id: string;
  name: string;
  color: string;
}
interface Schema extends DBSchema {
  docs: { key: string; value: Doc };
  categories: { key: string; value: Category };
  settings: { key: string; value: string };
}
export const defaults: Category[] = [
  ["rg", "RG", "purple"],
  ["cpf", "CPF", "blue"],
  ["cnh", "CNH", "orange"],
  ["contratos", "Contratos", "green"],
  ["comprovantes", "Comprovantes", "pink"],
  ["outros", "Outros", "gray"],
].map(([id, name, color]) => ({ id, name, color }));
export const db = () =>
  openDB<Schema>("organizafacil", 1, {
    upgrade(d) {
      d.createObjectStore("docs", { keyPath: "id" });
      d.createObjectStore("categories", { keyPath: "id" });
      d.createObjectStore("settings");
    },
  });
export async function init() {
  const d = await db();
  if (!(await d.get("settings", "initialized"))) {
    const t = d.transaction(["categories", "settings"], "readwrite");
    defaults.forEach((c) => t.objectStore("categories").put(c));
    t.objectStore("settings").put("yes", "initialized");
    await t.done;
  }
}
export async function validateFile(file: Blob) {
  if (!file.size || file.size > 25 * 1024 * 1024)
    throw Error("O arquivo deve ter entre 1 byte e 25 MB.");
  if (
    !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
  )
    throw Error("Use PDF, JPG, PNG ou WebP.");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ok =
    file.type === "application/pdf"
      ? String.fromCharCode(...b.slice(0, 5)) === "%PDF-"
      : file.type === "image/jpeg"
        ? b[0] === 255 && b[1] === 216
        : file.type === "image/png"
          ? b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71
          : String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (!ok) throw Error("O conteúdo não corresponde ao formato do arquivo.");
}
export const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
export async function addDoc(
  file: Blob,
  name: string,
  category = "outros",
  folder = "",
) {
  await validateFile(file);
  const id = newId();
  const doc: Doc = {
    id,
    name,
    category,
    folder,
    created: new Date().toISOString(),
    mime: file.type,
    size: file.size,
    favorite: false,
    notes: "",
    expires: "",
    notificationId: Math.floor(Math.random() * 2000000000),
  };
  if (Capacitor.isNativePlatform()) {
    doc.path = `documents/${id}`;
    await Filesystem.writeFile({
      path: doc.path,
      directory: Directory.Data,
      data: await base64(file),
      recursive: true,
    });
  } else doc.blob = file;
  try {
    await (await db()).put("docs", doc);
  } catch (e) {
    if (doc.path)
      await Filesystem.deleteFile({
        path: doc.path,
        directory: Directory.Data,
      });
    throw e;
  }
  return doc;
}
export async function getBlob(doc: Doc) {
  if (doc.blob) return doc.blob;
  if (!doc.path) throw Error("Arquivo indisponível.");
  const { data } = await Filesystem.readFile({
    path: doc.path,
    directory: Directory.Data,
  });
  return typeof data === "string"
    ? await (await fetch(`data:${doc.mime};base64,${data}`)).blob()
    : data;
}
export async function deleteDoc(doc: Doc) {
  if (doc.path)
    await Filesystem.deleteFile({ path: doc.path, directory: Directory.Data });
  await (await db()).delete("docs", doc.id);
}
export async function removeCategory(id: string) {
  const d = await db();
  const tx = d.transaction(["docs", "categories"], "readwrite");
  for (const doc of await tx.objectStore("docs").getAll())
    if (doc.category === id)
      await tx.objectStore("docs").put({ ...doc, category: "outros" });
  await tx.objectStore("categories").delete(id);
  await tx.done;
}

export function newId(){return typeof crypto.randomUUID === "function"?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));}
