import {lazy,Suspense} from "react";
const PdfViewer=lazy(()=>import("../components/PdfViewer"));
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal, fmt, notify, run, size } from "../components/shared";
import {
  cancelNotification,
  download,
  schedule,
  shareDoc,
} from "../services/native";
import { db, deleteDoc, getBlob, type Doc } from "../services/storage";
import { useApp } from "../store";
function Details() {
  const { id } = useParams();
  const { docs, categories, refresh } = useApp();
  const doc = docs.find((d) => d.id === id);
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    let url = "";
    if (doc)
      run(async () => {
        url = URL.createObjectURL(await getBlob(doc));
        setUrl(url);
      });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc?.id]);
  if (!doc)
    return (
      <div className="empty-state">
        <FileText size={40} />
        <h2>Documento não encontrado</h2>
        <button className="button" onClick={() => nav("/documentos")}>
          Voltar aos documentos
        </button>
      </div>
    );
  return (
    <>
      <button className="back-link" onClick={() => nav("/documentos")}>
        <ArrowLeft size={17} />
        Todos os documentos
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DETALHES DO DOCUMENTO</p>
          <h1>{doc.name}</h1>
          <p>
            Adicionado em {fmt(doc.created)}{" "}
            {doc.demo ? "· Exemplo fictício" : ""}
          </p>
        </div>
        <button className="button" onClick={() => run(() => shareDoc(doc))}>
          <Share2 size={17} />
          Compartilhar
        </button>
      </div>
      <div className="detail-layout">
        <div className="file-preview">
          {url ? (
            doc.mime === "application/pdf" ? (
              <Suspense fallback={<p>Carregando visualizador…</p>}><PdfViewer url={url}/></Suspense>
            ) : (
              <img src={url} alt={doc.name} />
            )
          ) : (
            <p>Carregando arquivo…</p>
          )}
        </div>
        <aside className="detail-panel">
          <h2>Informações</h2>
          <dl>
            <dt>Categoria</dt>
            <dd>
              {categories.find((c) => c.id === doc.category)?.name || "Outros"}
            </dd>
            <dt>Pasta</dt>
            <dd>{doc.folder || "Sem pasta"}</dd>
            <dt>Formato e tamanho</dt>
            <dd>
              {doc.mime === "application/pdf"
                ? "PDF"
                : doc.mime.split("/")[1].toUpperCase()}{" "}
              · {size(doc.size)}
            </dd>
            <dt>Vencimento</dt>
            <dd>
              {doc.expires ? fmt(doc.expires + "T12:00:00") : "Não configurado"}
            </dd>
            <dt>Observações</dt>
            <dd>{doc.notes || "Nenhuma observação."}</dd>
          </dl>
          <button
            className="button subtle full"
            onClick={() => setEditing(true)}
          >
            <SlidersHorizontal size={17} />
            Editar informações
          </button>
          <button
            className="button subtle full"
            onClick={() =>
              run(async () => {
                download(
                  await getBlob(doc),
                  doc.name +
                    (doc.mime === "application/pdf"
                      ? ".pdf"
                      : "." + doc.mime.split("/")[1]),
                );
              })
            }
          >
            <Download size={17} />
            Exportar arquivo
          </button>
          <button
            className="button subtle full"
            onClick={() =>
              run(async () => {
                await (
                  await db()
                ).put("docs", { ...doc, favorite: !doc.favorite });
                await refresh();
              })
            }
          >
            <Star size={17} />
            {doc.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          </button>
          <button className="danger-link" onClick={() => setDeleting(true)}>
            <Trash2 size={17} />
            Excluir documento
          </button>
        </aside>
      </div>
      {editing && <EditDoc doc={doc} close={() => setEditing(false)} />}
      {deleting && (
        <Modal
          title="Excluir definitivamente?"
          close={() => setDeleting(false)}
        >
          <p>
            “{doc.name}” será removido deste dispositivo. Essa ação não pode ser
            desfeita.
          </p>
          <div className="modal-actions">
            <button
              className="button subtle"
              onClick={() => setDeleting(false)}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              onClick={() =>
                run(async () => {
                  await cancelNotification(doc);
                  await deleteDoc(doc);
                  await refresh();
                  nav("/documentos");
                  notify("Documento excluído.");
                })
              }
            >
              Excluir definitivamente
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function EditDoc({ doc, close }: { doc: Doc; close: () => void }) {
  const { categories, refresh } = useApp();
  const [name, setName] = useState(doc.name);
  const [cat, setCat] = useState(doc.category);
  const [notes, setNotes] = useState(doc.notes);
  const [folder, setFolder] = useState(doc.folder);
  const [expires, setExpires] = useState(doc.expires);
  return (
    <Modal title="Editar documento" close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const updated = {
              ...doc,
              name: name.trim(),
              category: cat,
              notes,
              folder: folder.trim(),
              expires,
            };
            await (await db()).put("docs", updated);
            await refresh();
            close();
            notify("Informações salvas.");
            await schedule(updated);
          });
        }}
      >
        <label>
          Nome
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Categoria
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pasta
          <input
            maxLength={80}
            placeholder="Ex.: Pessoal, Trabalho…"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
        </label>
        <label>
          Vencimento
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </label>
        <p className="hint">
          {Capacitor.isNativePlatform()
            ? "Um alerta local será solicitado para esta data às 9h."
            : "No navegador, os vencimentos aparecem no início. Alertas em segundo plano dependem do aplicativo nativo."}
        </p>
        <label>
          Observações
          <textarea
            maxLength={2000}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button className="button full" disabled={!name.trim()} type="submit">
          <Check size={17} />
          Salvar alterações
        </button>
      </form>
    </Modal>
  );
}

export default Details;
