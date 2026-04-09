'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

function genH(base:number,vol:number,trend:number,days:number):number[]{
  const start=Math.max(base*.35,base*(1-trend*(days/365)*.6))
  const p=[start]
  for(let i=1;i<=days;i++){const n=(Math.random()-.48)*vol*p[i-1];p.push(Math.max(p[i-1]+n+trend*p[i-1]/365,start*.6))}
  const ratio=base/p[p.length-1]
  return p.map(v=>Math.round(v*ratio))
}
type Period='1J'|'1S'|'1M'|'3M'|'1A'|'3A'|'5A'|'MAX'
const P_DAYS:Record<Period,number>={'1J':1,'1S':7,'1M':30,'3M':90,'1A':365,'3A':1095,'5A':1825,'MAX':3650}

interface Card{name:string;set:string;img:string;price:number;change:number;vol:number;rarity:string;type:string;gen:number;psa10:number;psa9:number;number:string;grade?:string}
const CARDS:Card[]=[
  {name:'Charizard ex Alt Art',set:'Obsidian Flames',price:920,change:21.3,vol:203,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'Raw'},
  {name:'Umbreon VMAX Alt Art',set:'Evolving Skies',price:880,change:24.1,vol:112,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'Raw'},
  {name:'Rayquaza Gold Star',set:'EX Deoxys',price:740,change:31.2,vol:48,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'/img/cards/rayquaza-gold-star.webp',grade:'Raw'},
  {name:'Gengar VMAX Alt Art',set:'Fusion Strike',price:340,change:18.4,vol:67,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'Raw'},
  {name:'Lugia Neo Genesis',set:'Neo Genesis',price:580,change:15.2,vol:31,rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111',img:'/img/cards/lugia-neo.webp',grade:'Raw'},
  {name:'Mew ex Alt Art',set:'Pokemon 151',price:142,change:12.8,vol:95,rarity:'SAR',type:'psychic',gen:1,psa10:280,psa9:180,number:'205/165',img:'/img/cards/mew-ex-alt.svg',grade:'Raw'},
  {name:'Blastoise Base Set',set:'Base Set',price:620,change:-4.2,vol:24,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'Raw'},
  {name:'Pikachu VMAX RR',set:'Vivid Voltage',price:110,change:-3.8,vol:89,rarity:'RR',type:'electric',gen:1,psa10:220,psa9:140,number:'188/185',img:'/img/cards/pikachu-vmax-rr.webp',grade:'Raw'},
  {name:'Mewtwo GX Rainbow',set:'Unified Minds',price:95,change:-2.9,vol:44,rarity:'HR',type:'psychic',gen:1,psa10:190,psa9:120,number:'222/236',img:'/img/cards/mewtwo-gx-rainbow.webp',grade:'Raw'},
  {name:'Espeon VMAX Alt Art',set:'Evolving Skies',price:420,change:8.5,vol:56,rarity:'SAR',type:'psychic',gen:2,psa10:780,psa9:520,number:'270/203',img:'/img/cards/espeon-vmax-alt.svg'},
  {name:'Dragonite V Alt Art',set:'Pokemon GO',price:290,change:14.8,vol:33,rarity:'SAR',type:'dragon',gen:1,psa10:540,psa9:360,number:'076/078',img:'/img/cards/dragonite-v-alt.webp',grade:'Raw'},
  {name:'Charizard Base Set',set:'Base Set',price:3400,change:5.8,vol:12,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'Raw'},
  {name:'Glaceon VMAX Alt Art',set:'Evolving Skies',price:260,change:6.2,vol:41,rarity:'SAR',type:'water',gen:4,psa10:490,psa9:330,number:'209/203',img:'/img/cards/glaceon-vmax-alt.webp',grade:'Raw'},
  {name:'Leafeon VMAX Alt Art',set:'Evolving Skies',price:310,change:7.1,vol:38,rarity:'SAR',type:'grass',gen:4,psa10:580,psa9:390,number:'205/203',img:'/img/cards/leafeon-vmax-alt.webp',grade:'Raw'},
  {name:'Pikachu Illustrator',set:'Promo',price:42000,change:2.1,vol:1,rarity:'Promo',type:'electric',gen:1,psa10:420000,psa9:120000,number:'---',img:'/img/cards/pikachu-vmax-rr.webp'},
  {name:'Moonbreon (Umbreon V Alt)',set:'Evolving Skies',price:340,change:19.5,vol:78,rarity:'SAR',type:'dark',gen:2,psa10:650,psa9:430,number:'188/203',img:'/img/cards/moonbreon-v-alt.webp'},
  {name:'Charizard ex Alt Art PSA 10',set:'Obsidian Flames',price:1680,change:18.2,vol:31,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'PSA 10'},
  {name:'Charizard ex Alt Art PSA 9',set:'Obsidian Flames',price:1100,change:14.5,vol:22,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'PSA 9'},
  {name:'Umbreon VMAX Alt PSA 10',set:'Evolving Skies',price:1600,change:22.4,vol:18,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'PSA 10'},
  {name:'Umbreon VMAX Alt PSA 9',set:'Evolving Skies',price:1050,change:12.3,vol:15,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'PSA 9'},
  {name:'Umbreon VMAX Alt CGC 9.5',set:'Evolving Skies',price:1200,change:16.8,vol:9,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'CGC 9.5'},
  {name:'Charizard Base Set PSA 10',set:'Base Set',price:42000,change:3.2,vol:2,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 10'},
  {name:'Charizard Base Set PSA 9',set:'Base Set',price:5200,change:4.8,vol:8,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 9'},
  {name:'Charizard Base Set PSA 8',set:'Base Set',price:2800,change:3.5,vol:14,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 8'},
  {name:'Charizard Base Set PSA 7',set:'Base Set',price:1400,change:2.1,vol:22,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 7'},
  {name:'Lugia Neo Genesis PSA 10',set:'Neo Genesis',price:8400,change:6.1,vol:3,rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111',img:'/img/cards/lugia-neo.webp',grade:'PSA 10'},
  {name:'Lugia Neo Genesis PSA 9',set:'Neo Genesis',price:1200,change:5.2,vol:7,rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111',img:'/img/cards/lugia-neo.webp',grade:'PSA 9'},
  {name:'Gengar VMAX Alt PSA 10',set:'Fusion Strike',price:620,change:16.1,vol:8,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'PSA 10'},
  {name:'Gengar VMAX Alt PSA 9',set:'Fusion Strike',price:420,change:9.8,vol:14,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'PSA 9'},
  {name:'Gengar VMAX Alt BGS 9.5',set:'Fusion Strike',price:480,change:14.2,vol:12,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'BGS 9.5'},
  {name:'Rayquaza Gold Star CGC 9.5',set:'EX Deoxys',price:2400,change:28.5,vol:5,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'/img/cards/rayquaza-gold-star.webp',grade:'CGC 9.5'},
  {name:'Rayquaza Gold Star PSA 10',set:'EX Deoxys',price:4200,change:25.1,vol:2,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'/img/cards/rayquaza-gold-star.webp',grade:'PSA 10'},
  {name:'Blastoise Base Set PSA 10',set:'Base Set',price:12000,change:4.2,vol:1,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'PSA 10'},
  {name:'Blastoise Base Set PSA 9',set:'Base Set',price:1400,change:5.1,vol:6,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'PSA 9'},
  {name:'Blastoise Base Set PCA 9',set:'Base Set',price:1800,change:7.5,vol:4,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'PCA 9'},
  {name:'Mew ex Alt Art PCA 10',set:'Pokemon 151',price:320,change:15.2,vol:7,rarity:'SAR',type:'psychic',gen:1,psa10:280,psa9:180,number:'205/165',img:'/img/cards/mew-ex-alt.svg',grade:'PCA 10'},
  {name:'Espeon VMAX Alt PSA 10',set:'Evolving Skies',price:780,change:11.4,vol:6,rarity:'SAR',type:'psychic',gen:2,psa10:780,psa9:520,number:'270/203',img:'/img/cards/espeon-vmax-alt.svg',grade:'PSA 10'},
  {name:'Pikachu VMAX RR CGC 10',set:'Vivid Voltage',price:420,change:8.9,vol:5,rarity:'RR',type:'electric',gen:1,psa10:220,psa9:140,number:'188/185',img:'/img/cards/pikachu-vmax-rr.webp',grade:'CGC 10'},
  {name:'Charizard ex Alt Art PSA 10',set:'Obsidian Flames',price:1680,change:18.2,vol:31,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'PSA 10'},
  {name:'Charizard ex Alt Art PSA 9',set:'Obsidian Flames',price:1100,change:14.5,vol:22,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'PSA 9'},
  {name:'Charizard ex Alt Art PSA 8',set:'Obsidian Flames',price:820,change:8.4,vol:35,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'PSA 8'},
  {name:'Charizard ex Alt Art CGC 9.5',set:'Obsidian Flames',price:1350,change:16.8,vol:11,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'CGC 9.5'},
  {name:'Charizard ex Alt Art BGS 9.5',set:'Obsidian Flames',price:1280,change:15.2,vol:8,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'BGS 9.5'},
  {name:'Charizard ex Alt Art PCA 10',set:'Obsidian Flames',price:1420,change:19.1,vol:4,rarity:'SAR',type:'fire',gen:1,psa10:1680,psa9:1100,number:'234/197',img:'/img/cards/charizard-ex-alt.svg',grade:'PCA 10'},
  {name:'Umbreon VMAX Alt PSA 10',set:'Evolving Skies',price:1600,change:22.4,vol:18,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'PSA 10'},
  {name:'Umbreon VMAX Alt PSA 9',set:'Evolving Skies',price:1050,change:12.3,vol:15,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'PSA 9'},
  {name:'Umbreon VMAX Alt CGC 9.5',set:'Evolving Skies',price:1200,change:16.8,vol:9,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'CGC 9.5'},
  {name:'Umbreon VMAX Alt BGS 9.5',set:'Evolving Skies',price:1150,change:18.1,vol:7,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'BGS 9.5'},
  {name:'Umbreon VMAX Alt PCA 10',set:'Evolving Skies',price:1320,change:20.5,vol:3,rarity:'SAR',type:'dark',gen:2,psa10:1600,psa9:1050,number:'215/203',img:'/img/cards/umbreon-vmax-alt.webp',grade:'PCA 10'},
  {name:'Charizard Base Set PSA 10',set:'Base Set',price:42000,change:3.2,vol:2,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 10'},
  {name:'Charizard Base Set PSA 9',set:'Base Set',price:5200,change:4.8,vol:8,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 9'},
  {name:'Charizard Base Set PSA 8',set:'Base Set',price:2800,change:3.5,vol:14,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PSA 8'},
  {name:'Charizard Base Set CGC 9.5',set:'Base Set',price:8200,change:5.1,vol:3,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'CGC 9.5'},
  {name:'Charizard Base Set PCA 9',set:'Base Set',price:4800,change:6.2,vol:5,rarity:'Holo',type:'fire',gen:1,psa10:42000,psa9:5200,number:'4/102',img:'/img/cards/charizard-base.webp',grade:'PCA 9'},
  {name:'Rayquaza Gold Star PSA 10',set:'EX Deoxys',price:4200,change:25.1,vol:2,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'/img/cards/rayquaza-gold-star.webp',grade:'PSA 10'},
  {name:'Rayquaza Gold Star PSA 9',set:'EX Deoxys',price:1800,change:22.3,vol:4,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'/img/cards/rayquaza-gold-star.webp',grade:'PSA 9'},
  {name:'Rayquaza Gold Star CGC 9.5',set:'EX Deoxys',price:2800,change:26.8,vol:3,rarity:'Gold Star',type:'dragon',gen:3,psa10:4200,psa9:1800,number:'107/107',img:'/img/cards/rayquaza-gold-star.webp',grade:'CGC 9.5'},
  {name:'Gengar VMAX Alt PSA 10',set:'Fusion Strike',price:620,change:16.1,vol:8,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'PSA 10'},
  {name:'Gengar VMAX Alt PSA 9',set:'Fusion Strike',price:420,change:9.8,vol:14,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'PSA 9'},
  {name:'Gengar VMAX Alt BGS 9.5',set:'Fusion Strike',price:480,change:14.2,vol:12,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'BGS 9.5'},
  {name:'Gengar VMAX Alt PCA 10',set:'Fusion Strike',price:550,change:13.5,vol:3,rarity:'SAR',type:'psychic',gen:1,psa10:620,psa9:420,number:'271/264',img:'/img/cards/gengar-vmax-alt.webp',grade:'PCA 10'},
  {name:'Lugia Neo Genesis PSA 10',set:'Neo Genesis',price:8400,change:6.1,vol:3,rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111',img:'/img/cards/lugia-neo.webp',grade:'PSA 10'},
  {name:'Lugia Neo Genesis PSA 9',set:'Neo Genesis',price:1200,change:5.2,vol:7,rarity:'Holo',type:'psychic',gen:2,psa10:8400,psa9:1200,number:'9/111',img:'/img/cards/lugia-neo.webp',grade:'PSA 9'},
  {name:'Blastoise Base Set PSA 10',set:'Base Set',price:12000,change:4.2,vol:1,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'PSA 10'},
  {name:'Blastoise Base Set PSA 9',set:'Base Set',price:1400,change:5.1,vol:6,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'PSA 9'},
  {name:'Blastoise Base Set PCA 9',set:'Base Set',price:1800,change:7.5,vol:4,rarity:'Holo',type:'water',gen:1,psa10:12000,psa9:1400,number:'2/102',img:'/img/cards/blastoise-base.webp',grade:'PCA 9'},
  {name:'Mew ex Alt Art PSA 10',set:'Pokemon 151',price:280,change:14.5,vol:12,rarity:'SAR',type:'psychic',gen:1,psa10:280,psa9:180,number:'205/165',img:'/img/cards/mew-ex-alt.svg',grade:'PSA 10'},
  {name:'Mew ex Alt Art PSA 9',set:'Pokemon 151',price:180,change:10.2,vol:18,rarity:'SAR',type:'psychic',gen:1,psa10:280,psa9:180,number:'205/165',img:'/img/cards/mew-ex-alt.svg',grade:'PSA 9'},
  {name:'Mew ex Alt Art PCA 10',set:'Pokemon 151',price:320,change:15.2,vol:7,rarity:'SAR',type:'psychic',gen:1,psa10:280,psa9:180,number:'205/165',img:'/img/cards/mew-ex-alt.svg',grade:'PCA 10'},
  {name:'Moonbreon (Umbreon V Alt) PSA 10',set:'Evolving Skies',price:650,change:21.2,vol:8,rarity:'SAR',type:'dark',gen:2,psa10:650,psa9:430,number:'188/203',img:'/img/cards/moonbreon-v-alt.webp',grade:'PSA 10'},
  {name:'Moonbreon (Umbreon V Alt) PSA 9',set:'Evolving Skies',price:430,change:15.8,vol:14,rarity:'SAR',type:'dark',gen:2,psa10:650,psa9:430,number:'188/203',img:'/img/cards/moonbreon-v-alt.webp',grade:'PSA 9'},
  {name:'Espeon VMAX Alt PSA 10',set:'Evolving Skies',price:780,change:11.4,vol:6,rarity:'SAR',type:'psychic',gen:2,psa10:780,psa9:520,number:'270/203',img:'/img/cards/espeon-vmax-alt.svg',grade:'PSA 10'},
  {name:'Glaceon VMAX Alt PSA 10',set:'Evolving Skies',price:490,change:8.5,vol:5,rarity:'SAR',type:'water',gen:4,psa10:490,psa9:330,number:'209/203',img:'/img/cards/glaceon-vmax-alt.webp',grade:'PSA 10'},
  {name:'Leafeon VMAX Alt PSA 10',set:'Evolving Skies',price:580,change:9.2,vol:4,rarity:'SAR',type:'grass',gen:4,psa10:580,psa9:390,number:'205/203',img:'/img/cards/leafeon-vmax-alt.webp',grade:'PSA 10'},
  {name:'Dragonite V Alt Art PSA 10',set:'Pokemon GO',price:540,change:16.2,vol:6,rarity:'SAR',type:'dragon',gen:1,psa10:540,psa9:360,number:'076/078',img:'/img/cards/dragonite-v-alt.webp',grade:'PSA 10'},
  {name:'Pikachu VMAX RR PSA 10',set:'Vivid Voltage',price:220,change:5.5,vol:15,rarity:'RR',type:'electric',gen:1,psa10:220,psa9:140,number:'188/185',img:'/img/cards/pikachu-vmax-rr.webp',grade:'PSA 10'},
  {name:'Pikachu VMAX RR CGC 10',set:'Vivid Voltage',price:420,change:8.9,vol:5,rarity:'RR',type:'electric',gen:1,psa10:220,psa9:140,number:'188/185',img:'/img/cards/pikachu-vmax-rr.webp',grade:'CGC 10'},
]
const SETS=[...new Set(CARDS.map(c=>c.set))].sort()
const RARITIES=[...new Set(CARDS.map(c=>c.rarity))].sort()
const HISTORIES:Record<string,number[]>={}
CARDS.forEach(c=>{HISTORIES[c.name]=genH(c.price,.018,.15,3650)})

// Grade badge colors — same as Portfolio
const GRADE_STYLES: Record<string,{bg:string;color:string;border:string}> = {
  'PSA 10': {bg:'linear-gradient(135deg,#FEF3C7,#FDE68A)',color:'#92400E',border:'#F59E0B'},
  'PSA 9':  {bg:'linear-gradient(135deg,#F5F5F7,#E8E8ED)',color:'#555',border:'#C7C7CC'},
  'PSA 8':  {bg:'#F5F5F7',color:'#666',border:'#D4D4D4'},
  'PSA 7':  {bg:'#F8F8FA',color:'#777',border:'#DCDCDC'},
  'PSA 6':  {bg:'#F8F8FA',color:'#888',border:'#E0E0E0'},
  'PSA 5':  {bg:'#FAFAFA',color:'#999',border:'#E5E5E5'},
  'PSA 4':  {bg:'#FAFAFA',color:'#999',border:'#E8E8E8'},
  'PSA 3':  {bg:'#FAFAFA',color:'#AAA',border:'#EBEBEB'},
  'PSA 2':  {bg:'#FAFAFA',color:'#AAA',border:'#EBEBEB'},
  'PSA 1':  {bg:'#FAFAFA',color:'#BBB',border:'#EBEBEB'},
  'PSA A':  {bg:'#FAFAFA',color:'#BBB',border:'#EBEBEB'},
  'CGC 10': {bg:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',color:'#1E40AF',border:'#60A5FA'},
  'CGC 9.5':{bg:'#EFF6FF',color:'#2563EB',border:'#93C5FD'},
  'CGC 9':  {bg:'#F0F5FF',color:'#3B82F6',border:'#BAD6FB'},
  'CGC 8.5':{bg:'#F5F8FF',color:'#5B9BF0',border:'#C8DDFB'},
  'CGC 8':  {bg:'#F5F8FF',color:'#6BA3EE',border:'#D0E2FB'},
  'CGC 7':  {bg:'#F8FAFF',color:'#7BABE8',border:'#D8E8FC'},
  'CGC 6':  {bg:'#F8FAFF',color:'#8BB3E2',border:'#E0EDFC'},
  'CGC 5':  {bg:'#FAFBFF',color:'#9BBBE0',border:'#E5F0FC'},
  'BGS 10': {bg:'linear-gradient(135deg,#FEF2F2,#FECACA)',color:'#991B1B',border:'#F87171'},
  'BGS 9.5':{bg:'#FEF2F2',color:'#B91C1C',border:'#FCA5A5'},
  'BGS 9':  {bg:'#FFF5F5',color:'#DC2626',border:'#FECACA'},
  'BGS 8.5':{bg:'#FFF8F8',color:'#E04545',border:'#FED4D4'},
  'BGS 8':  {bg:'#FFF8F8',color:'#E06060',border:'#FEDDDD'},
  'BGS 7':  {bg:'#FFFAFA',color:'#E07070',border:'#FEE5E5'},
  'BGS 6':  {bg:'#FFFAFA',color:'#E08080',border:'#FEEBEB'},
  'PCA 10': {bg:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',color:'#166534',border:'#4ADE80'},
  'PCA 9.5':{bg:'#F0FDF4',color:'#15803D',border:'#86EFAC'},
  'PCA 9':  {bg:'#F0FFF4',color:'#22C55E',border:'#BBF7D0'},
  'PCA 8.5':{bg:'#F5FFF8',color:'#34D070',border:'#C5F8D8'},
  'PCA 8':  {bg:'#F5FFF8',color:'#45D580',border:'#D0FAE0'},
  'PCA 7':  {bg:'#F8FFFA',color:'#55DA90',border:'#DAFCE8'},
  'PCA 6':  {bg:'#F8FFFA',color:'#65DFA0',border:'#E0FCEC'},
  'Raw':    {bg:'transparent',color:'#AAA',border:'#E5E5EA'},
}

function GradeBadge({grade,size='md'}:{grade:string;size?:'sm'|'md'|'lg'}){
  const st=GRADE_STYLES[grade]||GRADE_STYLES['Raw']
  const isRaw=grade==='Raw'||!grade
  const sz=size==='lg'?{fs:11,px:10,py:3}:size==='sm'?{fs:8,px:5,py:1}:{fs:9,px:7,py:2}
  if(isRaw)return <span style={{fontSize:sz.fs,color:'#BBB',fontFamily:'var(--font-display)'}}>Raw</span>
  return(
    <span style={{
      fontSize:sz.fs,fontWeight:700,color:st.color,background:st.bg,
      border:'1px solid '+st.border,padding:sz.py+'px '+sz.px+'px',
      borderRadius:4,fontFamily:'var(--font-data)',letterSpacing:'.02em',
      whiteSpace:'nowrap',lineHeight:1,display:'inline-flex',alignItems:'center',gap:3,
    }}>
      {grade}
    </span>
  )
}

function getBaseName(name: string): string {
  return name.replace(/ (PSA|CGC|BGS|PCA) [0-9.]+$/,'')
}
function getSiblings(cards: Card[], name: string): Card[] {
  const base = getBaseName(name)
  return cards.filter(c => getBaseName(c.name) === base).sort((a,b) => {
    // Raw first, then by grade desc
    if (!a.grade || a.grade === 'Raw') return -1
    if (!b.grade || b.grade === 'Raw') return 1
    return b.price - a.price
  })
}

const VINTAGE_SETS=['Base Set','EX Deoxys','Neo Genesis','Promo']
const TC:Record<string,string>={fire:'#FF6B35',water:'#42A5F5',psychic:'#C855D4',dark:'#7E57C2',electric:'#D4A800',grass:'#3DA85A',dragon:'#6F5CE6'}

function getSlice(name:string,period:Period):number[]{
  const h=HISTORIES[name];if(!h)return[]
  if(period==='1J')return Array.from({length:48},()=>Math.round(h[h.length-1]*(1+(Math.random()-.48)*.005)))
  return h.slice(-Math.min(P_DAYS[period]+1,h.length))
}
function getVolume(data:number[]):number[]{
  return data.map((_,i)=>{
    if(i===0)return Math.round(Math.random()*50+10)
    const change=Math.abs(data[i]-data[i-1])/data[i-1]
    return Math.round((Math.random()*40+10)*(1+change*20))
  })
}
function calcMA(data:number[],window:number):( number|null)[]{
  return data.map((_,i)=>{
    if(i<window-1)return null
    let sum=0;for(let j=i-window+1;j<=i;j++)sum+=data[j]
    return Math.round(sum/window)
  })
}

function Spark({data,w=56,h=20}:{data:number[];w?:number;h?:number}){
  if(data.length<2)return null
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1
  const up=data[data.length-1]>=data[0]
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-2)-1}`).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}><polyline points={pts} fill="none" stroke={up?'#2E9E6A':'#E03020'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function Chart({ data, color, period, height=360, volume, ma7, ma30 }: { data:number[]; color:string; period:Period; height?:number; volume?:number[]; ma7?:(number|null)[]; ma30?:(number|null)[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{x:number;y:number;val:number;idx:number}|null>(null)
  const W = 800, H = height, ML = 58, MR = 14, MT = 20, MB = 32
  const cw = W - ML - MR, ch = H - MT - MB
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
  const first = data[0], last = data[data.length - 1]
  const isUp = last >= first

  // Smart Y ticks
  const rawStep = range / 6
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const nice = [1,2,2.5,5,10].find(n => n * mag >= rawStep) || 10
  const step = nice * mag
  const yMin = Math.floor(mn / step) * step
  const yTicks: number[] = []
  for (let v = yMin; v <= mx + step * .5; v += step) if (v >= mn - step * .5) yTicks.push(Math.round(v * 100) / 100)

  // X ticks
  const xCount = period === '1J' ? 8 : period === '1S' ? 7 : period === '1M' ? 6 : 6
  const xTicks: {idx:number;label:string}[] = []
  for (let i = 0; i < xCount; i++) {
    const idx = Math.round(i / (xCount - 1) * (data.length - 1))
    const d = new Date(); d.setDate(d.getDate() - (data.length - 1 - idx))
    let l = ''
    if (period === '1J') l = d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})
    else if (['3A','5A','MAX'].includes(period)) l = d.toLocaleDateString('fr-FR', {month:'short',year:'numeric'})
    else if (period === '1A') l = d.toLocaleDateString('fr-FR', {month:'short',year:'2-digit'})
    else l = d.toLocaleDateString('fr-FR', {day:'numeric',month:'short'})
    xTicks.push({idx, label: l})
  }

  const px = (i: number) => ML + (i / (data.length - 1)) * cw
  const py = (v: number) => MT + (1 - (v - mn) / range) * ch
  const pts = data.map((v, i) => ({x: px(i), y: py(v), v}))

  // Smooth bezier
  const pathD = pts.length > 2 ? pts.reduce((a, p, i) => {
    if (i === 0) return 'M ' + p.x + ' ' + p.y
    const pr = pts[i-1], cx = (pr.x + p.x) / 2
    return a + ' C ' + cx + ' ' + pr.y + ' ' + cx + ' ' + p.y + ' ' + p.x + ' ' + p.y
  }, '') : pts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ')
  const areaD = pathD + ' L ' + pts[pts.length-1].x + ' ' + (MT + ch) + ' L ' + pts[0].x + ' ' + (MT + ch) + ' Z'

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const rx = (e.clientX - r.left) / r.width
    const dx = (rx * W - ML) / cw
    const idx = Math.round(dx * (data.length - 1))
    if (idx >= 0 && idx < pts.length) setHover({x: pts[idx].x, y: pts[idx].y, val: pts[idx].v, idx})
  }, [data, pts, W, ML, cw])

  const hoverLabel = (idx: number) => {
    const d = new Date(); d.setDate(d.getDate() - (data.length - 1 - idx))
    if (period === '1J') return d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})
    return d.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric', month:'long', year:'numeric'})
  }

  const fmtY = (v: number) => v >= 10000 ? (v/1000).toFixed(0) + 'k' : v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toLocaleString('fr-FR')
  const fmtFull = (v: number) => v.toLocaleString('fr-FR')

  const volH = ch * .14

  return (
    <svg ref={ref} viewBox={'0 0 ' + W + ' ' + H} style={{width:'100%', height, display:'block', cursor:'crosshair', userSelect:'none'}} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="cge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={.08}/>
          <stop offset="40%" stopColor={color} stopOpacity={.04}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
        <linearGradient id="vupe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E9E6A" stopOpacity={.2}/>
          <stop offset="100%" stopColor="#2E9E6A" stopOpacity={.06}/>
        </linearGradient>
        <linearGradient id="vdne" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E03020" stopOpacity={.2}/>
          <stop offset="100%" stopColor="#E03020" stopOpacity={.06}/>
        </linearGradient>
      </defs>

      {/* Background subtle grid */}
      {yTicks.map(v => {
        const y = py(v)
        if (y < MT - 4 || y > MT + ch + 4) return null
        return <g key={v}>
          <line x1={ML} x2={W - MR} y1={y} y2={y} stroke="rgba(0,0,0,.04)" strokeWidth={.5}/>
          <text x={ML - 10} y={y + 3.5} textAnchor="end" fill="#BBB" fontSize={10} fontFamily="var(--font-data)" fontWeight={500}>{fmtY(v)}</text>
        </g>
      })}

      {/* X labels */}
      {xTicks.map(t => (
        <g key={t.idx}>
          <line x1={px(t.idx)} x2={px(t.idx)} y1={MT} y2={MT + ch} stroke="rgba(0,0,0,.02)" strokeWidth={.5}/>
          <text x={px(t.idx)} y={H - 8} textAnchor="middle" fill="#BBB" fontSize={10} fontFamily="var(--font-display)" fontWeight={400}>{t.label}</text>
        </g>
      ))}

      {/* Opening price baseline */}
      <line x1={ML} x2={W - MR} y1={py(first)} y2={py(first)} stroke="rgba(0,0,0,.06)" strokeWidth={.5} strokeDasharray="6,4"/>
      <text x={W - MR + 4} y={py(first) + 3} fill="#CCC" fontSize={8} fontFamily="var(--font-data)">ouv.</text>

      {/* Volume bars */}
      {volume && volume.length === data.length && (() => {
        const maxV = Math.max(...volume)
        return <g>{volume.map((v, i) => {
          const bx = px(i)
          const bh = (v / maxV) * volH
          const bw = Math.max(cw / data.length * .65, 1.2)
          const up = data[i] >= (i > 0 ? data[i-1] : data[i])
          return <rect key={'v'+i} x={bx - bw/2} y={MT + ch - bh} width={bw} height={bh} fill={up ? 'url(#vupe)' : 'url(#vdne)'} rx={.5}/>
        })}</g>
      })()}

      {/* Area + Main curve */}
      <path d={areaD} fill="url(#cge)"/>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>

      {/* MA7 */}
      {ma7 && (() => {
        const p = (ma7 as (number|null)[]).reduce((a: string, v, i) => { if (v === null) return a; return a + (a ? 'L' : 'M') + ' ' + px(i) + ' ' + py(v) }, '')
        return p ? <path d={p} fill="none" stroke="#EF9F27" strokeWidth={1} strokeDasharray="4,3" opacity={.5}/> : null
      })()}

      {/* MA30 */}
      {ma30 && (() => {
        const p = (ma30 as (number|null)[]).reduce((a: string, v, i) => { if (v === null) return a; return a + (a ? 'L' : 'M') + ' ' + px(i) + ' ' + py(v) }, '')
        return p ? <path d={p} fill="none" stroke="#7E57C2" strokeWidth={1} strokeDasharray="6,4" opacity={.4}/> : null
      })()}

      {/* End dot with glow */}
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={6} fill={color} fillOpacity={.12}/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3.5} fill={color} stroke="#fff" strokeWidth={2}/>

      {/* Start dot */}
      <circle cx={pts[0].x} cy={pts[0].y} r={2} fill="#CCC" stroke="#fff" strokeWidth={1.5}/>

      {/* Current price line extending to right edge */}
      <line x1={pts[pts.length-1].x} x2={W - MR} y1={pts[pts.length-1].y} y2={pts[pts.length-1].y} stroke={color} strokeWidth={.5} strokeDasharray="3,3" opacity={.4}/>
      <rect x={W - MR - 1} y={pts[pts.length-1].y - 9} width={MR + 1} height={18} fill={color} rx={2}/>
      <text x={W - MR/2} y={pts[pts.length-1].y + 3} textAnchor="middle" fill="#fff" fontSize={7.5} fontWeight={600} fontFamily="var(--font-data)">{fmtY(last)}</text>

      {/* Legend */}
      {(ma7 || ma30 || volume) && <g>
        <text x={ML + 4} y={MT + 12} fill="#CCC" fontSize={9} fontFamily="var(--font-display)">
          {'—'} Prix
        </text>
        {ma7 && <><circle cx={ML + 50} cy={MT + 9} r={3} fill="#EF9F27"/><text x={ML + 58} y={MT + 12} fill="#CCC" fontSize={9} fontFamily="var(--font-display)">MA7</text></>}
        {ma30 && <><circle cx={ML + 90} cy={MT + 9} r={3} fill="#7E57C2"/><text x={ML + 98} y={MT + 12} fill="#CCC" fontSize={9} fontFamily="var(--font-display)">MA30</text></>}
      </g>}

      {/* Hover */}
      {hover && <>
        {/* Crosshair */}
        <line x1={hover.x} x2={hover.x} y1={MT} y2={MT + ch} stroke="rgba(0,0,0,.12)" strokeWidth={.5}/>
        <line x1={ML} x2={W - MR} y1={hover.y} y2={hover.y} stroke="rgba(0,0,0,.06)" strokeWidth={.5} strokeDasharray="2,2"/>

        {/* Point */}
        <circle cx={hover.x} cy={hover.y} r={6} fill={color} fillOpacity={.12}/>
        <circle cx={hover.x} cy={hover.y} r={4} fill={color} stroke="#fff" strokeWidth={2}/>

        {/* Y-axis price tag */}
        <rect x={0} y={hover.y - 11} width={ML - 6} height={22} rx={4} fill={color}/>
        <text x={(ML - 6) / 2} y={hover.y + 3.5} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={600} fontFamily="var(--font-data)">{fmtY(hover.val)}</text>

        {/* Top tooltip */}
        {(() => {
          const pctChange = ((hover.val - first) / first * 100)
          const tw = 140, th = 52
          const tx = Math.min(Math.max(hover.x - tw/2, ML), W - MR - tw)
          return <g>
            <rect x={tx} y={2} width={tw} height={th} rx={8} fill="#111" fillOpacity={.95}/>
            <text x={tx + tw/2} y={22} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={700} fontFamily="var(--font-data)">{fmtFull(hover.val)} {'€'}</text>
            <text x={tx + tw/2} y={40} textAnchor="middle" fill={pctChange >= 0 ? '#4ADE80' : '#F87171'} fontSize={11} fontWeight={600} fontFamily="var(--font-data)">
              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%{volume && volume[hover.idx] ? ' · ' + volume[hover.idx] + ' tx' : ''}
            </text>
          </g>
        })()}

        {/* Bottom date */}
        {(() => {
          const dw = 150
          const dx = Math.min(Math.max(hover.x - dw/2, ML), W - MR - dw)
          return <g>
            <rect x={dx} y={MT + ch + 4} width={dw} height={20} rx={4} fill="rgba(0,0,0,.06)"/>
            <text x={dx + dw/2} y={MT + ch + 17} textAnchor="middle" fill="#888" fontSize={9} fontFamily="var(--font-display)">{hoverLabel(hover.idx)}</text>
          </g>
        })()}
      </>}
    </svg>
  )
}



// ── COUNTUP ──
function CountUp({ target, suffix='', duration=1000 }: { target:number; suffix?:string; duration?:number }) {
  const [val, setVal] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const t0 = performance.now()
    ;(function f(t: number) {
      const p = Math.min((t - t0) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) ref.current = requestAnimationFrame(f)
    })(t0)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])
  return <>{val.toLocaleString('fr-FR')}{suffix}</>
}
function mockSales(c:Card){return[
  {src:'eBay',grade:'PSA 10',p:c.psa10,ago:'2h',lang:'EN'},{src:'CM',grade:'Raw NM',p:c.price,ago:'5h',lang:'FR'},
  {src:'eBay',grade:'PSA 9',p:c.psa9,ago:'1j',lang:'EN'},{src:'CM',grade:'Raw LP',p:Math.round(c.price*.85),ago:'2j',lang:'JP'},
  {src:'eBay',grade:'PSA 10',p:Math.round(c.psa10*.97),ago:'3j',lang:'EN'},
]}

export function CardExplorer(){
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [sel,setSel]=useState(() => {
    if (initialQ) {
      const match = CARDS.find(c => c.name.toLowerCase().includes(initialQ.toLowerCase()))
      if (match) return match.name
    }
    return CARDS[0].name
  })
  const [period,setPeriod]=useState<Period>('1M')
  const [search,setSearch]=useState(initialQ)
  const [sort,setSort]=useState<'vol'|'price'|'change'|'psa'|'name'>('vol')
  const [filterSet,setFilterSet]=useState('all')
  const [filterRarity,setFilterRarity]=useState('all')
  const [filterEra,setFilterEra]=useState('all')
  const [filterPriceMin,setFilterPriceMin]=useState('')
  const [filterPriceMax,setFilterPriceMax]=useState('')
  const [filterTrend,setFilterTrend]=useState('all')
  const [filterGrade,setFilterGrade]=useState('all')
  const [filterCondition,setFilterCondition]=useState<string>('all')
  const [showFilters,setShowFilters]=useState(false)
  const listRef=useRef<HTMLDivElement>(null)

  const card=CARDS.find(c=>c.name===sel)!
  const siblings=useMemo(()=>getSiblings(CARDS,sel),[sel])
  const [selGrade,setSelGrade]=useState<string>(card?.grade||'Raw')
  const activeCard=siblings.find(s=>s.grade===selGrade)||card
  const data=useMemo(()=>getSlice(activeCard.name,period),[activeCard.name,period])
  const volume=useMemo(()=>getVolume(data),[data])
  // Use activeCard for price display
  const ma7=useMemo(()=>calcMA(data,7),[data])
  const ma30=useMemo(()=>calcMA(data,30),[data])
  const [showMA,setShowMA]=useState(true)
  const [showVol,setShowVol]=useState(true)
  const cur=data[data.length-1]||activeCard.price,start=data[0]||activeCard.price
  const pct=((cur-start)/start*100),isUp=pct>=0
  const spark30=useMemo(()=>(HISTORIES[sel]||[]).slice(-30),[sel])

  const af=[filterSet,filterRarity,filterEra,filterPriceMin,filterPriceMax,filterTrend,filterGrade,filterCondition].filter(f=>f&&f!=='all').length
  const resetF=()=>{setFilterSet('all');setFilterRarity('all');setFilterEra('all');setFilterPriceMin('');setFilterPriceMax('');setFilterTrend('all');setFilterGrade('all');setFilterCondition('all')}

  const filtered=useMemo(()=>{
    let l=[...CARDS]
    if(search){const q=search.toLowerCase();l=l.filter(c=>c.name.toLowerCase().includes(q)||c.set.toLowerCase().includes(q)||c.rarity.toLowerCase().includes(q)||c.number.includes(q))}
    if(filterSet!=='all')l=l.filter(c=>c.set===filterSet)
    if(filterRarity!=='all')l=l.filter(c=>c.rarity===filterRarity)
    if(filterEra==='vintage')l=l.filter(c=>VINTAGE_SETS.includes(c.set))
    if(filterEra==='modern')l=l.filter(c=>!VINTAGE_SETS.includes(c.set))
    if(filterPriceMin)l=l.filter(c=>c.price>=+filterPriceMin)
    if(filterPriceMax)l=l.filter(c=>c.price<=+filterPriceMax)
    if(filterTrend==='up')l=l.filter(c=>c.change>0)
    if(filterTrend==='down')l=l.filter(c=>c.change<0)
    if(filterTrend==='hot')l=l.filter(c=>c.change>15)
    if(filterTrend==='stable')l=l.filter(c=>Math.abs(c.change)<5)
    if(filterCondition!=='all'){
      if(filterCondition==='raw')l=l.filter(c=>!c.grade||c.grade==='Raw')
      if(filterCondition==='graded')l=l.filter(c=>c.grade&&c.grade!=='Raw')
      if(filterCondition==='psa')l=l.filter(c=>c.grade&&c.grade.startsWith('PSA'))
      if(filterCondition==='cgc')l=l.filter(c=>c.grade&&c.grade.startsWith('CGC'))
      if(filterCondition==='bgs')l=l.filter(c=>c.grade&&c.grade.startsWith('BGS'))
      if(filterCondition==='pca')l=l.filter(c=>c.grade&&c.grade.startsWith('PCA'))
    }
    if(filterGrade==='psa10+')l=l.filter(c=>c.psa10>=1000)
    if(filterGrade==='premium')l=l.filter(c=>(c.psa10/c.price)>=2)
    l.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price'?b.price-a.price:sort==='change'?b.change-a.change:sort==='psa'?b.psa10-a.psa10:b.vol-a.vol)
    return l
  },[search,filterSet,filterRarity,filterEra,filterPriceMin,filterPriceMax,filterTrend,filterGrade,filterCondition,sort])

  const ci=filtered.findIndex(c=>c.name===sel)
  const nav=(d:-1|1)=>{const n=ci+d;if(n>=0&&n<filtered.length){setSel(filtered[n].name);setPeriod('1M')}}
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='ArrowUp'){e.preventDefault();nav(-1)}if(e.key==='ArrowDown'){e.preventDefault();nav(1)}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[ci,filtered])
  useEffect(()=>{setSelGrade(card?.grade||'Raw')},[sel])
  useEffect(()=>{const el=document.getElementById('c-'+sel);if(el&&listRef.current)el.scrollIntoView({block:'nearest',behavior:'smooth'})},[sel])

  return(
    <><style>{`
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .ex-list{flex:1;overflow-y:auto}
      .ex-r{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;border-left:3px solid transparent;transition:all .12s}
      .ex-r:hover{background:#FAFAFA}
      .ex-r.on{background:#FFF5F4;border-left-color:#E03020}
      .per{padding:4px 12px;border-radius:6px;border:1px solid #EBEBEB;background:#fff;color:#888;font-size:10px;font-weight:500;cursor:pointer;font-family:var(--font-display);transition:all .1s}
      .per:hover{border-color:#C7C7CC;color:#111}.per.on{background:#111;color:#fff;border-color:#111}
      .nb{width:28px;height:28px;border-radius:7px;border:1px solid #EBEBEB;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#888;transition:all .12s}
      .nb:hover:not(:disabled){border-color:#111;color:#111}.nb:disabled{opacity:.15;cursor:default}
      .sb{background:#F8F8FA;border-radius:8px;padding:10px 12px}
      .sv{font-size:16px;font-weight:700;font-family:var(--font-data);letter-spacing:-.5px}
      .sl{font-size:9px;color:#AAA;font-family:var(--font-display);margin-top:2px}
      .sr{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F5F5F5;font-size:12px}.sr:last-child{border-bottom:none}
      .fc{padding:3px 8px;border-radius:5px;border:1px solid #EBEBEB;background:#fff;font-size:10px;color:#888;cursor:pointer;font-family:var(--font-display);transition:all .1s;white-space:nowrap}
      .fc:hover{border-color:#C7C7CC;color:#111}.fc.on{background:#111;color:#fff;border-color:#111}
      .fp{width:56px;padding:4px 6px;border-radius:5px;border:1px solid #EBEBEB;font-size:10px;font-family:var(--font-data);outline:none;text-align:center}.fp:focus{border-color:#E03020}
      .grade-btn:hover{border-color:#C7C7CC !important;transform:translateY(-1px) !important;box-shadow:0 2px 8px rgba(0,0,0,.04) !important}.fp::placeholder{color:#CCC}
      .srt{padding:3px 8px;border-radius:5px;border:none;background:transparent;font-size:10px;color:#AAA;cursor:pointer;font-family:var(--font-display)}.srt:hover{color:#111}.srt.on{background:#111;color:#fff}
      .ft{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:7px;border:1px solid #EBEBEB;cursor:pointer;font-size:11px;font-family:var(--font-display);color:#888;background:#fff;transition:all .12s}
      .ft:hover{border-color:#C7C7CC;color:#111}.ft.on{background:#FFF5F4;border-color:#FFD8D0;color:#E03020}
      .badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:50%;background:#E03020;color:#fff;font-size:8px;font-weight:700}
      .fdrop{position:absolute;top:100%;left:0;right:0;margin-top:4px;background:#fff;border:1px solid #EBEBEB;border-radius:10px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.08);z-index:50;animation:fadeIn .15s ease-out}
      .fg{margin-bottom:8px}.fg:last-child{margin-bottom:0}
      .fl{font-size:9px;color:#AAA;font-family:var(--font-display);font-weight:500;letter-spacing:.05em;text-transform:uppercase;margin-bottom:3px}
      .fr{display:flex;gap:3px;flex-wrap:wrap}
    `}</style>

    <div style={{animation:'fadeIn .25s ease-out',width:'100%'}}>
        <div style={{marginBottom:16}}>
          <p style={{fontSize:10,color:'#AAA',textTransform:'uppercase',letterSpacing:'.1em',margin:'0 0 4px',fontFamily:'var(--font-display)'}}>Market</p>
          <h1 style={{fontSize:26,fontWeight:600,color:'#111',fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:0}}>Explorer</h1>
        </div>
      <div style={{display:'flex',height:'calc(100vh - 180px)'}}>

      {/* ── LEFT ── */}
      <div style={{width:340,borderRight:'1px solid #EBEBEB',display:'flex',flexDirection:'column',flexShrink:0,background:'#fff'}}>

        {/* Search + Filters */}
        <div style={{padding:'12px 14px 0',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'#F5F5F7',border:'1px solid #EBEBEB',borderRadius:8,padding:'7px 10px',marginBottom:8}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une carte..."
              style={{border:'none',background:'transparent',outline:'none',fontSize:12,fontFamily:'var(--font-display)',color:'#111',width:'100%'}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#AAA',fontSize:14,lineHeight:1}}>{'\u00d7'}</button>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <button className={'ft'+(showFilters||af>0?' on':'')} onClick={()=>setShowFilters(f=>!f)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              Filtres{af>0&&<span className="badge">{af}</span>}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d={showFilters?"M18 15l-6-6-6 6":"M6 9l6 6 6-6"}/></svg>
            </button>
            <div style={{flex:1}}/>
            <div style={{display:'flex',gap:2}}>
              {(['vol','price','change','psa','name'] as const).map(s=>(
                <button key={s} className={'srt'+(sort===s?' on':'')} onClick={()=>setSort(s)}>
                  {s==='vol'?'Vol':s==='price'?'Prix':s==='change'?'Var.':s==='psa'?'PSA':'A-Z'}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown filters */}
          {showFilters&&(
            <div className="fdrop">
              <div className="fg">
                <div className="fl">{'\u00c9'}re</div>
                <div className="fr">{[{v:'all',l:'Toutes'},{v:'vintage',l:'Vintage (< 2003)'},{v:'modern',l:'Moderne'}].map(o=><button key={o.v} className={'fc'+(filterEra===o.v?' on':'')} onClick={()=>setFilterEra(o.v)}>{o.l}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">S{'\u00e9'}rie</div>
                <div className="fr"><button className={'fc'+(filterSet==='all'?' on':'')} onClick={()=>setFilterSet('all')}>Toutes</button>
                  {SETS.map(st=><button key={st} className={'fc'+(filterSet===st?' on':'')} onClick={()=>setFilterSet(filterSet===st?'all':st)}>{st}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">Raret{'\u00e9'}</div>
                <div className="fr"><button className={'fc'+(filterRarity==='all'?' on':'')} onClick={()=>setFilterRarity('all')}>Toutes</button>
                  {RARITIES.map(r=><button key={r} className={'fc'+(filterRarity===r?' on':'')} onClick={()=>setFilterRarity(filterRarity===r?'all':r)}>{r}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">Fourchette de prix</div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <input className="fp" placeholder="Min" value={filterPriceMin} onChange={e=>setFilterPriceMin(e.target.value.replace(/[^0-9]/g,''))}/>
                  <span style={{fontSize:10,color:'#CCC'}}>{'\u2192'}</span>
                  <input className="fp" placeholder="Max" value={filterPriceMax} onChange={e=>setFilterPriceMax(e.target.value.replace(/[^0-9]/g,''))}/>
                  <span style={{fontSize:9,color:'#BBB'}}>{'\u20ac'}</span>
                </div>
              </div>
              <div className="fg">
                <div className="fl">Tendance</div>
                <div className="fr">{[{v:'all',l:'Toutes'},{v:'hot',l:'Hot (+15%)'},{v:'up',l:'Hausse'},{v:'down',l:'Baisse'},{v:'stable',l:'Stable'}].map(o=><button key={o.v} className={'fc'+(filterTrend===o.v?' on':'')} onClick={()=>setFilterTrend(o.v)}>{o.l}</button>)}</div>
              </div>
              <div className="fg">
                <div className="fl">Gradation</div>
                <div className="fr">{[{v:'all',l:'Tous'},{v:'psa10+',l:'PSA 10 > 1k\u20ac'},{v:'premium',l:'Prime x2+'}].map(o=><button key={o.v} className={'fc'+(filterGrade===o.v?' on':'')} onClick={()=>setFilterGrade(o.v)}>{o.l}</button>)}</div>
              </div>
              {af>0&&<div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}>
                <button onClick={resetF} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #FFD8D0',background:'#FFF5F4',fontSize:10,color:'#E03020',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:500}}>{'\u00d7'} R{'\u00e9'}initialiser ({af})</button>
              </div>}
            </div>
          )}
        </div>

        {/* Count */}
        <div style={{padding:'4px 14px 4px',fontSize:10,color:'#BBB',fontFamily:'var(--font-display)',borderBottom:'1px solid #F5F5F5'}}>
          {filtered.length} carte{filtered.length>1?'s':''}
        </div>

        {/* List */}
        <div ref={listRef} className="ex-list">
          {filtered.map(c=>{
            const on=sel===c.name
            const sp=(HISTORIES[c.name]||[]).slice(-20)
            return(
              <div key={c.name} id={'c-'+c.name} className={'ex-r'+(on?' on':'')} onClick={()=>{setSel(c.name);setPeriod('1M')}}>
                <img src={c.img} alt="" style={{width:34,height:47,objectFit:'cover',borderRadius:5,border:on?'1.5px solid #E03020':'1px solid #F0F0F0',flexShrink:0,transition:'border .12s'}} onError={e=>{(e.target as HTMLImageElement).src='/img/cards/card-back.svg'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:on?600:400,color:on?'#111':'#555',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                  <div style={{fontSize:10,color:'#BBB',marginTop:1,display:'flex',alignItems:'center',gap:4}}>
                    {c.set}
                    <span style={{fontSize:9,color:'#CCC'}}>{'\u00b7'}</span>
                    <span style={{fontSize:9,color:'#CCC'}}>{c.rarity}</span>
                  </div>
                </div>
                <Spark data={sp} w={40} h={16}/>
                <div style={{textAlign:'right',flexShrink:0,minWidth:65}}>
                  <div style={{fontSize:13,fontWeight:600,fontFamily:'var(--font-data)',letterSpacing:'-.3px'}}>{c.price.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  <div style={{fontSize:10,fontWeight:600,color:c.change>=0?'#2E9E6A':'#E03020',fontFamily:'var(--font-data)'}}>{c.change>=0?'+':''}{c.change}%</div>
                </div>
              </div>
            )
          })}
          {filtered.length===0&&<div style={{padding:30,textAlign:'center',color:'#BBB',fontSize:12}}>Aucune carte trouv{'\u00e9'}e</div>}
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={{flex:1,overflowY:'auto',background:'#FAFBFC'}}>
        {/* Sticky nav */}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderBottom:'1px solid #EBEBEB',background:'#fff',position:'sticky',top:0,zIndex:10}}>
          <button className="nb" disabled={ci<=0} onClick={()=>nav(-1)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
          <button className="nb" disabled={ci>=filtered.length-1} onClick={()=>nav(1)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></button>
          <span style={{fontSize:10,color:'#BBB',fontFamily:'var(--font-data)'}}>{ci+1} / {filtered.length}</span>
          <div style={{flex:1}}/>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',gap:3}}>
              {(['1J','1S','1M','3M','1A','3A','5A','MAX'] as Period[]).map(p=>(
                <button key={p} className={`per${period===p?' on':''}`} onClick={()=>setPeriod(p)}>{p}</button>
              ))}
            </div>
            <div style={{height:16,width:1,background:'#EBEBEB'}}/>
            <button className={`per${showMA?' on':''}`} onClick={()=>setShowMA(v=>!v)} style={{fontSize:9}}>MA</button>
            <button className={`per${showVol?' on':''}`} onClick={()=>setShowVol(v=>!v)} style={{fontSize:9}}>Vol</button>
          </div>
        </div>

        <div style={{padding:'20px 24px'}}>
          {/* Hero — card + info + chart inline */}
          <div style={{display:'flex',gap:20,marginBottom:16}}>
            <div style={{flexShrink:0}}>
              <img src={card.img} alt="" style={{width:160,height:223,objectFit:'cover',borderRadius:12,border:'1px solid #EBEBEB',boxShadow:'0 6px 24px rgba(0,0,0,.1)'}} onError={e=>{const t=e.target as HTMLImageElement;t.style.background='#F5F5F7';t.style.border='1px dashed #DDD'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:TC[card.type]||'#888'}}/>
                <span style={{fontSize:11,color:'#AAA',fontFamily:'var(--font-display)',textTransform:'capitalize'}}>{card.type}</span>
                <span style={{fontSize:11,color:'#DDD'}}>{'\u00b7'}</span>
                <span style={{fontSize:11,color:'#AAA',fontFamily:'var(--font-display)'}}>{card.set}</span>
              </div>
              <h2 style={{fontSize:24,fontWeight:600,fontFamily:'var(--font-display)',letterSpacing:'-.5px',margin:'0 0 8px',lineHeight:1.2}}>{getBaseName(card.name)}</h2>

              <div style={{fontSize:38,fontWeight:700,fontFamily:'var(--font-data)',letterSpacing:'-2px',lineHeight:1}}>{cur.toLocaleString('fr-FR')} {'\u20ac'}</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                <span style={{fontSize:14,fontWeight:600,color:isUp?'#2E9E6A':'#E03020',fontFamily:'var(--font-data)',background:isUp?'rgba(46,158,106,.06)':'rgba(224,48,32,.06)',padding:'2px 10px',borderRadius:6}}>
                  {isUp?'\u25b2':'\u25bc'} {isUp?'+':''}{pct.toFixed(1)}%
                </span>
                <span style={{fontSize:12,color:'#AAA',fontFamily:'var(--font-data)'}}>{isUp?'+':''}{(cur-start).toLocaleString('fr-FR')} {'\u20ac'}</span>
              </div>
              {/* Mini stats under price */}
              <div style={{display:'flex',gap:16,marginTop:16}}>
                <div><div style={{fontSize:10,color:'#BBB'}}>Volume 24h</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)'}}>{card.vol}</div></div>
                <div><div style={{fontSize:10,color:'#BBB'}}>PSA 10</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)'}}>{card.psa10.toLocaleString('fr-FR')} {'\u20ac'}</div></div>
                <div><div style={{fontSize:10,color:'#BBB'}}>PSA 9</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)'}}>{card.psa9.toLocaleString('fr-FR')} {'\u20ac'}</div></div>
                <div><div style={{fontSize:10,color:'#BBB'}}>Prime x10</div><div style={{fontSize:14,fontWeight:600,fontFamily:'var(--font-data)',color:'#2E9E6A'}}>+{Math.round((card.psa10/card.price-1)*100)}%</div></div>
              </div>
            </div>
          </div>

          {/* ═══ GRADE SELECTOR ═══ */}
          {siblings.length>1&&(
            <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'12px 14px',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{fontSize:12,fontWeight:600,color:'#555',fontFamily:'var(--font-display)'}}>Grades disponibles</span>
                <span style={{fontSize:10,color:'#BBB',fontFamily:'var(--font-data)'}}>{siblings.length} versions</span>
              </div>
              {(()=>{
                const rawSib=siblings.find(x=>x.grade==='Raw')
                const rawPrice=rawSib?.price||card.price
                const companies=[
                  {name:'Raw',color:'#888',cards:siblings.filter(x=>!x.grade||x.grade==='Raw')},
                  {name:'PSA',color:'#F59E0B',cards:siblings.filter(x=>x.grade?.startsWith('PSA')).sort((a,b)=>b.price-a.price)},
                  {name:'CGC',color:'#3B82F6',cards:siblings.filter(x=>x.grade?.startsWith('CGC')).sort((a,b)=>b.price-a.price)},
                  {name:'BGS',color:'#DC2626',cards:siblings.filter(x=>x.grade?.startsWith('BGS')).sort((a,b)=>b.price-a.price)},
                  {name:'PCA',color:'#22C55E',cards:siblings.filter(x=>x.grade?.startsWith('PCA')).sort((a,b)=>b.price-a.price)},
                ].filter(c=>c.cards.length>0)
                const allGraded=siblings.filter(x=>x.grade&&x.grade!=='Raw')
                const mostTraded=allGraded.length>0?allGraded.reduce((a,b)=>a.vol>b.vol?a:b):null
                const mostExpensive=allGraded.length>0?allGraded.reduce((a,b)=>a.price>b.price?a:b):null
                return(
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {companies.map(comp=>(
                      <div key={comp.name}>
                        {comp.name!=='Raw'&&<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                          <div style={{width:10,height:10,borderRadius:3,background:comp.color,opacity:.7}}/>
                          <span style={{fontSize:11,fontWeight:700,color:comp.color,fontFamily:'var(--font-display)',letterSpacing:'.05em'}}>{comp.name}</span>
                          <div style={{flex:1,height:1,background:'#F0F0F0'}}/>
                          <span style={{fontSize:9,color:'#CCC'}}>{comp.cards.length} note{comp.cards.length>1?'s':''}</span>
                        </div>}
                        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                          {comp.cards.map(sib=>{
                            const g=sib.grade||'Raw'
                            const isOn=selGrade===g
                            const gs=GRADE_STYLES[g]||GRADE_STYLES['Raw']
                            const isRaw=g==='Raw'
                            const premium=isRaw?0:Math.round((sib.price/rawPrice-1)*100)
                            const isPopular=mostTraded&&sib.name===mostTraded.name
                            const isTop=mostExpensive&&sib.name===mostExpensive.name&&!isRaw
                            return(
                              <button key={sib.name} onClick={()=>setSelGrade(g)} style={{
                                display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                                padding:'8px 14px',borderRadius:10,cursor:'pointer',
                                border:isOn?'2px solid '+(isRaw?'#111':gs.border):'1.5px solid #EBEBEB',
                                background:isOn?(isRaw?'#F8F8FA':gs.bg):'#fff',
                                transition:'all .15s cubic-bezier(.2,.8,.2,1)',minWidth:80,position:'relative',
                                boxShadow:isOn?'0 2px 10px rgba(0,0,0,.08)':'none',
                                transform:isOn?'translateY(-2px)':'none',
                              }}
                              onMouseEnter={e=>{if(!isOn){e.currentTarget.style.borderColor='#CCC';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 2px 6px rgba(0,0,0,.04)'}}}
                              onMouseLeave={e=>{if(!isOn){e.currentTarget.style.borderColor='#EBEBEB';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}}
                              >
                                {isPopular&&!isTop&&<div style={{position:'absolute',top:-7,right:-4,fontSize:7,fontWeight:700,color:'#fff',background:'#2E9E6A',padding:'1px 6px',borderRadius:4,fontFamily:'var(--font-display)'}}>POPULAIRE</div>}
                                {isTop&&<div style={{position:'absolute',top:-7,right:-4,fontSize:7,fontWeight:700,color:'#fff',background:'#F59E0B',padding:'1px 6px',borderRadius:4,fontFamily:'var(--font-display)'}}>TOP</div>}
                                {isOn&&<div style={{position:'absolute',top:-1,left:'50%',transform:'translateX(-50%)',width:24,height:3,borderRadius:2,background:isRaw?'#111':gs.color}}/>}
                                <span style={{fontSize:12,fontWeight:isOn?700:500,color:isOn?(isRaw?'#111':gs.color):'#888',fontFamily:'var(--font-data)',letterSpacing:'.02em'}}>{g}</span>
                                <span style={{fontSize:15,fontWeight:700,color:isOn?'#111':'#999',fontFamily:'var(--font-data)',letterSpacing:'-.5px',lineHeight:1}}>{sib.price.toLocaleString('fr-FR')} {String.fromCharCode(8364)}</span>
                                {!isRaw&&<span style={{fontSize:9,fontWeight:600,color:premium>50?'#E03020':premium>20?'#EF9F27':'#2E9E6A',fontFamily:'var(--font-data)'}}>+{premium}%</span>}
                                {isRaw&&<span style={{fontSize:9,color:'#BBB',fontFamily:'var(--font-display)'}}>base</span>}
                                <span style={{fontSize:8,color:'#CCC',fontFamily:'var(--font-data)'}}>vol. {sib.vol}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Stats bar */}
          <div style={{display:'flex',gap:1,marginBottom:2,background:'#F5F5F7',borderRadius:'12px 12px 0 0',overflow:'hidden'}}>
            {[
              {l:'Ouv.',v:data[0]},
              {l:'Haut',v:Math.max(...data)},
              {l:'Bas',v:Math.min(...data)},
              {l:'Moy.',v:Math.round(data.reduce((a,b)=>a+b,0)/data.length)},
              {l:'Amp.',v:Math.max(...data)-Math.min(...data)},
              {l:'Vol. moy.',v:Math.round(volume.reduce((a,b)=>a+b,0)/volume.length)},
            ].map(s=>(
              <div key={s.l} style={{flex:1,background:'#fff',padding:'8px 10px',textAlign:'center'}}>
                <div style={{fontSize:9,color:'#AAA',fontFamily:'var(--font-display)',marginBottom:2}}>{s.l}</div>
                <div style={{fontSize:12,fontWeight:600,fontFamily:'var(--font-data)',letterSpacing:'-.3px'}}>{s.v.toLocaleString('fr-FR')}{s.l!=='Vol. moy.'?' \u20ac':''}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderTop:'none',borderRadius:'0 0 12px 12px',padding:'16px 18px 8px',marginBottom:16}}>
            <Chart data={data} color={isUp?'#2E9E6A':'#E03020'} period={period} volume={showVol?volume:undefined} ma7={showMA?ma7:undefined} ma30={showMA&&data.length>30?ma30:undefined}/>
          </div>

          {/* Grade premium bars */}
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:'#888',fontFamily:'var(--font-display)',marginBottom:10}}>Prime de gradation</div>
            <div style={{display:'flex',gap:16}}>
              {[{label:'Raw \u2192 PSA 10',val:card.psa10,color:'#2E9E6A'},{label:'Raw \u2192 PSA 9',val:card.psa9,color:'#EF9F27'}].map(g=>{
                const premium=Math.round((g.val/card.price-1)*100)
                return(
                  <div key={g.label} style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:11,color:'#888'}}>{g.label}</span>
                      <span style={{fontSize:12,fontWeight:700,color:g.color,fontFamily:'var(--font-data)'}}>+{premium}%</span>
                    </div>
                    <div style={{height:6,background:'#F0F0F0',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:Math.min(premium/5,100)+'%',background:g.color,borderRadius:99,transition:'width .3s ease'}}/>
                    </div>
                    <div style={{fontSize:10,color:'#BBB',marginTop:3,fontFamily:'var(--font-data)'}}>{g.val.toLocaleString('fr-FR')} {'\u20ac'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sales */}
          <div style={{background:'#fff',border:'1px solid #EBEBEB',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#888',fontFamily:'var(--font-display)',marginBottom:10}}>Derni{'\u00e8'}res ventes</div>
            {mockSales(card).map((s,i)=>(
              <div key={i} className="sr">
                <span style={{fontSize:10,fontWeight:600,color:s.src==='eBay'?'#378ADD':'#EF9F27',background:s.src==='eBay'?'rgba(55,138,221,.06)':'rgba(239,159,39,.06)',padding:'2px 6px',borderRadius:4,fontFamily:'var(--font-display)'}}>{s.src}</span>
                <span style={{flex:1,color:'#555',fontFamily:'var(--font-display)'}}>{s.grade}</span>
                <span style={{fontSize:10,color:'#BBB'}}>{s.lang} {'\u00b7'} {s.ago}</span>
                <span style={{fontWeight:600,fontFamily:'var(--font-data)',fontSize:13,minWidth:70,textAlign:'right'}}>{s.p.toLocaleString('fr-FR')} {'\u20ac'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
    </>
  )
}
