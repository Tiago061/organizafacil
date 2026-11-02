import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { restoreBackup } from "./backup";
import {
  addDoc,
  db,
  deleteDoc,
  getBlob,
  init,
  removeCategory,
  validateFile,
} from "./storage";
const pdf = () => new Blob(["%PDF-1.4\nexample"], { type: "application/pdf" });
beforeEach(async () => {
  const d = await db();
  await d.clear("docs");
  await d.clear("categories");
  await d.clear("settings");
  await init();
});
describe("persistência local", () => {
  it("persiste conteúdo e metadados e exclui definitivamente", async () => {
    const doc = await addDoc(pdf(), "Exemplo");
    expect((await getBlob(doc)).size).toBe(pdf().size);
    expect((await (await db()).getAll("docs")).length).toBe(1);
    await deleteDoc(doc);
    expect(await (await db()).getAll("docs")).toHaveLength(0);
  });
  it("rejeita MIME adulterado, formatos não permitidos e arquivo vazio", async () => {
    await expect(
      validateFile(new Blob(["fake"], { type: "application/pdf" })),
    ).rejects.toThrow("conteúdo");
    await expect(
      validateFile(new Blob(["html"], { type: "text/html" })),
    ).rejects.toThrow("Use PDF");
    await expect(
      validateFile(new Blob([], { type: "image/png" })),
    ).rejects.toThrow("25 MB");
  });
  it("rejeita arquivos acima do limite", async () => {
    await expect(
      validateFile(
        new Blob([new Uint8Array(26 * 1024 * 1024)], {
          type: "application/pdf",
        }),
      ),
    ).rejects.toThrow("25 MB");
  });
  it("move documentos para Outros ao excluir categoria", async () => {
    const doc = await addDoc(pdf(), "Exemplo", "rg");
    await removeCategory("rg");
    expect((await (await db()).get("docs", doc.id))?.category).toBe("outros");
    expect(await (await db()).get("categories", "rg")).toBeUndefined();
  });
  it("não grava documentos se qualquer arquivo do backup for inválido", async () => {
    const data = {
      version: 1,
      categories: [],
      documents: [
        {
          name: "Exemplo",
          mime: "application/pdf",
          category: "outros",
          data: btoa("%PDF-1.4"),
        },
        {
          name: "Inválido",
          mime: "application/pdf",
          category: "outros",
          data: btoa("fake"),
        },
      ],
    };
    await expect(
      restoreBackup(new File([JSON.stringify(data)], "backup.json")),
    ).rejects.toThrow();
    expect(await (await db()).getAll("docs")).toHaveLength(0);
  });
  it("restaura arquivos mantendo documentos atuais", async () => {
    await addDoc(pdf(), "Existente");
    const data = {
      version: 1,
      categories: [],
      documents: [
        {
          name: "Restaurado",
          mime: "application/pdf",
          category: "outros",
          data: btoa("%PDF-1.4"),
          created: "2026-11-01",
        },
      ],
    };
    expect(
      await restoreBackup(new File([JSON.stringify(data)], "backup.json")),
    ).toBe(1);
    expect(await (await db()).getAll("docs")).toHaveLength(2);
  });
});
