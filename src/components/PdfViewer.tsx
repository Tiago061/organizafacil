import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
export default function PdfViewer({url}:{url:string}){
 const canvas=useRef<HTMLCanvasElement>(null);const container=useRef<HTMLDivElement>(null);const [pdf,setPdf]=useState<pdfjs.PDFDocumentProxy|null>(null);const [page,setPage]=useState(1);const[width,setWidth]=useState(600);const[error,setError]=useState('');const[loading,setLoading]=useState(true);
 useEffect(()=>{const job=pdfjs.getDocument({url});let active=true;job.promise.then(p=>{if(active){setPdf(p);setPage(1);}}).catch(e=>{if(active)setError('Não foi possível visualizar este PDF. Você ainda pode exportá-lo.');});return()=>{active=false;void job.destroy();};},[url]);
 useEffect(()=>{if(!container.current)return;const o=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));o.observe(container.current);return()=>o.disconnect();},[]);
 useEffect(()=>{if(!pdf||!canvas.current)return;let active=true;let render:pdfjs.RenderTask|undefined;setLoading(true);pdf.getPage(page).then(p=>{if(!active||!canvas.current)return;const viewport=p.getViewport({scale:1});const scale=Math.min((width-28)/viewport.width,2);const v=p.getViewport({scale:Math.max(.1,scale)});const c=canvas.current;c.width=v.width;c.height=v.height;render=p.render({canvas:c,viewport:v});return render.promise;}).then(()=>{if(active)setLoading(false);}).catch(e=>{if(active&&e.name!=='RenderingCancelledException')setError('Falha ao renderizar a página.');});return()=>{active=false;render?.cancel();};},[pdf,page,width]);
 return <div className="pdf-viewer" ref={container}>{error?<p role="alert">{error}</p>:<><div className="pdf-controls"><button aria-label="Página anterior" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={19}/></button><span>Página {page} de {pdf?.numPages||'…'}</span><button aria-label="Próxima página" disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(page+1)}><ChevronRight size={19}/></button></div>{loading&&<p role="status">Carregando página…</p>}<canvas ref={canvas} aria-label={`Página ${page} do PDF`}/></>}</div>;
}
