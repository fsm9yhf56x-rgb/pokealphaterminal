"use client"
import React, { useState, useRef, useCallback, useEffect } from 'react'

interface ImportedCard {
  id:string; name:string; set:string; qty:number; price:number;
  language:string; condition:string; graded:boolean; grade?:string;
  source:string; _raw?:Record<string,string>; _warning?:string;
}
interface ColumnMapping {
  name:string|null; set:string|null; qty:string|null; price:string|null;
  language:string|null; condition:string|null; grade:string|null;
}
type Step = 'source'|'upload'|'mapping'|'preview'|'success'
type SourceId = 'cardmarket'|'pricecharting'|'csv'|'paste'
interface Source { id:SourceId; label:string; sub:string; icon:string; hint:string; acceptsPaste?:boolean }
interface Props { isOpen:boolean; onClose:()=>void; onImport:(cards:ImportedCard[])=>void }

const Ic = ({d,c='#86868B',s=16}:{d:string;c?:string;s?:number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
)
const PATHS = {
  cart:'M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6',
  chart:'M23 6l-9.5 9.5-5-5L1 18M23 6h-6M23 6v6',
  file:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',
  paste:'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6v4H9z',
  upload:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  check:'M20 6L9 17l-5-5',
  x:'M18 6L6 18M6 6l12 12',
  alert:'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  back:'M19 12H5M12 19l-7-7 7-7',
  ok:'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
}

const SOURCES: Source[] = [
  {id:'cardmarket',    label:'Cardmarket',    sub:'Export CSV de votre compte',    icon:PATHS.cart,    hint:'Mon compte → Gerer mes articles → Exporter en CSV'},
  {id:'pricecharting', label:'PriceCharting',  sub:'Export de votre collection',    icon:PATHS.chart,   hint:'Collection → Export → CSV'},
  {id:'csv',           label:'CSV / Excel',    sub:'Tableur personnalise',           icon:PATHS.file,    hint:'Colonnes requises : Nom, Quantite, Prix. Set, Langue, Etat = optionnels.'},
  {id:'paste',         label:'Copier-Coller',  sub:'Depuis un tableau ou une liste', icon:PATHS.paste,   hint:'Collez un tableau copie depuis Excel, Google Sheets ou une liste.', acceptsPaste:true},
]

function parseCSV(text:string):{headers:string[];rows:Record<string,string>[]} {
  const lines=text.trim().split(/\r?\n/).filter(l=>l.trim())
  if(!lines.length) return {headers:[],rows:[]}
  const sep=lines[0].includes('\t')?'\t':','
  const parseRow=(line:string):string[]=>{
    const r:string[]=[]; let cur='',inQ=false
    for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){inQ=!inQ;continue};if(c===sep&&!inQ){r.push(cur.trim());cur='';continue};cur+=c}
    r.push(cur.trim());return r
  }
  const headers=parseRow(lines[0]).map(h=>h.replace(/^["']|["']$/g,'').trim())
  const rows=lines.slice(1).map(line=>{const vals=parseRow(line);const row:Record<string,string>={};headers.forEach((h,i)=>{row[h]=vals[i]??''});return row}).filter(r=>Object.values(r).some(v=>v))
  return {headers,rows}
}

function autoMap(headers:string[],src:SourceId):ColumnMapping {
  const f=(...c:string[])=>headers.find(h=>c.some(x=>h.toLowerCase().includes(x.toLowerCase())))??null
  if(src==='cardmarket') return {name:f('Article Name','Name','nom'),set:f('Expansion','Set','serie'),qty:f('Amount','Quantity','qte','qty'),price:f('Price in','Price','Prix'),language:f('Language','Langue'),condition:f('Condition','Etat'),grade:null}
  if(src==='pricecharting') return {name:f('name','card name','title'),set:f('console-name','set','series'),qty:f('quantity','qty','count'),price:f('purchase-price','paid-amount','price','cost'),language:null,condition:f('condition','grade'),grade:f('grade','psa','bgs')}
  return {name:f('nom','name','carte','card','article'),set:f('set','serie','extension','expansion','collection'),qty:f('qte','qty','quantit','amount','nb'),price:f('prix','price','valeur','value','cost'),language:f('langue','language','lang'),condition:f('etat','condition','grade'),grade:f('grade','note','psa','bgs','cgc','pca','ccc')}
}

function toCards(rows:Record<string,string>[],m:ColumnMapping,src:SourceId):ImportedCard[] {
  return rows.map((row,i)=>{
    const g=(k:keyof ColumnMapping)=>(m[k]?row[m[k]!]??'':'')
    const name=g('name').replace(/"/g,'').trim()
    const set=g('set').replace(/"/g,'').trim()
    const qty=Math.max(1,parseInt(g('qty').replace(',','.').replace(/[^\d.]/g,''))||1)
    const price=parseFloat(g('price').replace(',','.').replace(/[^\d.]/g,''))||0
    const language=g('language').trim()||'FR'
    const condition=g('condition').trim()||'NM'
    const gradeRaw=g('grade').trim()
    const graded=/psa|bgs|cgc|pca|ccc|\d{1,2}$/.test(gradeRaw.toLowerCase())
    const w:string[]=[]; if(!name)w.push('Nom manquant'); if(!price)w.push('Prix a 0')
    return {id:`imp_${Date.now()}_${i}`,name:name||`Carte #${i+1}`,set:set||'—',qty,price,language,condition,graded,grade:gradeRaw||undefined,source:src,_raw:row,_warning:w.length?w.join(', '):undefined}
  })
}

export default function ImportPortfolioModal({isOpen,onClose,onImport}:Props) {
  const [step,setStep]=useState<Step>('source')
  const [selSrc,setSelSrc]=useState<SourceId|null>(null)
  const [isDrag,setIsDrag]=useState(false)
  const [paste,setPaste]=useState('')
  const [headers,setHeaders]=useState<string[]>([])
  const [rows,setRows]=useState<Record<string,string>[]>([])
  const [mapping,setMapping]=useState<ColumnMapping>({name:null,set:null,qty:null,price:null,language:null,condition:null,grade:null})
  const [cards,setCards]=useState<ImportedCard[]>([])
  const [fName,setFName]=useState('')
  const [prog,setProg]=useState(0)
  const [importing,setImporting]=useState(false)
  const ref=useRef<HTMLInputElement>(null)

  useEffect(()=>{if(!isOpen)setTimeout(()=>{setStep('source');setSelSrc(null);setHeaders([]);setRows([]);setCards([]);setPaste('');setFName('');setImporting(false);setProg(0)},300)},[isOpen])

  const handleContent=useCallback((text:string,name:string,src:SourceId)=>{
    const p=parseCSV(text);if(!p.headers.length||!p.rows.length)return
    setFName(name);setHeaders(p.headers);setRows(p.rows);setMapping(autoMap(p.headers,src));setStep('mapping')
  },[])
  const handleFile=useCallback((file:File,src:SourceId)=>{const r=new FileReader();r.onload=e=>handleContent(e.target?.result as string,file.name,src);r.readAsText(file,'utf-8')},[handleContent])
  const handleDrop=useCallback((e:React.DragEvent,src:SourceId)=>{e.preventDefault();setIsDrag(false);const f=e.dataTransfer.files[0];if(f)handleFile(f,src)},[handleFile])
  const applyMapping=()=>{setCards(toCards(rows,mapping,selSrc!));setStep('preview')}
  const handleImport=async()=>{setImporting(true);for(let p=0;p<=100;p+=5){await new Promise(r=>setTimeout(r,30));setProg(p)};onImport(cards);setStep('success');setImporting(false)}

  const valid=cards.filter(c=>c.name&&c.name!=='—')
  const warns=cards.filter(c=>c._warning).length
  const totalVal=cards.reduce((s,c)=>s+c.price*c.qty,0)
  const src=SOURCES.find(s=>s.id===selSrc)
  const STEPS=[{k:'source',l:'Source'},{k:'upload',l:'Import'},{k:'mapping',l:'Colonnes'},{k:'preview',l:'Verification'}]
  const sIdx=STEPS.findIndex(s=>s.k===step)

  if(!isOpen) return null

  return (
    <>
    <style dangerouslySetInnerHTML={{__html:`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}}/>
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:'20px',width:'100%',maxWidth:'560px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 60px rgba(0,0,0,.15),0 8px 20px rgba(0,0,0,.06)',border:'1px solid #E5E5EA'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 22px',borderBottom:'1px solid #E5E5EA'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <Ic d={PATHS.upload} c="#1D1D1F" s={18}/>
              <span style={{fontSize:'16px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)'}}>Importer un portefeuille</span>
            </div>
            <div style={{fontSize:'11px',color:'#86868B',marginTop:'3px',paddingLeft:'26px'}}>Migrez votre collection depuis d'autres plateformes</div>
          </div>
          {step!=='success'&&(
            <button onClick={onClose} style={{width:'28px',height:'28px',borderRadius:'50%',background:'#F0F0F5',border:'none',color:'#86868B',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='#E5E5EA';e.currentTarget.style.color='#1D1D1F'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#F0F0F5';e.currentTarget.style.color='#86868B'}}>
              <Ic d={PATHS.x} c="currentColor" s={14}/>
            </button>
          )}
        </div>

        {/* Step bar */}
        {step!=='success'&&(
          <div style={{display:'flex',alignItems:'center',padding:'12px 22px',borderBottom:'1px solid #F0F0F5',gap:'4px'}}>
            {STEPS.map((s,i)=>(
              <React.Fragment key={s.k}>
                <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <div style={{width:'22px',height:'22px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,color:i<=sIdx?'#fff':'#AEAEB2',background:i<=sIdx?'#1D1D1F':'#F0F0F5',flexShrink:0,transition:'all .2s'}}>
                    {i<sIdx?<Ic d={PATHS.check} c="#fff" s={10}/>:i+1}
                  </div>
                  <span style={{fontSize:'11px',color:i<=sIdx?'#1D1D1F':'#AEAEB2',fontWeight:i===sIdx?600:400,fontFamily:'var(--font-display)'}}>{s.l}</span>
                </div>
                {i<STEPS.length-1&&<div style={{flex:1,height:'1px',background:i<sIdx?'#1D1D1F':'#E5E5EA',maxWidth:'40px'}}/>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div style={{padding:'20px 22px 24px'}}>

          {/* ═══ SOURCE ═══ */}
          {step==='source'&&(
            <div style={{animation:'fadeIn .2s ease'}}>
              <div style={{fontSize:'10px',fontWeight:600,color:'#86868B',textTransform:'uppercase',letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'12px'}}>Choisissez votre source</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
                {SOURCES.map(s=>(
                  <button key={s.id} onClick={()=>{setSelSrc(s.id);setStep('upload')}}
                    style={{background:'#F5F5F7',border:'1px solid #E5E5EA',borderRadius:'14px',padding:'18px 14px',cursor:'pointer',textAlign:'center',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#1D1D1F';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,.06)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E5EA';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
                    <div style={{marginBottom:'8px',opacity:.7}}><Ic d={s.icon} c="#1D1D1F" s={24}/></div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:'3px'}}>{s.label}</div>
                    <div style={{fontSize:'10px',color:'#86868B'}}>{s.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-start',background:'#F5F5F7',border:'1px solid #E5E5EA',borderRadius:'10px',padding:'10px 12px'}}>
                <Ic d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" c="#86868B" s={14}/>
                <span style={{fontSize:'11px',color:'#86868B'}}>Importez un CSV generique — les colonnes seront detectees automatiquement.</span>
              </div>
            </div>
          )}

          {/* ═══ UPLOAD ═══ */}
          {step==='upload'&&src&&(
            <div style={{animation:'fadeIn .2s ease'}}>
              <button onClick={()=>setStep('source')} style={{background:'none',border:'none',color:'#86868B',cursor:'pointer',fontSize:'12px',padding:0,marginBottom:'14px',display:'flex',alignItems:'center',gap:'4px',fontFamily:'var(--font-display)'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#1D1D1F'}} onMouseLeave={e=>{e.currentTarget.style.color='#86868B'}}>
                <Ic d={PATHS.back} c="currentColor" s={14}/> Retour
              </button>
              <div style={{display:'inline-flex',alignItems:'center',gap:'6px',border:'1px solid #1D1D1F',borderRadius:'99px',padding:'5px 14px',marginBottom:'14px'}}>
                <Ic d={src.icon} c="#1D1D1F" s={14}/>
                <span style={{fontSize:'12px',fontWeight:600,color:'#1D1D1F',fontFamily:'var(--font-display)'}}>{src.label}</span>
              </div>
              <div style={{background:'#F5F5F7',border:'1px solid #E5E5EA',borderRadius:'10px',padding:'10px 14px',fontSize:'11px',color:'#86868B',marginBottom:'14px',fontFamily:'var(--font-data)'}}>{src.hint}</div>

              {src.acceptsPaste?(
                <div>
                  <div style={{fontSize:'10px',fontWeight:600,color:'#86868B',textTransform:'uppercase',letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'8px'}}>Collez votre tableau</div>
                  <textarea value={paste} onChange={e=>setPaste(e.target.value)}
                    placeholder={"Nom\tSet\tQte\tPrix\nCharizard ex\tSV\t1\t85.00\n..."}
                    style={{width:'100%',minHeight:'140px',background:'#F5F5F7',border:'1px solid #E5E5EA',borderRadius:'12px',color:'#1D1D1F',fontFamily:'var(--font-data)',fontSize:'12px',padding:'14px',resize:'vertical',boxSizing:'border-box',marginBottom:'12px',outline:'none'}}
                    onFocus={e=>{e.currentTarget.style.borderColor='#1D1D1F'}} onBlur={e=>{e.currentTarget.style.borderColor='#E5E5EA'}}
                    spellCheck={false}/>
                  <button onClick={()=>{if(paste.trim())handleContent(paste,'coller',src.id)}} disabled={!paste.trim()}
                    style={{width:'100%',background:paste.trim()?'#1D1D1F':'#F0F0F5',border:'none',borderRadius:'12px',color:paste.trim()?'#fff':'#AEAEB2',padding:'12px',fontSize:'13px',fontWeight:700,cursor:paste.trim()?'pointer':'default',fontFamily:'var(--font-display)',transition:'all .15s'}}>
                    Analyser le tableau
                  </button>
                </div>
              ):(
                <div>
                  <div onDragOver={e=>{e.preventDefault();setIsDrag(true)}} onDragLeave={()=>setIsDrag(false)}
                    onDrop={e=>handleDrop(e,src.id)} onClick={()=>ref.current?.click()}
                    style={{border:`2px dashed ${isDrag?'#1D1D1F':'#D2D2D7'}`,borderRadius:'14px',padding:'36px 20px',textAlign:'center',cursor:'pointer',background:isDrag?'rgba(29,29,31,.03)':'#FAFAFA',transition:'all .2s',marginBottom:'14px'}}
                    onMouseEnter={e=>{if(!isDrag)e.currentTarget.style.borderColor='#86868B'}} onMouseLeave={e=>{if(!isDrag)e.currentTarget.style.borderColor='#D2D2D7'}}>
                    <div style={{marginBottom:'12px',opacity:.4}}><Ic d={PATHS.upload} c="#1D1D1F" s={32}/></div>
                    <div style={{fontSize:'14px',color:'#48484A',marginBottom:'4px',fontFamily:'var(--font-display)'}}>{isDrag?'Relachez pour importer':'Glissez votre fichier ici'}</div>
                    <div style={{fontSize:'12px',color:'#AEAEB2'}}>ou cliquez pour selectionner</div>
                    <div style={{marginTop:'14px',display:'flex',gap:'6px',justifyContent:'center'}}>
                      {['.csv','.tsv','.txt'].map(ext=><span key={ext} style={{background:'#F0F0F5',border:'1px solid #E5E5EA',borderRadius:'6px',padding:'2px 8px',fontSize:'10px',color:'#86868B',fontFamily:'var(--font-data)'}}>{ext}</span>)}
                    </div>
                  </div>
                  <input ref={ref} type="file" accept=".csv,.tsv,.txt" style={{display:'none'}}
                    onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f,src.id)}}/>
                </div>
              )}
            </div>
          )}

          {/* ═══ MAPPING ═══ */}
          {step==='mapping'&&(
            <div style={{animation:'fadeIn .2s ease'}}>
              <button onClick={()=>setStep('upload')} style={{background:'none',border:'none',color:'#86868B',cursor:'pointer',fontSize:'12px',padding:0,marginBottom:'14px',display:'flex',alignItems:'center',gap:'4px',fontFamily:'var(--font-display)'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#1D1D1F'}} onMouseLeave={e=>{e.currentTarget.style.color='#86868B'}}>
                <Ic d={PATHS.back} c="currentColor" s={14}/> Retour
              </button>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                <div>
                  <div style={{fontSize:'10px',fontWeight:600,color:'#86868B',textTransform:'uppercase',letterSpacing:'.1em',fontFamily:'var(--font-display)',marginBottom:'3px'}}>Correspondance des colonnes</div>
                  <div style={{fontSize:'12px',color:'#48484A'}}>{rows.length} lignes — <span style={{fontWeight:600,color:'#1D1D1F'}}>{fName}</span></div>
                </div>
                <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                  <div style={{background:'rgba(46,158,106,.08)',border:'1px solid rgba(46,158,106,.2)',borderRadius:'99px',padding:'3px 10px',fontSize:'10px',fontWeight:600,color:'#2E9E6A',fontFamily:'var(--font-display)',display:'flex',alignItems:'center',gap:'4px'}}>
                    <Ic d={PATHS.check} c="#2E9E6A" s={10}/> Auto-detecte
                  </div>
                  <span style={{fontSize:'10px',color:'#86868B',fontFamily:'var(--font-data)'}}>{Object.values(mapping).filter(Boolean).length}/{Object.keys(mapping).length}</span>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'14px'}}>
                {(Object.keys(mapping) as (keyof ColumnMapping)[]).map(field=>{
                  const meta:Record<keyof ColumnMapping,{label:string;req?:boolean}>={name:{label:'Nom de la carte',req:true},set:{label:'Set / Serie'},qty:{label:'Quantite',req:true},price:{label:'Prix',req:true},language:{label:'Langue'},condition:{label:'Etat'},grade:{label:'Grade'}}
                  return (
                    <div key={field} style={{display:'grid',gridTemplateColumns:'130px 20px 1fr auto',alignItems:'center',gap:'6px'}}>
                      <div style={{fontSize:'11px',color:'#48484A',textAlign:'right',fontFamily:'var(--font-display)'}}>
                        {meta[field].label}{meta[field].req&&<span style={{color:'#E03020',marginLeft:'2px'}}>*</span>}
                      </div>
                      <div style={{color:'#D2D2D7',fontSize:'12px',textAlign:'center'}}>→</div>
                      <select value={mapping[field]??''} onChange={e=>setMapping(m=>({...m,[field]:e.target.value||null}))}
                        style={{background:mapping[field]?'#fff':'#F5F5F7',border:`1px solid ${mapping[field]?'#2E9E6A':'#E5E5EA'}`,borderRadius:'8px',color:mapping[field]?'#1D1D1F':'#AEAEB2',fontSize:'12px',padding:'7px 10px',outline:'none',fontFamily:'var(--font-data)',width:'100%'}}>
                        <option value="">— Ignorer —</option>
                        {headers.map(h=><option key={h} value={h}>{h}</option>)}
                      </select>
                      {mapping[field]&&rows[0]?.[mapping[field]!]&&(
                        <div style={{fontSize:'10px',color:'#86868B',fontFamily:'var(--font-data)',background:'#F0F0F5',borderRadius:'6px',padding:'2px 8px',whiteSpace:'nowrap',overflow:'hidden',maxWidth:'80px',textOverflow:'ellipsis'}}>
                          {rows[0][mapping[field]!].slice(0,20)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{background:'#F5F5F7',borderRadius:'10px',padding:'12px',marginBottom:'14px',overflowX:'auto'}}>
                <div style={{fontSize:'10px',color:'#86868B',marginBottom:'6px',fontFamily:'var(--font-display)',fontWeight:600}}>APERCU — 3 premieres lignes</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                  <thead><tr>{headers.slice(0,6).map(h=><th key={h} style={{textAlign:'left',padding:'5px 8px',color:'#86868B',fontSize:'9px',fontFamily:'var(--font-data)',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',borderBottom:'1px solid #E5E5EA',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                  <tbody>{rows.slice(0,3).map((row,i)=><tr key={i}>{headers.slice(0,6).map(h=><td key={h} style={{padding:'5px 8px',color:'#48484A',fontFamily:'var(--font-data)',fontSize:'11px'}}>{row[h]?.slice(0,20)??'—'}</td>)}</tr>)}</tbody>
                </table>
              </div>
                            {!mapping.name&&<div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',borderRadius:'10px',background:'rgba(224,48,32,.06)',border:'1px solid rgba(224,48,32,.1)',marginBottom:'10px'}}>
                <Ic d={PATHS.alert} c="#E03020" s={14}/>
                <span style={{fontSize:'11px',color:'#E03020',fontFamily:'var(--font-display)'}}>La colonne "Nom de la carte" doit etre associee</span>
              </div>}
              <button onClick={applyMapping} disabled={!mapping.name}
                style={{width:'100%',background:mapping.name?'#1D1D1F':'#F0F0F5',border:'none',borderRadius:'12px',color:mapping.name?'#fff':'#AEAEB2',padding:'12px',fontSize:'13px',fontWeight:700,cursor:mapping.name?'pointer':'default',fontFamily:'var(--font-display)',transition:'all .15s'}}
                onMouseEnter={e=>{if(mapping.name)e.currentTarget.style.background='#333'}} onMouseLeave={e=>{e.currentTarget.style.background=mapping.name?'#1D1D1F':'#F0F0F5'}}>
                Previsualiser l'import ({rows.length} cartes)
              </button>
            </div>
          )}

          {/* ═══ PREVIEW ═══ */}
          {step==='preview'&&(
            <div style={{animation:'fadeIn .2s ease'}}>
              <button onClick={()=>setStep('mapping')} style={{background:'none',border:'none',color:'#86868B',cursor:'pointer',fontSize:'12px',padding:0,marginBottom:'14px',display:'flex',alignItems:'center',gap:'4px',fontFamily:'var(--font-display)'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#1D1D1F'}} onMouseLeave={e=>{e.currentTarget.style.color='#86868B'}}>
                <Ic d={PATHS.back} c="currentColor" s={14}/> Retour
              </button>
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                {[
                  {v:String(valid.length),l:'Cartes',c:'#1D1D1F'},
                  {v:String(cards.reduce((s,c)=>s+c.qty,0)),l:'Exemplaires',c:'#1D1D1F'},
                  {v:totalVal.toFixed(0)+' EUR',l:'Valeur',c:'#2E9E6A'},
                  ...(warns>0?[{v:String(warns),l:'Alertes',c:'#D97706'}]:[]),
                ].map(s=>(
                  <div key={s.l} style={{flex:1,background:'#F5F5F7',border:`1px solid ${s.c==='#2E9E6A'?'rgba(46,158,106,.15)':s.c==='#D97706'?'rgba(217,119,6,.15)':'#E5E5EA'}`,borderRadius:'12px',padding:'12px 8px',textAlign:'center'}}>
                    <div style={{fontSize:'18px',fontWeight:700,color:s.c,fontFamily:'var(--font-display)'}}>{s.v}</div>
                    <div style={{fontSize:'9px',color:'#86868B',marginTop:'3px',textTransform:'uppercase',letterSpacing:'.08em',fontFamily:'var(--font-display)'}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {warns>0&&<div style={{display:'flex',alignItems:'center',gap:'6px',background:'rgba(217,119,6,.06)',border:'1px solid rgba(217,119,6,.15)',borderRadius:'10px',padding:'10px 12px',fontSize:'11px',color:'#D97706',marginBottom:'12px'}}>
                <Ic d={PATHS.alert} c="#D97706" s={14}/> {warns} carte(s) avec donnees incompletes — importees quand meme.
              </div>}
              <div style={{background:'#F5F5F7',borderRadius:'12px',overflow:'hidden',marginBottom:'14px',maxHeight:'260px',overflowY:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                  <thead><tr>{['Carte','Set','Qte','Prix','Langue','Etat',''].map(h=><th key={h} style={{textAlign:'left',padding:'6px 10px',color:'#86868B',fontSize:'9px',fontFamily:'var(--font-data)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #E5E5EA',whiteSpace:'nowrap',background:'#F5F5F7',position:'sticky',top:0}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {cards.slice(0,15).map(card=>(
                      <tr key={card.id} style={{borderBottom:'1px solid #E5E5EA',background:'#fff'}}>
                        <td style={{padding:'7px 10px',color:'#1D1D1F',fontWeight:500,maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{card.name}</td>
                        <td style={{padding:'7px 10px',color:'#86868B'}}>{card.set}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',fontWeight:600,color:'#1D1D1F'}}>x{card.qty}</td>
                        <td style={{padding:'7px 10px',textAlign:'right',color:card.price>0?'#2E9E6A':'#AEAEB2',fontWeight:600,fontFamily:'var(--font-data)'}}>{card.price>0?card.price.toFixed(2)+' EUR':'—'}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'#86868B'}}>{card.language}</td>
                        <td style={{padding:'7px 10px',textAlign:'center',color:'#86868B'}}>{card.condition}</td>
                        <td style={{padding:'7px 10px',textAlign:'center'}}>{card._warning&&<Ic d={PATHS.alert} c="#D97706" s={12}/>}</td>
                      </tr>
                    ))}
                    {cards.length>15&&<tr><td colSpan={7} style={{padding:'8px 10px',textAlign:'center',color:'#AEAEB2',fontSize:'11px'}}>+ {cards.length-15} cartes supplementaires</td></tr>}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} disabled={importing}
                style={{width:'100%',background:'#1D1D1F',border:'none',borderRadius:'12px',color:'#fff',padding:'13px',fontSize:'13px',fontWeight:700,cursor:importing?'wait':'pointer',fontFamily:'var(--font-display)',transition:'all .15s'}}
                onMouseEnter={e=>{if(!importing)e.currentTarget.style.background='#333'}} onMouseLeave={e=>{e.currentTarget.style.background='#1D1D1F'}}>
                {importing
                  ? <span style={{display:'flex',alignItems:'center',gap:'8px',justifyContent:'center'}}><div style={{width:'14px',height:'14px',border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/> Import... {prog}%</span>
                  : `Importer ${valid.length} cartes`}
              </button>
            </div>
          )}

          {/* ═══ SUCCESS ═══ */}
          {step==='success'&&(
            <div style={{textAlign:'center',padding:'28px 16px'}}>
              <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'rgba(46,158,106,.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><Ic d={PATHS.ok} c="#2E9E6A" s={28}/></div>
              <div style={{fontSize:'20px',fontWeight:700,color:'#1D1D1F',fontFamily:'var(--font-display)',marginBottom:'6px'}}>Import reussi</div>
              <div style={{color:'#86868B',fontSize:'13px',marginBottom:'20px'}}><span style={{color:'#1D1D1F',fontWeight:700}}>{valid.length} cartes</span> ajoutees a votre portefeuille</div>
              <div style={{display:'flex',gap:'10px',justifyContent:'center',background:'#F5F5F7',borderRadius:'14px',padding:'16px',marginBottom:'20px'}}>
                {[{v:String(cards.reduce((s,c)=>s+c.qty,0)),l:'Exemplaires',c:'#1D1D1F'},{v:totalVal.toFixed(0)+' EUR',l:'Valeur',c:'#2E9E6A'},{v:src?.label??'CSV',l:'Source',c:'#86868B'}].map(s=>(
                  <div key={s.l} style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:'18px',fontWeight:700,color:s.c,fontFamily:'var(--font-display)'}}>{s.v}</div>
                    <div style={{fontSize:'10px',color:'#86868B',marginTop:'2px'}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                <button onClick={onClose}
                  style={{background:'#1D1D1F',border:'none',borderRadius:'12px',color:'#fff',padding:'12px 24px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='#333'}} onMouseLeave={e=>{e.currentTarget.style.background='#1D1D1F'}}>
                  Voir mon portefeuille
                </button>
                <button onClick={()=>{setStep('source');setSelSrc(null);setHeaders([]);setRows([]);setCards([]);setPaste('');setFName('')}}
                  style={{background:'#F5F5F7',border:'1px solid #E5E5EA',borderRadius:'12px',color:'#48484A',padding:'12px 20px',fontSize:'13px',cursor:'pointer',fontFamily:'var(--font-display)',transition:'all .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='#EDEDF0'}} onMouseLeave={e=>{e.currentTarget.style.background='#F5F5F7'}}>
                  Nouvel import
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </>
  )
}
