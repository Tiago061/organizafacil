import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CloudOff,
  FileText,
  FolderOpen,
  HardDrive,
  Plus,
  ScanLine,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CategoryCards, DocCard, size } from "../components/shared";
import { useApp } from "../store";
function Home() {
  const { docs } = useApp();
  const nav = useNavigate();
  const bytes = docs.reduce((s, d) => s + d.size, 0);
  const expiring = docs.filter(
    (d) =>
      d.expires &&
      new Date(d.expires + "T23:59:59") <= new Date(Date.now() + 30 * 86400000),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TUDO EM SEU LUGAR</p>
          <h1>
            Uma vida mais organizada<span>.</span>
          </h1>
          <p>Seus documentos, sempre à mão. Sem complicação.</p>
        </div>
        <span className="date-label">
          <CalendarDays size={16} />
          {new Date().toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span /> SEU ARQUIVO PESSOAL, DIGITAL
          </span>
          <h2>
            Menos papel.
            <br />
            Mais tranquilidade.
          </h2>
          <p>
            Guarde o que importa em um só lugar.
            <br />
            Organize hoje, encontre quando precisar.
          </p>
          <button className="button white" onClick={() => nav("/digitalizar")}>
            <ScanLine size={18} />
            Digitalizar documento
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <div className="orbit one" />
          <div className="orbit two" />
          <div className="floating-mini mini-one">
            <Check size={18} />
          </div>
          <div className="illustration-sheet back">
            <FileText size={35} />
            <i />
            <i />
            <i />
          </div>
          <div className="illustration-sheet front">
            <div className="sheet-logo">
              <ScanLine size={28} />
            </div>
            <strong>
              Um lugar para
              <br />o que importa.
            </strong>
            <i />
            <i />
            <i />
            <span>
              <ShieldCheck size={15} /> SIMPLES. LOCAL. SEU.
            </span>
          </div>
          <div className="floating-mini mini-two">
            <FolderOpen size={23} />
          </div>
          <div className="hero-pill">
            <CheckCheck size={16} /> Tudo organizado
          </div>
        </div>
      </section>
      <section className="stats">
        <div>
          <span className="stat-icon blue">
            <FileText size={21} />
          </span>
          <div>
            <p>Todos os documentos</p>
            <strong>{docs.length.toString().padStart(2, "0")}</strong>
          </div>
          <span className="stat-note">Seu arquivo digital</span>
        </div>
        <div>
          <span className="stat-icon yellow">
            <Star size={21} />
          </span>
          <div>
            <p>Favoritos</p>
            <strong>
              {docs
                .filter((d) => d.favorite)
                .length.toString()
                .padStart(2, "0")}
            </strong>
          </div>
          <span className="stat-note">Sempre por perto</span>
        </div>
        <div>
          <span className="stat-icon green">
            <HardDrive size={21} />
          </span>
          <div>
            <p>Armazenamento local</p>
            <strong>{size(bytes)}</strong>
          </div>
          <span className="stat-note">
            <span className="green-dot" /> Neste dispositivo
          </span>
        </div>
      </section>
      <div className="section-title">
        <h2>
          Suas categorias <span>{useApp.getState().categories.length}</span>
        </h2>
        <button className="text-button" onClick={() => nav("/categorias")}>
          Gerenciar categorias
          <ChevronRight size={16} />
        </button>
      </div>
      <CategoryCards />
      <div className="section-title recent-title">
        <div>
          <h2>Documentos recentes</h2>
          <p>O que você guardou por último.</p>
        </div>
        <button className="text-button" onClick={() => nav("/documentos")}>
          Ver todos
          <ArrowRight size={16} />
        </button>
      </div>
      {docs.length ? (
        <div className="documents-grid">
          {docs.slice(0, 4).map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <div className="empty-inline">
          <span className="category-icon blue">
            <FileText size={26} />
          </span>
          <div>
            <h3>Seu arquivo começa aqui</h3>
            <p>Importe um documento ou digitalize sua primeira página.</p>
          </div>
          <button
            className="button subtle"
            onClick={() => nav("/documentos?importar=1")}
          >
            <Plus size={17} />
            Adicionar documento
          </button>
        </div>
      )}
      {expiring.length > 0 && (
        <div className="expiry-banner">
          <Bell size={20} />
          <span>
            {expiring.length} documento(s) com vencimento próximo ou vencido.
            Confira em Documentos.
          </span>
        </div>
      )}
      <div className="privacy-strip">
        <ShieldCheck size={18} />
        <p>
          <strong>Seus arquivos ficam com você.</strong> Armazenados neste
          dispositivo, sem envio para servidores.
        </p>
        <span>
          <CloudOff size={14} /> Offline por natureza
        </span>
      </div>
    </>
  );
}

export default Home;
