import { Capacitor } from "@capacitor/core";
import {
  Camera,
  Check,
  FileText,
  ImagePlus,
  Lock,
  RotateCw,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, notify, run } from "../components/shared";
import { makePdf, transform, type Point } from "../services/image";
import { takePhoto } from "../services/native";
import { addDoc, db } from "../services/storage";
import { useApp } from "../store";
function Scanner() {
  const { categories, refresh } = useApp();
  const nav = useNavigate();
  const [pages, setPages] = useState<string[]>([]);
  const [src, setSrc] = useState("");
  const [points, setPoints] = useState<Point[]>([
    { x: 0.03, y: 0.03 },
    { x: 0.97, y: 0.03 },
    { x: 0.97, y: 0.97 },
    { x: 0.03, y: 0.97 },
  ]);
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Documento digitalizado");
  const [cat, setCat] = useState("outros");
  const input = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    run(async () => {
      const raw = await (await db()).get("settings", "scan-draft");
      if (raw) {
        const d = JSON.parse(raw);
        setPages(d.pages || []);
        setSrc(d.src || "");
        setName(d.name || "Documento digitalizado");
        setCat(d.cat || "outros");
      }
      setDraftReady(true);
    });
  }, []);
  useEffect(() => {
    if (draftReady)
      run(async () => {
        await (
          await db()
        ).put(
          "settings",
          JSON.stringify({ pages, src, name, cat }),
          "scan-draft",
        );
      });
  }, [pages, src, name, cat, draftReady]);
  const dirty = !!src || pages.length > 0;
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  function edit(blob: Blob) {
    if (!blob.type.startsWith("image/") || blob.size > 25 * 1024 * 1024)
      throw Error("Selecione uma imagem de até 25 MB.");
    const r = new FileReader();
    r.onload = () => {
      setSrc(String(r.result));
      setPoints([
        { x: 0.03, y: 0.03 },
        { x: 0.97, y: 0.03 },
        { x: 0.97, y: 0.97 },
        { x: 0.03, y: 0.97 },
      ]);
      setRotation(0);
    };
    r.readAsDataURL(blob);
  }
  async function apply() {
    setBusy(true);
    try {
      setPages([...pages, await transform(src, points, rotation)]);
      setSrc("");
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      await addDoc(await makePdf(pages), name.trim(), cat);
      await refresh();
      setPages([]);
      await (await db()).delete("settings", "scan-draft");
      notify("PDF salvo com sucesso.");
      nav("/documentos");
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
          <p className="eyebrow">DO PAPEL PARA O DIGITAL</p>
          <h1>
            Digitalizar<span>.</span>
          </h1>
          <p>Capture, ajuste e guarde. Simples assim.</p>
        </div>
        <span className="local-tag">
          <ShieldCheck size={16} />
          Processamento local
        </span>
      </div>
      <div className="scanner-layout">
        <section className="scan-workspace">
          {src ? (
            <>
              <div
                className="crop-editor"
                ref={canvasRef}
                onPointerMove={(e) => {
                  if (drag === null || !canvasRef.current) return;
                  const r = canvasRef.current.getBoundingClientRect();
                  const next = [...points];
                  next[drag] = {
                    x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                    y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
                  };
                  setPoints(next);
                }}
                onPointerUp={() => setDrag(null)}
                onPointerCancel={() => setDrag(null)}
              >
                <img src={src} alt="Página em edição" draggable={false} />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon
                    points={points
                      .map((p) => `${p.x * 100},${p.y * 100}`)
                      .join(" ")}
                    fill="#2563eb22"
                    stroke="#60a5fa"
                    strokeWidth=".5"
                  />
                </svg>
                {points.map((p, i) => (
                  <button
                    key={i}
                    aria-label={`Canto ${i + 1}: use as setas para ajustar`}
                    className="crop-handle"
                    style={{ left: p.x * 100 + "%", top: p.y * 100 + "%" }}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDrag(i);
                    }}
                    onKeyDown={(e) => {
                      const delta: Record<string, Point> = {
                        ArrowLeft: { x: -0.01, y: 0 },
                        ArrowRight: { x: 0.01, y: 0 },
                        ArrowUp: { x: 0, y: -0.01 },
                        ArrowDown: { x: 0, y: 0.01 },
                      };
                      if (delta[e.key]) {
                        e.preventDefault();
                        const next = [...points];
                        next[i] = {
                          x: Math.max(0, Math.min(1, p.x + delta[e.key].x)),
                          y: Math.max(0, Math.min(1, p.y + delta[e.key].y)),
                        };
                        setPoints(next);
                      }
                    }}
                  />
                ))}
              </div>
              <p className="hint">
                Arraste os 4 cantos na ordem para recortar e corrigir a
                perspectiva. Rotação de saída: {rotation}°.
              </p>
              <div className="scan-actions">
                <button
                  className="button subtle"
                  onClick={() => setRotation((rotation + 90) % 360)}
                >
                  <RotateCw size={18} />
                  Girar 90°
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void apply()}
                >
                  <Check size={18} />
                  {busy ? "Processando…" : "Aplicar e adicionar página"}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    if (confirm("Descartar esta captura?")) setSrc("");
                  }}
                >
                  Descartar
                </button>
              </div>
            </>
          ) : (
            <div className="scan-empty">
              <div className="scan-target">
                <ScanLine size={66} strokeWidth={1.2} />
              </div>
              <h2>
                Seu próximo documento,
                <br />
                em versão digital.
              </h2>
              <p>
                Use a câmera ou escolha uma imagem.
                <br />
                Você pode juntar várias páginas em um PDF.
              </p>
              <button
                className="button"
                onClick={() => {
                  if (Capacitor.isNativePlatform())
                    run(async () => edit(await takePhoto()));
                  else cameraInput.current?.click();
                }}
              >
                <Camera size={19} />
                Abrir câmera
              </button>
              <button
                className="button subtle"
                onClick={() => input.current?.click()}
              >
                <ImagePlus size={19} />
                Escolher da galeria
              </button>
              <span className="hint">
                JPG, PNG ou WebP · até 25 MB por imagem
              </span>
            </div>
          )}
          <input
            hidden
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(async () => edit(file));
              e.target.value = "";
            }}
          />
          <input
            hidden
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(async () => edit(file));
              e.target.value = "";
            }}
          />
        </section>
        <aside className="detail-panel">
          <h2>
            Seu novo PDF <span className="count">{pages.length}</span>
          </h2>
          <p className="hint">As páginas entram na ordem de captura.</p>
          {pages.length ? (
            <div className="page-thumbnails">
              {pages.map((p, i) => (
                <div key={i}>
                  <img src={p} alt={`Página ${i + 1}`} />
                  <span>{i + 1}</span>
                  <IconButton
                    label={`Remover página ${i + 1}`}
                    onClick={() => {
                      if (confirm("Remover esta página?"))
                        setPages(pages.filter((_, j) => i !== j));
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                  {i > 0 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        const n = [...pages];
                        [n[i - 1], n[i]] = [n[i], n[i - 1]];
                        setPages(n);
                      }}
                    >
                      Mover antes
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="page-placeholder">
              <FileText size={28} />
              <p>Nenhuma página ainda</p>
            </div>
          )}
          <label>
            Nome do documento
            <input
              value={name}
              maxLength={120}
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
          <button
            className="button full"
            disabled={!pages.length || busy || !name.trim() || !!src}
            onClick={() => void save()}
          >
            <FileText size={18} />
            {busy ? "Salvando…" : "Salvar PDF"}
          </button>
          <p className="hint">
            <Lock size={12} /> Nenhuma imagem sai deste dispositivo.
          </p>
        </aside>
      </div>
    </>
  );
}

export default Scanner;
