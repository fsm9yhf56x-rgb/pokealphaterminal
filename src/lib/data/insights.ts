/** Source unique des Kodo Insights — partagée par /home/insights et Nori. */

export type Insight = {
  id: string
  tier: 'S' | 'A' | 'B'
  title: string
  body: string
  tags: string[]
  type: 'signal' | 'market' | 'arb' | 'whale' | 'report'
  time: string
  read: boolean
  saved: boolean
  metrics: { label: string; value: string }[]
}

export const INSIGHTS: Insight[] = [
  {
    id:'1', tier:'S', title:'Umbreon VMAX Alt Art — Signal fort détecté',
    body:"Le volume d'achat sur eBay JP a triplé en 72h. Le spread JP/EN est revenu à 18% — historiquement c'est le seuil avant rééquilibrage. PSA Pop de 2840 reste faible pour ce niveau de popularité.",
    tags:['Evolving Skies','Dark type','eBay JP','Volume x3'],
    type:'signal', time:'Il y a 2h', read:false, saved:true,
    metrics:[{label:'Confiance',value:'74%'},{label:'Potentiel',value:'+22%'},{label:'Horizon',value:'2-4 sem.'}],
  },
  {
    id:'2', tier:'A', title:'Neo Genesis en forte réévaluation — momentum vintage',
    body:"Lugia Neo Genesis PSA 8 a progressé de +15% cette semaine. Le marché vintage connaît un regain d'intérêt structurel. Les sets Neo sont les derniers sous-évalués de l'ère pré-EX.",
    tags:['Vintage','Neo Genesis','Lugia','PSA 8+'],
    type:'market', time:'Il y a 5h', read:false, saved:false,
    metrics:[{label:'Tendance',value:'+15%'},{label:'Sets concernés',value:'3'},{label:'Profil',value:'Vintage'}],
  },
  {
    id:'3', tier:'B', title:'Arbitrage JP/EN — Espeon VMAX à surveiller',
    body:"La version JP est actuellement 31% sous la valeur EN — spread record sur 12 mois. Les arbitrages se font généralement en 3-6 semaines. Point d'entrée intéressant avant la convergence.",
    tags:['Arbitrage','Evolving Skies','JP vs EN','Espeon'],
    type:'arb', time:'Il y a 8h', read:true, saved:false,
    metrics:[{label:'Spread',value:'31%'},{label:'Moy. hist.',value:'12%'},{label:'Timing',value:'3-6 sem.'}],
  },
  {
    id:'4', tier:'A', title:'Charizard Alt Art SV151 — PSA Pop très faible',
    body:"Seulement 312 exemplaires PSA gradés pour l'une des cartes les plus demandées du moment. Le ratio popularité/PSA Pop est parmi les plus favorables du marché actuel. Signal S maintenu.",
    tags:['SV151','Charizard','PSA Pop','Alt Art'],
    type:'signal', time:'Il y a 12h', read:true, saved:true,
    metrics:[{label:'PSA Pop',value:'312'},{label:'Prix actuel',value:'€ 920'},{label:'Cible',value:'€ 1 300'}],
  },
  {
    id:'5', tier:'B', title:'Évolution des indices marchés — semaine 12',
    body:"Cards Index +3.8%, Vintage +6.8%. Les indices Sealed reculent légèrement (-1.1%). La divergence entre cartes singles et scellés suggère un cycle de rotation vers les singles premium.",
    tags:['Indices','Marché global','Weekly','Analyse'],
    type:'report', time:'Il y a 1j', read:true, saved:false,
    metrics:[{label:'Cards Index',value:'+3.8%'},{label:'Vintage',value:'+6.8%'},{label:'Sealed',value:'-1.1%'}],
  },
  {
    id:'6', tier:'A', title:'Whale Move — RedDragonKai accumule les Alt Art Fire',
    body:"Le collectionneur LEGEND RedDragonKai a acheté 3 Alt Art Fire en 48h pour un total de €6,840. Historiquement ses accumulations précèdent de 2-3 semaines un move de marché.",
    tags:['Whale','RedDragonKai','Alt Art Fire','Accumulation'],
    type:'whale', time:'Il y a 1j', read:false, saved:false,
    metrics:[{label:'Volume',value:'€ 6 840'},{label:'Cartes',value:'3 alt arts'},{label:'Signal',value:'Tier A'}],
  },
]

export const TYPE_CONFIG: Record<string,{icon:string;label:string;color:string;bg:string}> = {
  signal: { icon:'⚡', label:'Signal Alpha', color:'#E03020', bg:'#FFF0EE' },
  market: { icon:'📊', label:'Marché',       color:'#2E9E6A', bg:'#F0FFF6' },
  arb:    { icon:'🔄', label:'Arbitrage',    color:'#003DAA', bg:'#F0F5FF' },
  whale:  { icon:'🐋', label:'Whale Move',   color:'#7E57C2', bg:'#F5EAFF' },
  report: { icon:'📈', label:'Rapport',      color:'#888',    bg:'#F5F5F5' },
}

export const TIER_STYLE: Record<string,{bg:string;color:string}> = {
  S: { bg:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#fff' },
  A: { bg:'linear-gradient(135deg,#C855D4,#9C27B0)', color:'#fff' },
  B: { bg:'linear-gradient(135deg,#2E9E6A,#1A7A4A)', color:'#fff' },
}
