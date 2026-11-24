import RefreshStock from './refresh-stock';

export type StockCategory = {
  id: string; name: string; price: number; quantity: number; paper_ready: number; paper_prepared: number;
};
const number = new Intl.NumberFormat('fr-FR');
const label = (n: number, singular: string, plural: string) =>
  number.format(n) + ' ' + (n > 1 ? plural : singular);

export default function Stock({types, sales}: {types: StockCategory[]; sales: {type_id: string; sold: number}[]}) {
  const soldByType = new Map<string, number>();
  for (const sale of sales) soldByType.set(sale.type_id, (soldByType.get(sale.type_id) ?? 0) + sale.sold);
  return <section className="card space-y-3" aria-labelledby="stock-title">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="stock-title" className="font-semibold">Stock des billets</h2><RefreshStock/></div>
    {types.length === 0 ? <p className="text-sm text-gray-500">Aucune catégorie de billet pour cet événement.</p> :
      <ul className="divide-y divide-gray-200">{types.map(t => {
        const sold = soldByType.get(t.id) ?? 0;
        const withoutPaper = sold - (t.paper_prepared - t.paper_ready);
        return <li key={t.id} className="space-y-1 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-medium">{t.name} <span className="text-sm font-normal text-gray-500">· {number.format(t.price)} FCFA</span></h3>
            <p className={'font-semibold ' + (t.paper_ready > 0 ? 'text-green-600' : 'text-amber-600')}>{label(t.paper_ready, 'prêt à vendre', 'prêts à vendre')}</p>
          </div>
          <p className="text-sm text-gray-500">{label(t.quantity, 'prévu', 'prévus')} · {label(t.paper_prepared, 'préparé', 'préparés')} · {label(sold, 'vendu', 'vendus')}</p>
          {withoutPaper > 0 && <p className="text-sm text-gray-500">Dont {label(withoutPaper, 'vente', 'ventes')} sans billet papier.</p>}
        </li>;
      })}</ul>}
    <p className="text-sm text-gray-500">Un billet prêt à vendre a déjà son QR code et n’a pas encore été vendu.</p>
  </section>;
}
