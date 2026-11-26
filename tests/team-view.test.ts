import {describe,it,expect} from 'vitest';
import {inventory,gateMessage} from '../lib/team-view';
describe('Affichage du poste équipe',()=>{
 it('sépare papier réservé, papier vendu et places virtuelles sans décompter une vente deux fois',()=>{
  const [row]=inventory([{id:'t',name:'VIP',price:1500,quantity:10,paper_prepared:8,paper_ready:3}],[{seller:'A',name:'VIP',type_id:'t',revenue:10500,sold:7,used:2}]);expect(row).toMatchObject({available:0,paperSold:5,sold:7});
 });
 it('distingue un doublon, un billet non activé et un résultat inconnu au contrôle',()=>{
  expect(['accepted','utilise','pret','missing','inattendu'].map(o=>gateMessage(o).tone)).toEqual(['ok','warn','bad','bad','bad']);
 });
});
