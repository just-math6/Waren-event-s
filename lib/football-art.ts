export const footballTitle = 'Football Tournament Two';
export const footballTypes = [
  { name: 'Standard', price: 500, src: 'standard', w: 800, h: 290, x: 617, y: 70, size: 150 },
  { name: 'VIP', price: 1500, src: 'vip', w: 800, h: 290, x: 617, y: 70, size: 150 },
  { name: 'VVIP', price: 2000, src: 'vvip', w: 1080, h: 392, x: 832, y: 94, size: 204 },
] as const;
export type FootballArt = (typeof footballTypes)[number];
export function findFootballArt(name:string,price:number) {
  return footballTypes.find(a => a.name.toLowerCase() === name.trim().toLowerCase() && a.price === price);
}
