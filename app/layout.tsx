import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  applicationName: 'Waren Events',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
      { url: '/icons/waren.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
  },
  appleWebApp: { capable: true, title: 'Waren Events', statusBarStyle: 'default' },
  title: { default: 'Waren Events', template: '%s · Waren Events' },
  description: 'Billetterie privée de Waren Events pour les organisateurs et leurs équipes.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#203c2b' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">{children}</main></body></html>;
}
