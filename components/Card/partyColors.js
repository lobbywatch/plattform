// Soruce
// https://github.com/srfdata/swiss-party-colors/blob/856bf26a5686e61fd9d287ee188bc8dcbb4c0e2b/definitions.json
// copy(sheet.data.reduce((map, p) => {
//   map[p.abbr_de] = p.color
//   return map
// }, {}))

const getColor = (partyAbbr = '') => {
  return map[partyAbbr.toUpperCase()] || fallback
}

export default getColor

const fallback = '#B8B8B8'

const map = {
  SVP: '#4B8A3E',
  JSVP: '#4B8A3E',
  SP: '#F0554D',
  JUSO: '#F0554D',
  JSVR: '#F0554D',
  FDP: '#3872B5',
  JF: '#3872B5',
  JFS: '#3872B5',
  UP: '#3872B5',
  LPS: '#618DEA',
  LDP: '#618DEA',
  JLDP: '#618DEA',
  CSP: '#35AEB2',
  PCSI: '#35AEB2',
  MCG: '#49A5E7',
  MCGJ: '#49A5E7',
  LEGA: '#9070D4',
  CVP: '#D6862B',
  CSV: '#D6862B',
  JCVP: '#D6862B',
  GPS: '#84B547',
  GRÜNE: '#84B547',
  'BASTA!': '#84B547',
  'JGBNW': '#84B547',
  JG: '#84B547',
  BDP: '#E6C820',
  JBDP: '#E6C820',
  GLP: '#C4C43D',
  JGLP: '#C4C43D',
  EVP: '#DEAA28',
  JEVP: '#DEAA28',
  CSPO: '#E3BA24',
  JCSPO: '#E3BA24',
  EDU: '#A65E42',
  JEDU: '#A65E42',
  PDA: '#BF3939',
  PSA: '#BF3939',
  AL: '#A83232',
  'AL ZH': '#A83232',
  SOL: '#A83232',
  AGT: '#A83232',
  BFS: '#A83232',
  RDN: '#A83232',
  KP: '#8C2736',
  KJ: '#8C2736',
  RCV: '#C73C58',
  EAG: '#AD4F89',
  VB: '#1C5F9D',
  IP: '#2496B3',
  LDU: '#1BAA6E',
  IA: '#4B8A3E',
  TPS: '#759149',
  ECOPOP: '#487F5A',
  GEM: '#4FD1C6',
  DPS: '#B07F3E',
  PNOS: '#B07F3E',
  HUM: '#E17C4D',
  PPS: '#E7B661',
  MVIVA: '#88519C',
  LEGASUD: '#9D9D9D',
  INDIGN: '#858585',
  SD: '#9D9D9D',
  AUTO: '#9D9D9D',
  FPS: '#9D9D9D',
  JA: '#858585',
  AER: '#9D9D9D',
  CHANCE: '#9D9D9D',
  DE: '#9D9D9D',
  HF: '#9D9D9D',
  INV: '#9D9D9D',
  MEHR: '#9D9D9D',
  SVI: '#9D9D9D',
  VGA: '#9D9D9D',
  PF: '#B5B5B6',
  SLB: '#B5B5B7',
  DU: '#9D9D9D',
  UNABH: '#B5B5B8'
}
