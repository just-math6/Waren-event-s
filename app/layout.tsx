import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Waren Events', template: '%s · Waren Events' },
  description: 'Billetterie privée de Waren Events pour les organisateurs et leurs équipes.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">{children}</main></body></html>;
}
