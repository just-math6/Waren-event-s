import {afterEach,describe,expect,it,vi} from 'vitest';
import {normalizePhone,validPhone} from '../lib/sale-input';
import {availableCategory,deliveryLinks,publicTicketUrl,type Receipt} from '../lib/ticket-delivery';
import {prepareWhatsApp} from '../components/ticket-delivery';
const token='e1'.repeat(32);
const receipt:Receipt={token,phone:'70 12 34 56',buyer:'Éva Pahima',category:'VIP',eventTitle:'Été & Football #2'};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
describe('remise du billet virtuel',()=>{
 it.each(['70 12 34 56','+226 70 12 34 56','00226 70 12 34 56','22670123456'])('adresse le bon destinataire : %s',value=>{
   expect(validPhone(value)).toBe(true);expect(normalizePhone(value)).toBe('22670123456');
 });
 it.each(['22+670123456','+226 70 12 3','++22670123456','+1 819','612345678'])('refuse un destinataire mal formé : %s',v=>{expect(validPhone(v)).toBe(false);expect(deliveryLinks({...receipt,phone:v}).whatsapp).toBeNull()});
 it('utilise la catégorie choisie, le prénom et une URL stable même sur un autre domaine',()=>{
   vi.stubEnv('NEXT_PUBLIC_TICKET_ORIGIN','https://billets.example.org');
   const {ticket,whatsapp}=deliveryLinks(receipt);const url=new URL(whatsapp!);
   expect(ticket).toBe('https://billets.example.org/billet/'+token);
   expect(url.origin+url.pathname).toBe('https://wa.me/22670123456');
   expect(url.searchParams.get('text')).toBe('Bonjour Éva, voici votre billet VIP pour Été & Football #2 :\n'+ticket+'\nPrésentez ce billet à l’entrée.');
   expect([...url.searchParams.keys()]).toEqual(['text']);
 });
 it('refuse de construire le lien avant réception d’un token valable',()=>{expect(()=>publicTicketUrl('undefined')).toThrow();expect(()=>publicTicketUrl('../admin')).toThrow()});
 it('garde la catégorie encore disponible ou passe à une catégorie en stock pour la prochaine vente',()=>{
  const types=[{id:'standard',n:0},{id:'vip',n:2},{id:'vvip',n:1}];
  expect(availableCategory(types,'standard',t=>t.n)?.id).toBe('vip');expect(availableCategory(types,'vvip',t=>t.n)?.id).toBe('vvip');expect(availableCategory(types.slice(0,1),'standard',t=>t.n)).toBeUndefined();
 });
 it('prépare une fenêtre neutre, sans transmettre de billet pour une vente refusée',()=>{
   const tab={opener:{},document:{documentElement:{},createElement:()=>({}),head:{append:vi.fn()},body:{}},location:{replace:vi.fn()},close:vi.fn()};
   const open=vi.fn(()=>tab);vi.stubGlobal('window',{open});const handoff=prepareWhatsApp();
   expect(open).toHaveBeenCalledWith('about:blank','_blank');expect(tab.opener).toBeNull();expect(tab.location.replace).not.toHaveBeenCalled();
   handoff.cancel();expect(tab.close).toHaveBeenCalledOnce();expect(tab.location.replace).not.toHaveBeenCalled();
 });
 it('redirige après confirmation, et garde exactement le même lien si le navigateur bloque l’ouverture',()=>{
   const tab={document:{documentElement:{},createElement:()=>({}),head:{append:vi.fn()},body:{}},location:{replace:vi.fn()},close:vi.fn()};
   const open=vi.fn().mockReturnValueOnce(tab).mockReturnValueOnce(null);vi.stubGlobal('window',{open});
   expect(prepareWhatsApp().open(receipt)).toBe(true);const href=tab.location.replace.mock.calls[0][0];
   expect(prepareWhatsApp().open(receipt)).toBe(false);expect(deliveryLinks(receipt).whatsapp).toBe(href);
 });
});
