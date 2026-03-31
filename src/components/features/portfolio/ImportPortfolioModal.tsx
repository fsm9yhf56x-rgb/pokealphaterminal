'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImportedCard {
  id: string; name: string; set: string; qty: number; price: number;
  language: string; condition: string; graded: boolean; grade?: string;
  source: string; _raw?: Record<string, string>; _warning?: string;
}
interface ColumnMapping {
  name: string|null; set: string|null; qty: string|null; price: string|null;
  language: string|null; condition: string|null; grade: string|null;
}
type Step = 'source'|'upload'|'mapping'|'preview'|'success';
type SourceId = 'cardmarket'|'pricecharting'|'csv'|'paste';
interface Source {
  id: SourceId; label: string; sublabel: string; icon: string;
  color: string; hint: string; acceptsPaste?: boolean;
}
interface ImportPortfolioModalProps {
  isOpen: boolean; onClose: () => void; onImport: (cards: ImportedCard[]) => void;
}

const SOURCES: Source[] = [
  { id:'cardmarket',    label:'Cardmarket',     sublabel:'Export CSV de votre compte',   icon:'🛒', color:'#3b82f6', hint:'Mon compte → Gérer mes articles → Exporter en CSV' },
  { id:'pricecharting', label:'PriceCharting',  sublabel:'Export de votre collection',   icon:'📈', color:'#8b5cf6', hint:'Collection → Export → CSV' },
  { id:'csv',           label:'CSV / Excel',    sublabel:'Tableur personnalisé',          icon:'📋', color:'#10b981', hint:'Colonnes requises : Nom, Quantité, Prix. Set, Langue, État = optionnels.' },
  { id:'paste',         label:'Copier-Coller',  sublabel:'Depuis un tableau ou une liste',icon:'📌', color:'#f59e0b', hint:"Collez un tableau copié depuis Excel, Google Sheets ou n'importe quelle liste.", acceptsPaste:true },
];

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const parseRow = (line: string): string[] => {
    const result: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === sep && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    result.push(cur.trim()); return result;
  };
  const headers = parseRow(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line); const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; }); return row;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

function autoMapColumns(headers: string[], sourceId: SourceId): ColumnMapping {
  const find = (...candidates: string[]) =>
    headers.find(h => candidates.some(c => h.toLowerCase().includes(c.toLowerCase()))) ?? null;
  if (sourceId === 'cardmarket') return {
    name: find('Article Name','Name','nom'), set: find('Expansion','Set','série','extension'),
    qty: find('Amount','Quantity','Quantit','qté','qty'), price: find('Price in €','Price','Prix','price'),
    language: find('Language','Langue','lang'), condition: find('Condition','État','etat'), grade: null,
  };
  if (sourceId === 'pricecharting') return {
    name: find('name','card name','title'), set: find('console-name','set','series'),
    qty: find('quantity','qty','count'), price: find('purchase-price','paid-amount','price','cost'),
    language: null, condition: find('condition','grade'), grade: find('grade','psa','bgs','cgc'),
  };
  return {
    name: find('nom','name','carte','card','article'), set: find('set','série','extension','expansion','collection'),
    qty: find('qté','qty','quantit','amount','nb','count'), price: find('prix','price','valeur','value','cost'),
    language: find('langue','language','lang'), condition: find('état','etat','condition','grade'),
    grade: find('grade','note','psa','bgs','cgc','pca','ccc'),
  };
}

