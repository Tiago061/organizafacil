import {
  addDoc,
  base64,
  db,
  getBlob,
  type Category,
  type Doc,
} from "./storage";
export async function exportBackup() {
  const d = await db();
  const docs = await d.getAll("docs");
  const records = await Promise.all(
    docs.map(async (doc) => {
      const { blob, path, ...meta } = doc;
      return { ...meta, data: await base64(await getBlob(doc)) };
    }),
  );
  return new Blob(
    [
      JSON.stringify({
        version: 1,
        categories: await d.getAll("categories"),
        documents: records,
      }),
    ],
    { type: "application/json" },
  );
}
export async function restoreBackup(file: File) {
  if (file.size > 150 * 1024 * 1024) throw Error("Backup excede 150 MB.");
  const data = JSON.parse(await file.text());
  if (
    data.version !== 1 ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.documents) ||
    data.documents.length > 1000
  )
    throw Error("Backup inválido.");
  const categories: Category[] = data.categories;
  if (
    !categories.every(
      (c) =>
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        typeof c.color === "string",
    )
  )
    throw Error("Categorias inválidas.");
  const records: { meta: Doc; blob: Blob }[] = [];
  for (const r of data.documents) {
    if (
      typeof r.data !== "string" ||
      typeof r.name !== "string" ||
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        r.mime,
      ) ||
      typeof r.category !== "string"
    )
      throw Error("Documento inválido no backup.");
    const blob = await (await fetch(`data:${r.mime};base64,${r.data}`)).blob();
    const { validateFile } = await import("./storage");
    await validateFile(blob);
    records.push({ meta: r, blob });
  }
  const added: Doc[] = [];
  try {
    for (const r of records) {
      const doc = await addDoc(
        r.blob,
        r.meta.name,
        r.meta.category,
        typeof r.meta.folder === "string" ? r.meta.folder : "",
      );
      added.push(doc);
      await (
        await db()
      ).put("docs", {
        ...doc,
        notes: typeof r.meta.notes === "string" ? r.meta.notes : "",
        favorite: !!r.meta.favorite,
        created: !isNaN(Date.parse(r.meta.created))
          ? r.meta.created
          : doc.created,
        expires: typeof r.meta.expires === "string" ? r.meta.expires : "",
      });
    }
    const d = await db();
    const tx = d.transaction("categories", "readwrite");
    for (const c of categories)
      if (!(await tx.store.get(c.id))) await tx.store.put(c);
    await tx.done;
  } catch (e) {
    const { deleteDoc } = await import("./storage");
    for (const doc of added) await deleteDoc(doc);
    throw e;
  }
  return records.length;
}
