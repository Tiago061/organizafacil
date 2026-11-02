import {
  Briefcase,
  Car,
  ChevronRight,
  FileText,
  Folder,
  IdCard,
  Receipt,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { db, type Doc } from "../services/storage";
import { useApp } from "../store";
export const icons: Record<string, typeof FileText> = {
  rg: IdCard,
  cpf: Wallet,
  cnh: Car,
  contratos: Briefcase,
  comprovantes: Receipt,
  outros: Folder,
};
export const fmt = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export const size = (n: number) =>
  n === 0
    ? "0 KB"
    : n > 1048576
      ? (n / 1048576).toFixed(1) + " MB"
      : Math.max(1, Math.round(n / 1024)) + " KB";
let toastFn = (s: string) => {};
export const notify = (e: unknown) =>
  toastFn(e instanceof Error ? e.message : String(e));
export async function run(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    notify(e);
  }
}
export function IconButton({
  children,
  label,
  onClick,
  ...rest
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  [key: string]: unknown;
}) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("button,input,select")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && el) {
        const nodes = el.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label="Fechar" onClick={close}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}
export function FileArt({ doc, large = false }: { doc: Doc; large?: boolean }) {
  const { categories } = useApp();
  const cat = categories.find((c) => c.id === doc.category);
  const Icon = icons[doc.category] || FileText;
  return (
    <div className={`file-art ${cat?.color || "blue"} ${large ? "large" : ""}`}>
      <div className="paper">
        <div className="paper-head">
          <Icon size={large ? 25 : 18} />
          <span>{cat?.name || "Documento"}</span>
        </div>
        <div className="paper-lines">
          <i />
          <i />
          <i />
        </div>
        <div className="paper-foot">
          <span />
          <i />
        </div>
        {doc.demo && <small>EXEMPLO FICTÍCIO</small>}
      </div>
      <span className="file-type">
        {doc.mime === "application/pdf" ? "PDF" : "IMG"}
      </span>
    </div>
  );
}
export function DocCard({ doc, list = false }: { doc: Doc; list?: boolean }) {
  const nav = useNavigate();
  const { categories, refresh } = useApp();
  return (
    <article className={`doc-card ${list ? "list-card" : ""}`}>
      <button
        className="doc-open"
        onClick={() => nav("/documentos/" + doc.id)}
        aria-label={`Abrir ${doc.name}`}
      >
        <FileArt doc={doc} />
        <div className="doc-info">
          <h3>{doc.name}</h3>
          <p>
            {categories.find((c) => c.id === doc.category)?.name || "Outros"}
            <span>·</span>
            {size(doc.size)}
          </p>
          <small>{fmt(doc.created)}</small>
        </div>
      </button>
      <IconButton
        label={doc.favorite ? "Remover favorito" : "Favoritar"}
        onClick={() =>
          run(async () => {
            await (await db()).put("docs", { ...doc, favorite: !doc.favorite });
            await refresh();
          })
        }
      >
        <Star
          size={17}
          fill={doc.favorite ? "currentColor" : "none"}
          className={doc.favorite ? "gold" : ""}
        />
      </IconButton>
    </article>
  );
}
export function CategoryCards() {
  const { categories, docs } = useApp();
  const nav = useNavigate();
  return (
    <div className="category-grid">
      {categories.map((c) => {
        const Icon = icons[c.id] || Folder;
        return (
          <button
            className="category-card"
            key={c.id}
            onClick={() => nav("/documentos?categoria=" + c.id)}
          >
            <span className={`category-icon ${c.color}`}>
              <Icon size={23} />
            </span>
            <h3>{c.name}</h3>
            <p>{docs.filter((d) => d.category === c.id).length} documentos</p>
            <ChevronRight size={16} />
          </button>
        );
      })}
    </div>
  );
}

export function bindToast(fn: (s: string) => void) {
  toastFn = fn;
}
