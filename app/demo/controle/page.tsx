import type {Metadata} from 'next';
import Demo from './simulation';
export const metadata:Metadata={title:'Waren Events · Démo contrôle',description:'Essayez le poste d’entrée avec des billets de démonstration.'};
export default function Page(){return <Demo/>}
