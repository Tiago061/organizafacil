import { Capacitor } from "@capacitor/core";
import {
  Check,
  ChevronRight,
  Download,
  FileText,
  HardDrive,
  Monitor,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { Modal, notify, run } from "../components/shared";
import { exportBackup, restoreBackup } from "../services/backup";
import { cancelNotification, download } from "../services/native";
import { addDoc, db, deleteDoc } from "../services/storage";
import { useApp } from "../store";
function Preferences() {
  const { theme, setTheme, refresh, docs } = useApp();
  const [busy, setBusy] = useState(false);
  const [clear, setClear] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function backup() {
    setBusy(true);
    try {
      const blob = await exportBackup();
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { base64 } = await import("../services/storage");
        const { Share } = await import("@capacitor/share");
        const f = await Filesystem.writeFile({
          path: "OrganizaFacil-backup.json",
          data: await base64(blob),
          directory: Directory.Cache,
        });
        await Share.share({ title: "Backup OrganizaFácil", files: [f.uri] });
      } else download(blob, "OrganizaFacil-backup.json");
      notify("Backup preparado. Guarde-o em um local de sua confiança.");
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  async function examples() {
    setBusy(true);
    try {
      for (const [n, cat] of [
        ["Identidade — exemplo", "rg"],
        ["Contrato de exemplo", "contratos"],
        ["Comprovante fictício", "comprovantes"],
        ["Habilitação — modelo", "cnh"],
      ]) {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF();
        pdf.setTextColor("#2563eb");
        pdf.setFontSize(24);
        pdf.text("OrganizaFacil", 22, 30);
        pdf.setFontSize(16);
        pdf.text(n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 22, 60);
        pdf.setTextColor("#666666");
        pdf.setFontSize(12);
        pdf.text("EXEMPLO FICTICIO - SEM VALIDADE", 22, 80);
        pdf.text("Este arquivo nao contem dados de documentos reais.", 22, 95);
        const doc = await addDoc(pdf.output("blob"), n, cat);
        await (
          await db()
        ).put("docs", { ...doc, demo: true, favorite: cat === "rg" });
      }
      await refresh();
      notify("Quatro exemplos fictícios adicionados.");
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DO SEU JEITO</p>
          <h1>
            Ajustes<span>.</span>
          </h1>
          <p>Personalize sua experiência e cuide dos seus arquivos.</p>
        </div>
      </div>
      <div className="preferences-layout">
        <section>
          <h2 className="settings-heading">Aparência</h2>
          <div className="settings-panel theme-options">
            {[
              ["light", "Claro", Sun],
              ["dark", "Escuro", Moon],
              ["system", "Sistema", Monitor],
            ].map(([v, l, I]) => {
              const Icon = I as typeof Sun;
              return (
                <button
                  key={String(v)}
                  className={theme === v ? "selected" : ""}
                  onClick={() => run(() => setTheme(String(v)))}
                >
                  <Icon size={24} />
                  <span>{String(l)}</span>
                  {theme === v && <Check size={16} />}
                </button>
              );
            })}
          </div>
          <h2 className="settings-heading">Seus dados</h2>
          <div className="settings-panel">
            <button
              className="settings-row"
              disabled={busy}
              onClick={() => void backup()}
            >
              <span className="category-icon blue">
                <Download size={22} />
              </span>
              <div>
                <h3>Exportar backup</h3>
                <p>Todos os arquivos, categorias e informações</p>
              </div>
              <ChevronRight size={19} />
            </button>
            <button
              className="settings-row"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <span className="category-icon green">
                <Upload size={22} />
              </span>
              <div>
                <h3>Restaurar backup</h3>
                <p>Importar uma cópia sem apagar os arquivos atuais</p>
              </div>
              <ChevronRight size={19} />
            </button>
            <button
              className="settings-row"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Adicionar quatro PDFs fictícios para explorar o aplicativo?",
                  )
                )
                  void examples();
              }}
            >
              <span className="category-icon purple">
                <FileText size={22} />
              </span>
              <div>
                <h3>Explorar com exemplos</h3>
                <p>Adicionar documentos fictícios, sem dados reais</p>
              </div>
              <Plus size={19} />
            </button>
          </div>
          <input
            hidden
            ref={input}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (
                file &&
                confirm(
                  "Restaurar este backup? Os documentos serão adicionados, sem substituir os atuais.",
                )
              ) {
                setBusy(true);
                run(async () => {
                  const count = await restoreBackup(file);
                  await refresh();
                  notify(
                    `${count} documento(s) restaurado(s). Reconfigure os alertas desejados.`,
                  );
                }).finally(() => setBusy(false));
              }
              e.target.value = "";
            }}
          />
          <h2 className="settings-heading">Zona de exclusão</h2>
          <div className="settings-panel">
            <button
              className="settings-row danger-text"
              onClick={() => setClear(true)}
            >
              <span className="category-icon pink">
                <Trash2 size={22} />
              </span>
              <div>
                <h3>Excluir todos os dados</h3>
                <p>Remover definitivamente arquivos e preferências</p>
              </div>
              <ChevronRight size={19} />
            </button>
          </div>
          {busy && (
            <p role="status">Processando… Mantenha o aplicativo aberto.</p>
          )}
        </section>
        <aside className="privacy-card">
          <span className="privacy-icon">
            <ShieldCheck size={32} />
          </span>
          <h2>
            Privacidade começa
            <br />
            com você.
          </h2>
          <p>
            Seus documentos são armazenados apenas neste dispositivo. O
            OrganizaFácil não envia seus arquivos para servidores.
          </p>
          <div>
            <HardDrive size={18} />
            <span>Arquivos locais, acesso offline</span>
          </div>
          <div>
            <Download size={18} />
            <span>Backup só quando você escolher</span>
          </div>
          <hr />
          <h3>Transparência sobre segurança</h3>
          <p>
            Criptografia própria e bloqueio biométrico ainda não estão
            implementados. Os backups são arquivos sem criptografia. Proteja o
            dispositivo e suas cópias.
          </p>
          <p className="hint">
            No navegador, limpar os dados do site remove os documentos. Exporte
            backups regularmente. O armazenamento local não substitui um backup.
          </p>
        </aside>
      </div>
      {clear && (
        <Modal title="Excluir todos os dados?" close={() => setClear(false)}>
          <p>
            Isso removerá {docs.length} documento(s), categorias e preferências.
            Exporte um backup antes, se quiser preservá-los.
          </p>
          <label>
            Digite EXCLUIR para confirmar
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </label>
          <button
            className="button danger full"
            disabled={confirmText !== "EXCLUIR" || busy}
            onClick={() =>
              run(async () => {
                setBusy(true);
                try {
                  for (const doc of docs) {
                    await cancelNotification(doc);
                    await deleteDoc(doc);
                  }
                  const d = await db();
                  await d.clear("categories");
                  await d.clear("settings");
                  await refresh();
                  setClear(false);
                  notify("Todos os dados foram excluídos.");
                } finally {
                  setBusy(false);
                }
              })
            }
          >
            Excluir definitivamente
          </button>
        </Modal>
      )}
    </>
  );
}

export default Preferences;
