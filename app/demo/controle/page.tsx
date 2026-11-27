import type {Metadata} from 'next';
import Demo from './simulation';
export const metadata: Metadata = {
  title: 'Démo du contrôle des entrées',
  description: 'Essayez le lecteur de billets avec des exemples fictifs et découvrez les réponses à un premier passage, à un second scan et à un billet inconnu.',
};
export default function Page(){return <Demo/>}
