import {
  Bell,
  ChevronRight,
  FileText,
  FolderOpen,
  Grid2X2,
  House,
  ScanLine,
  Settings,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { IconButton, bindToast, notify, run } from "./components/shared";
import Categories from "./pages/Categories";
import Details from "./pages/Details";
import Documents from "./pages/Documents";
import Home from "./pages/Home";
import Preferences from "./pages/Preferences";
import Scanner from "./pages/Scanner";
import { useApp } from "./store";
export default function App() {
  const { refresh, theme, ready, docs } = useApp();
  const [toast, setToast] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    bindToast(setToast);
    run(refresh);
    if (navigator.storage?.persist) void navigator.storage.persist();
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  const links = [
    ["/", "Início", House],
    ["/documentos", "Documentos", FolderOpen],
    ["/digitalizar", "Digitalizar", ScanLine],
    ["/categorias", "Categorias", Grid2X2],
    ["/ajustes", "Ajustes", Settings],
  ] as const;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <span>
            <FileText size={25} />
          </span>
          <div>
            Organiza<span>Fácil</span>
            <small>SEU ARQUIVO PESSOAL</small>
          </div>
        </NavLink>
        <div className="workspace-label">MEU ESPAÇO</div>
        <nav>
          {links.slice(0, 4).map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={20} />
              {label}
              {path === "/documentos" && (
                <span className="nav-count">{docs.length}</span>
              )}
            </NavLink>
          ))}
          <NavLink to="/documentos?favoritos=1" className="favorite-nav">
            <Star size={20} />
            Favoritos
          </NavLink>
          <div className="nav-divider" />
          <NavLink to="/ajustes">
            <Settings size={20} />
            Ajustes
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-lock">
              <ShieldCheck size={20} />
            </span>
            <h3>Um espaço só seu.</h3>
            <p>
              Seus documentos ficam
              <br />
              neste dispositivo.
            </p>
            <span>
              <span className="green-dot" /> Armazenamento local
            </span>
          </div>
          <div className="sidebar-footer">
            <span className="avatar">
              <FolderOpen size={20} />
            </span>
            <div>
              Meu arquivo pessoal<small>Organizado. Acessível. Seu.</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Meu espaço <ChevronRight size={14} /> <strong>OrganizaFácil</strong>
          </span>
          <div className="topbar-actions">
            <span className="local-status">
              <span className="green-dot" />
              Arquivos neste dispositivo
            </span>
            <IconButton
              label="Ver vencimentos"
              onClick={() => {
                const n = docs.filter((d) => d.expires).length;
                notify(
                  n
                    ? `${n} documento(s) com vencimento configurado. Consulte os detalhes em Documentos.`
                    : "Nenhum vencimento configurado. Adicione uma data nos detalhes de um documento.",
                );
              }}
            >
              <Bell size={20} />
            </IconButton>
            <div className="topbar-avatar">OF</div>
          </div>
        </header>
        <main>
          {ready ? (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/documentos" element={<Documents />} />
              <Route path="/documentos/:id" element={<Details />} />
              <Route path="/digitalizar" element={<Scanner />} />
              <Route path="/categorias" element={<Categories />} />
              <Route path="/ajustes" element={<Preferences />} />
              <Route path="*" element={<Home />} />
            </Routes>
          ) : (
            <div className="empty-state" role="status">
              Preparando seu espaço…
            </div>
          )}
          <footer className="main-footer">
            <span>
              OrganizaFácil <span>·</span> Um lugar para o que importa.
            </span>
            <span>Feito para simplificar seu dia.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {links.map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === "/"}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <IconButton label="Fechar aviso" onClick={() => setToast("")}>
            <X size={17} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
