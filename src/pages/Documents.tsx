import { FolderOpen, Grid2X2, List, Plus, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DocCard, IconButton, notify } from "../components/shared";
import { addDoc } from "../services/storage";
import { useApp } from "../store";
function Documents() {
  const { docs, categories, refresh } = useApp();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [view, setView] = useState("grid");
  const [type, setType] = useState("");
  const [order, setOrder] = useState("recent");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (params.has("importar")) {
      input.current?.click();
      setParams({});
    }
  }, []);
  const cat = params.get("categoria") || "";
  const favorites = params.has("favoritos");
  const filtered = docs
    .filter(
      (d) =>
        (!cat || d.category === cat) &&
        (!favorites || d.favorite) &&
        (!type || d.mime.includes(type)) &&
        (!folder || d.folder === folder) &&
        `${d.name} ${d.notes} ${d.folder} ${categories.find((c) => c.id === d.category)?.name}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      order === "name"
        ? a.name.localeCompare(b.name)
        : order === "old"
          ? a.created.localeCompare(b.created)
          : b.created.localeCompare(a.created),
    );
  async function importFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    let count = 0;
    for (const f of Array.from(files)) {
      try {
        await addDoc(f, f.name.replace(/\.[^.]+$/, ""), cat || "outros");
        count++;
      } catch (e) {
        notify(e);
      }
    }
    await refresh();
    setBusy(false);
    if (count) notify(`${count} documento(s) importado(s).`);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEU ARQUIVO DIGITAL</p>
          <h1>
            {favorites ? "Seus favoritos" : "Documentos"}
            <span>.</span>
          </h1>
          <p>
            {docs.length} documentos, infinitas coisas a menos para procurar.
          </p>
        </div>
        <button
          className="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={18} />
          {busy ? "Importando…" : "Importar documento"}
        </button>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="filter-toolbar">
        <label className="search-box">
          <Search size={19} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar nome, pasta ou observações…"
            aria-label="Pesquisar documentos"
          />
        </label>
        <div className="view-toggle">
          <IconButton
            label="Visualização em grade"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <Grid2X2 size={18} />
          </IconButton>
          <IconButton
            label="Visualização em lista"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={19} />
          </IconButton>
        </div>
      </div>
      <div className="filter-row">
        <button
          className={!cat ? "chip active" : "chip"}
          onClick={() => setParams(favorites ? { favoritos: "1" } : {})}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            className={cat === c.id ? "chip active" : "chip"}
            key={c.id}
            onClick={() => setParams({ categoria: c.id })}
          >
            {c.name}
          </button>
        ))}
        <div className="selects">
          <select
            aria-label="Tipo de arquivo"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="pdf">PDF</option>
            <option value="image">Imagens</option>
          </select>
          <select
            aria-label="Ordenação"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="recent">Mais recentes</option>
            <option value="old">Mais antigos</option>
            <option value="name">Nome A–Z</option>
          </select>
          <select
            aria-label="Pasta"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            <option value="">Todas as pastas</option>
            {[...new Set(docs.map((d) => d.folder).filter(Boolean))].map(
              (f) => (
                <option key={f}>{f}</option>
              ),
            )}
          </select>
        </div>
      </div>
      <p className="result-count">
        {filtered.length} documento(s) encontrado(s)
      </p>
      {filtered.length ? (
        <div className={view === "grid" ? "documents-grid" : "documents-list"}>
          {filtered.map((d) => (
            <DocCard key={d.id} doc={d} list={view === "list"} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FolderOpen size={48} />
          <h2>
            {docs.length
              ? "Nenhum resultado por aqui"
              : "Pronto para organizar sua vida?"}
          </h2>
          <p>
            {docs.length
              ? "Tente outro nome ou ajuste os filtros."
              : "Adicione imagens e PDFs. Seus arquivos ficam neste dispositivo."}
          </p>
          <button className="button" onClick={() => input.current?.click()}>
            <Plus size={18} />
            Importar primeiro documento
          </button>
        </div>
      )}
    </>
  );
}

export default Documents;