function rowsToCards(rows: Record<string, string>[], mapping: ColumnMapping, sourceId: SourceId): ImportedCard[] {
  return rows.map((row, i) => {
    const get = (key: keyof ColumnMapping) => (mapping[key] ? row[mapping[key]!] ?? '' : '');
    const name = get('name').replace(/"/g, '').trim();
    const set = get('set').replace(/"/g, '').trim();
    const qty = Math.max(1, parseInt(get('qty').replace(',','.').replace(/[^\d.]/g,'')) || 1);
    const price = parseFloat(get('price').replace(',','.').replace(/[^\d.]/g,'')) || 0;
    const language = get('language').trim() || 'FR';
    const condition = get('condition').trim() || 'NM';
    const gradeRaw = get('grade').trim();
    const graded = /psa|bgs|cgc|pca|ccc|\d{1,2}$/.test(gradeRaw.toLowerCase());
    const warnings: string[] = [];
    if (!name) warnings.push('Nom manquant');
    if (!price) warnings.push('Prix à 0€');
    return {
      id: `import_${Date.now()}_${i}`, name: name || `Carte #${i+1}`, set: set||'—',
      qty, price, language, condition, graded, grade: gradeRaw||undefined, source: sourceId,
      _raw: row, _warning: warnings.length ? warnings.join(', ') : undefined,
    };
  });
}

export default function ImportPortfolioModal({ isOpen, onClose, onImport }: ImportPortfolioModalProps) {
  const [step, setStep] = useState<Step>('source');
  const [selectedSource, setSelectedSource] = useState<SourceId|null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name:null,set:null,qty:null,price:null,language:null,condition:null,grade:null });
  const [cards, setCards] = useState<ImportedCard[]>([]);
  const [fileName, setFileName] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('source'); setSelectedSource(null); setHeaders([]); setRows([]);
        setCards([]); setPasteText(''); setFileName(''); setIsImporting(false); setImportProgress(0);
      }, 300);
    }
  }, [isOpen]);

  const handleFileContent = useCallback((text: string, name: string, src: SourceId) => {
    const parsed = parseCSV(text);
    if (!parsed.headers.length || !parsed.rows.length) return;
    setFileName(name); setHeaders(parsed.headers); setRows(parsed.rows);
    setMapping(autoMapColumns(parsed.headers, src)); setStep('mapping');
  }, []);

  const handleFile = useCallback((file: File, src: SourceId) => {
    const reader = new FileReader();
    reader.onload = (e) => handleFileContent(e.target?.result as string, file.name, src);
    reader.readAsText(file, 'utf-8');
  }, [handleFileContent]);

  const handleDrop = useCallback((e: React.DragEvent, src: SourceId) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file, src);
  }, [handleFile]);

  const applyMapping = () => { setCards(rowsToCards(rows, mapping, selectedSource!)); setStep('preview'); };

  const handleImport = async () => {
    setIsImporting(true);
    for (let p = 0; p <= 100; p += 5) { await new Promise(r => setTimeout(r, 30)); setImportProgress(p); }
    onImport(cards); setStep('success'); setIsImporting(false);
  };

  const validCards = cards.filter(c => c.name && c.name !== '—');
  const warnCount = cards.filter(c => c._warning).length;
  const totalValue = cards.reduce((s, c) => s + c.price * c.qty, 0);
  const source = SOURCES.find(s => s.id === selectedSource);
  const steps = [{ key:'source',label:'Source' },{ key:'upload',label:'Import' },{ key:'mapping',label:'Colonnes' },{ key:'preview',label:'Vérification' },{ key:'success',label:'Terminé' }];
  const stepIdx = steps.findIndex(s => s.key === step);

  if (!isOpen) return null;

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}>
      <style dangerouslySetInnerHTML={{__html:`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}}/>
      <div style={{ background:'#0a0a0a',border:'1px solid #1f1f1f',borderRadius:'16px',width:'100%',maxWidth:'580px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'20px 24px 16px',borderBottom:'1px solid #141414' }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:'10px',fontSize:'16px',fontWeight:'700',color:'#f5f5f5',fontFamily:'var(--font-display)' }}>
              <span>📥</span> Importer un portefeuille
            </div>
            <div style={{ fontSize:'12px',color:'#555',marginTop:'4px',paddingLeft:'28px' }}>Migrez votre collection depuis d'autres plateformes</div>
          </div>
          {step !== 'success' && (
            <button onClick={onClose} style={{ background:'none',border:'1px solid #2a2a2a',color:'#666',cursor:'pointer',borderRadius:'8px',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px' }}>✕</button>
          )}
        </div>

        {/* Step bar */}
        {step !== 'success' && (
          <div style={{ display:'flex',alignItems:'center',padding:'12px 24px',borderBottom:'1px solid #141414',gap:'4px' }}>
            {steps.slice(0,-1).map((s,i) => (
              <React.Fragment key={s.key}>
                <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                  <div style={{ width:'22px',height:'22px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'700',color:'#fff',background:i<=stepIdx?'#f97316':'#2a2a2a',boxShadow:i===stepIdx?'0 0 8px rgba(249,115,22,0.5)':'none',border:i===stepIdx?'2px solid #f97316':'2px solid transparent',flexShrink:0 }}>
                    {i < stepIdx ? '✓' : i+1}
                  </div>
                  <span style={{ fontSize:'11px',color:i<=stepIdx?'#d4d4d4':'#555',fontWeight:i===stepIdx?'600':'400' }}>{s.label}</span>
                </div>
                {i < steps.length-2 && <div style={{ flex:1,height:'1px',background:i<stepIdx?'#f97316':'#2a2a2a',maxWidth:'40px' }}/>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div style={{ padding:'20px 24px 24px' }}>

          {/* SOURCE */}
          {step==='source' && (
            <div style={{ animation:'fadeIn .2s ease' }}>
              <p style={{ fontSize:'12px',color:'#888',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'14px',fontFamily:'var(--font-display)' }}>Choisissez votre source d'import</p>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px' }}>
                {SOURCES.map(src => (
                  <button key={src.id} onClick={()=>{ setSelectedSource(src.id); setStep('upload'); }}
                    style={{ background:'#141414',border:`1px solid #2a2a2a`,borderRadius:'12px',padding:'16px 12px',cursor:'pointer',textAlign:'center',transition:'all .15s' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor=src.color; (e.currentTarget as HTMLElement).style.background=`${src.color}10`; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor='#2a2a2a'; (e.currentTarget as HTMLElement).style.background='#141414'; }}>
                    <div style={{ fontSize:'28px',marginBottom:'8px' }}>{src.icon}</div>
                    <div style={{ fontSize:'14px',fontWeight:'700',color:'#f5f5f5',marginBottom:'4px',fontFamily:'var(--font-display)' }}>{src.label}</div>
                    <div style={{ fontSize:'11px',color:'#666' }}>{src.sublabel}</div>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex',gap:'8px',alignItems:'flex-start',background:'rgba(249,115,22,0.05)',border:'1px solid rgba(249,115,22,0.15)',borderRadius:'10px',padding:'10px 12px' }}>
                <span style={{ color:'#f97316',fontSize:'12px' }}>💡</span>
                <span style={{ fontSize:'12px',color:'#888' }}>Vous pouvez aussi importer un CSV générique depuis n'importe quel tableau. Les colonnes seront détectées automatiquement.</span>
              </div>
            </div>
          )}

          {/* UPLOAD */}
          {step==='upload' && source && (
            <div style={{ animation:'fadeIn .2s ease' }}>
              <button onClick={()=>setStep('source')} style={{ background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:'12px',padding:'0',marginBottom:'14px',display:'block' }}>← Retour</button>
              <div style={{ display:'inline-flex',alignItems:'center',gap:'6px',border:`1px solid ${source.color}`,borderRadius:'20px',padding:'4px 12px',fontSize:'12px',fontWeight:'600',color:source.color,marginBottom:'16px' }}>
                {source.icon} {source.label}
              </div>
              <div style={{ background:'#111',border:'1px solid #1f1f1f',borderRadius:'8px',padding:'10px 12px',fontSize:'11px',color:'#666',marginBottom:'14px',fontFamily:'monospace' }}>{source.hint}</div>
              {source.acceptsPaste ? (
                <div>
                  <p style={{ fontSize:'12px',color:'#888',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px',fontFamily:'var(--font-display)' }}>Collez votre tableau ci-dessous</p>
                  <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
                    placeholder={"Nom\tSet\tQté\tPrix\nCharizard ex\tSV\t1\t85.00\n..."}
                    style={{ width:'100%',minHeight:'140px',background:'#0d0d0d',border:'1px solid #2a2a2a',borderRadius:'10px',color:'#ccc',fontFamily:'monospace',fontSize:'12px',padding:'12px',resize:'vertical',boxSizing:'border-box',marginBottom:'12px',outline:'none' }}
                    spellCheck={false}/>
                  <button onClick={()=>{ if(pasteText.trim()) handleFileContent(pasteText,'coller',source.id) }} disabled={!pasteText.trim()}
                    style={{ width:'100%',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:'#fff',padding:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer',opacity:pasteText.trim()?1:0.4 }}>
                    Analyser le tableau →
                  </button>
                </div>
              ) : (
                <div>
                  <div onDragOver={e=>{ e.preventDefault(); setIsDragging(true); }} onDragLeave={()=>setIsDragging(false)}
                    onDrop={e=>handleDrop(e,source.id)} onClick={()=>fileRef.current?.click()}
                    style={{ border:`2px dashed ${isDragging?'#f97316':'#2a2a2a'}`,borderRadius:'12px',padding:'32px 20px',textAlign:'center',cursor:'pointer',background:isDragging?'rgba(249,115,22,0.05)':'#0d0d0d',transition:'all .2s',marginBottom:'14px' }}>
                    <div style={{ fontSize:'36px',marginBottom:'12px',opacity:0.6 }}>📄</div>
                    <div style={{ fontSize:'14px',color:'#888',marginBottom:'6px' }}>{isDragging?'Relâchez pour importer':'Glissez votre fichier CSV ici'}</div>
                    <div style={{ fontSize:'12px',color:'#555' }}>ou cliquez pour sélectionner</div>
                    <div style={{ marginTop:'16px',display:'flex',gap:'6px',justifyContent:'center' }}>
                      {['.csv','.tsv','.txt'].map(ext=><span key={ext} style={{ background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:'6px',padding:'2px 8px',fontSize:'10px',color:'#555',fontFamily:'monospace' }}>{ext}</span>)}
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display:'none' }}
                    onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f,source.id); }}/>
                </div>
              )}
            </div>
          )}

          {/* MAPPING */}
          {step==='mapping' && (
            <div style={{ animation:'fadeIn .2s ease' }}>
              <button onClick={()=>setStep('upload')} style={{ background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:'12px',padding:'0',marginBottom:'14px',display:'block' }}>← Retour</button>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px' }}>
                <div>
                  <p style={{ fontSize:'12px',color:'#888',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px',fontFamily:'var(--font-display)' }}>Correspondance des colonnes</p>
                  <p style={{ fontSize:'12px',color:'#666',margin:0 }}>{rows.length} lignes — <span style={{ color:'#f97316' }}>{fileName}</span></p>
                </div>
                <div style={{ background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',color:'#10b981' }}>✨ Auto-détecté</div>
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px' }}>
                {(Object.keys(mapping) as (keyof ColumnMapping)[]).map(field => {
                  const meta: Record<keyof ColumnMapping,{label:string;req?:boolean}> = {
                    name:{label:'Nom de la carte',req:true},set:{label:'Set / Série'},qty:{label:'Quantité',req:true},
                    price:{label:'Prix (€)',req:true},language:{label:'Langue'},condition:{label:'État'},grade:{label:'Grade (PSA/PCA…)'},
                  };
                  return (
                    <div key={field} style={{ display:'grid',gridTemplateColumns:'140px 24px 1fr auto',alignItems:'center',gap:'8px' }}>
                      <div style={{ fontSize:'12px',color:'#aaa',textAlign:'right' }}>
                        {meta[field].label}{meta[field].req&&<span style={{ color:'#f97316',marginLeft:'3px' }}>*</span>}
                      </div>
                      <div style={{ color:'#3a3a3a',fontSize:'14px',textAlign:'center' }}>→</div>
                      <select value={mapping[field]??''} onChange={e=>setMapping(m=>({...m,[field]:e.target.value||null}))}
                        style={{ background:'#141414',border:'1px solid #2a2a2a',borderRadius:'8px',color:'#ccc',fontSize:'12px',padding:'6px 10px',outline:'none',fontFamily:'monospace',width:'100%' }}>
                        <option value="">— Ignorer —</option>
                        {headers.map(h=><option key={h} value={h}>{h}</option>)}
                      </select>
                      {mapping[field]&&rows[0]?.[mapping[field]!]&&(
                        <div style={{ fontSize:'10px',color:'#555',fontFamily:'monospace',background:'#111',borderRadius:'6px',padding:'2px 8px',whiteSpace:'nowrap',overflow:'hidden',maxWidth:'80px',textOverflow:'ellipsis' }}>
                          ex: <em>{rows[0][mapping[field]!].slice(0,20)}</em>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ background:'#0d0d0d',border:'1px solid #1a1a1a',borderRadius:'8px',padding:'12px',marginBottom:'16px',overflowX:'auto' }}>
                <p style={{ fontSize:'11px',color:'#555',marginBottom:'8px',fontFamily:'monospace' }}>APERÇU — 3 premières lignes</p>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'11px' }}>
                  <thead><tr>{headers.slice(0,6).map(h=><th key={h} style={{ textAlign:'left',padding:'6px 10px',color:'#555',fontSize:'10px',fontFamily:'monospace',fontWeight:'600',letterSpacing:'0.8px',textTransform:'uppercase',borderBottom:'1px solid #1a1a1a',whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>{rows.slice(0,3).map((row,i)=><tr key={i}>{headers.slice(0,6).map(h=><td key={h} style={{ padding:'7px 10px',color:'#888',fontFamily:'monospace' }}>{row[h]?.slice(0,20)??'—'}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <button onClick={applyMapping} style={{ width:'100%',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:'#fff',padding:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer' }}>
                Prévisualiser l'import ({rows.length} cartes) →
              </button>
            </div>
          )}

          {/* PREVIEW */}
          {step==='preview' && (
            <div style={{ animation:'fadeIn .2s ease' }}>
              <button onClick={()=>setStep('mapping')} style={{ background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:'12px',padding:'0',marginBottom:'14px',display:'block' }}>← Retour</button>
              <div style={{ display:'flex',gap:'10px',marginBottom:'14px' }}>
                {[
                  {v:validCards.length,l:'Cartes',c:'#f5f5f5'},
                  {v:cards.reduce((s,c)=>s+c.qty,0),l:'Exemplaires',c:'#f5f5f5'},
                  {v:totalValue.toFixed(0)+'€',l:'Valeur',c:'#10b981'},
                  ...(warnCount>0?[{v:warnCount,l:'Avert.',c:'#f59e0b'}]:[]),
                ].map(s=>(
                  <div key={s.l} style={{ flex:1,background:'#111',border:`1px solid ${s.c==='#10b981'?'rgba(16,185,129,.3)':s.c==='#f59e0b'?'rgba(245,158,11,.3)':'#2a2a2a'}`,borderRadius:'10px',padding:'12px 10px',textAlign:'center' }}>
                    <div style={{ fontSize:'20px',fontWeight:'700',color:s.c,fontFamily:'var(--font-display)' }}>{s.v}</div>
                    <div style={{ fontSize:'10px',color:'#555',marginTop:'4px',textTransform:'uppercase',letterSpacing:'0.8px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {warnCount>0&&<div style={{ background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'8px',padding:'10px 12px',fontSize:'12px',color:'#d97706',marginBottom:'12px' }}>⚠️ {warnCount} carte(s) avec données incomplètes — importées quand même.</div>}
              <div style={{ background:'#0d0d0d',border:'1px solid #1a1a1a',borderRadius:'10px',overflow:'hidden',marginBottom:'16px',maxHeight:'260px',overflowY:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'12px' }}>
                  <thead><tr style={{ background:'#0d0d0d' }}>{['Carte','Set','Qté','Prix','Langue','État',''].map(h=><th key={h} style={{ textAlign:'left',padding:'6px 10px',color:'#555',fontSize:'10px',fontFamily:'monospace',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.8px',borderBottom:'1px solid #1a1a1a',whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {cards.slice(0,10).map(card=>(
                      <tr key={card.id} style={{ borderBottom:'1px solid #1a1a1a' }}>
                        <td style={{ padding:'7px 10px',color:'#f5f5f5',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{card.name}</td>
                        <td style={{ padding:'7px 10px',color:'#888' }}>{card.set}</td>
                        <td style={{ padding:'7px 10px',textAlign:'center',fontWeight:'600',color:'#f97316' }}>×{card.qty}</td>
                        <td style={{ padding:'7px 10px',textAlign:'right',color:'#10b981',fontWeight:'600' }}>{card.price>0?`${card.price.toFixed(2)}€`:'—'}</td>
                        <td style={{ padding:'7px 10px',textAlign:'center',color:'#888' }}>{card.language}</td>
                        <td style={{ padding:'7px 10px',textAlign:'center',color:'#888' }}>{card.condition}</td>
                        <td style={{ padding:'7px 10px',textAlign:'center' }}>{card._warning&&<span title={card._warning} style={{ color:'#f59e0b' }}>⚠</span>}</td>
                      </tr>
                    ))}
                    {cards.length>10&&<tr><td colSpan={7} style={{ padding:'7px 10px',textAlign:'center',color:'#555',fontStyle:'italic' }}>+ {cards.length-10} cartes supplémentaires…</td></tr>}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} disabled={isImporting}
                style={{ width:'100%',background:'linear-gradient(135deg,#10b981,#059669)',border:'none',borderRadius:'10px',color:'#fff',padding:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer' }}>
                {isImporting
                  ? <span style={{ display:'flex',alignItems:'center',gap:'8px',justifyContent:'center' }}><div style={{ width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }}/> Import en cours… {importProgress}%</span>
                  : `✓ Importer ${validCards.length} cartes dans mon portefeuille`}
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step==='success' && (
            <div style={{ textAlign:'center',padding:'32px 16px',animation:'fadeIn .2s ease' }}>
              <div style={{ fontSize:'56px',marginBottom:'16px' }}>🎉</div>
              <h2 style={{ fontSize:'22px',fontWeight:'700',color:'#f5f5f5',margin:'0 0 8px',fontFamily:'var(--font-display)' }}>Import réussi !</h2>
              <p style={{ color:'#888',fontSize:'14px',marginBottom:'24px' }}>
                <span style={{ color:'#f97316',fontWeight:'700' }}>{validCards.length} cartes</span> ajoutées à votre portefeuille PokéAlpha
              </p>
              <div style={{ display:'flex',gap:'12px',justifyContent:'center',background:'#111',border:'1px solid #1f1f1f',borderRadius:'12px',padding:'16px',marginBottom:'24px' }}>
                {[{v:cards.reduce((s,c)=>s+c.qty,0),l:'Exemplaires',c:'#f97316'},{v:totalValue.toFixed(0)+'€',l:'Valeur',c:'#10b981'},{v:source?.label??'CSV',l:'Source',c:'#8b5cf6'}].map(s=>(
                  <div key={s.l} style={{ flex:1,textAlign:'center' }}>
                    <div style={{ fontSize:'20px',fontWeight:'700',color:s.c,fontFamily:'var(--font-display)' }}>{s.v}</div>
                    <div style={{ fontSize:'11px',color:'#666' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:'10px',justifyContent:'center' }}>
                <button onClick={onClose} style={{ background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:'#fff',padding:'12px 24px',fontSize:'14px',fontWeight:'700',cursor:'pointer' }}>Voir mon portefeuille →</button>
                <button onClick={()=>{ setStep('source'); setSelectedSource(null); setHeaders([]); setRows([]); setCards([]); setPasteText(''); setFileName(''); }}
                  style={{ background:'#141414',border:'1px solid #2a2a2a',borderRadius:'10px',color:'#888',padding:'12px 20px',fontSize:'14px',cursor:'pointer' }}>Nouvel import</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
