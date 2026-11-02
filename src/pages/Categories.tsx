import {newId} from "../services/storage";
import { Folder, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  CategoryCards,
  IconButton,
  Modal,
  icons,
  run,
} from "../components/shared";
import { db, removeCategory } from "../services/storage";
import { useApp } from "../store";
function Categories() {
  const { categories, docs, refresh } = useApp();
  const [edit, setEdit] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [del, setDel] = useState<string | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CADA COISA NO SEU LUGAR</p>
          <h1>
            Categorias<span>.</span>
          </h1>
          <p>Um jeito simples de encontrar exatamente o que você precisa.</p>
        </div>
        <button
          className="button"
          onClick={() =>
            setEdit({ id: newId(), name: "", color: "blue" })
          }
        >
          <Plus size={18} />
          Nova categoria
        </button>
      </div>
      <CategoryCards />
      <div className="section-title">
        <h2>Organize do seu jeito</h2>
      </div>
      <div className="settings-panel">
        {categories.map((c) => {
          const Icon = icons[c.id] || Folder;
          return (
            <div className="settings-row" key={c.id}>
              <span className={`category-icon ${c.color}`}>
                <Icon size={22} />
              </span>
              <div>
                <h3>{c.name}</h3>
                <p>
                  {docs.filter((d) => d.category === c.id).length} documento(s)
                </p>
              </div>
              <IconButton label={`Editar ${c.name}`} onClick={() => setEdit(c)}>
                <SlidersHorizontal size={18} />
              </IconButton>
              {c.id !== "outros" && (
                <IconButton
                  label={`Excluir ${c.name}`}
                  onClick={() => setDel(c.id)}
                >
                  <Trash2 size={18} />
                </IconButton>
              )}
            </div>
          );
        })}
      </div>
      {edit && (
        <Modal
          title={
            categories.some((c) => c.id === edit.id)
              ? "Editar categoria"
              : "Nova categoria"
          }
          close={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (
                  categories.some(
                    (c) =>
                      c.id !== edit.id &&
                      c.name.toLowerCase() === edit.name.trim().toLowerCase(),
                  )
                )
                  throw Error("Já existe uma categoria com esse nome.");
                await (
                  await db()
                ).put("categories", { ...edit, name: edit.name.trim() });
                await refresh();
                setEdit(null);
              });
            }}
          >
            <label>
              Nome da categoria
              <input
                autoFocus
                required
                maxLength={40}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder="Ex.: Saúde"
              />
            </label>
            <label>
              Cor
              <select
                value={edit.color}
                onChange={(e) => setEdit({ ...edit, color: e.target.value })}
              >
                {[
                  ["blue", "Azul"],
                  ["purple", "Roxo"],
                  ["green", "Verde"],
                  ["orange", "Laranja"],
                  ["pink", "Rosa"],
                  ["gray", "Cinza"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button full"
              disabled={!edit.name.trim()}
              type="submit"
            >
              Salvar categoria
            </button>
          </form>
        </Modal>
      )}
      {del && (
        <Modal title="Excluir categoria?" close={() => setDel(null)}>
          <p>
            Os documentos serão movidos para Outros. Nenhum arquivo será
            excluído.
          </p>
          <div className="modal-actions">
            <button className="button subtle" onClick={() => setDel(null)}>
              Cancelar
            </button>
            <button
              className="button danger"
              onClick={() =>
                run(async () => {
                  await removeCategory(del);
                  await refresh();
                  setDel(null);
                })
              }
            >
              Excluir categoria
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default Categories;
