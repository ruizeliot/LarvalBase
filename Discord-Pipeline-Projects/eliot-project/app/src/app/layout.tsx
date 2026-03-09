import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'LarvalBase - Fish Larvae Trait Database',
    template: '%s | LarvalBase',
  },
  description: 'Comprehensive database of marine fish larvae dispersal traits: egg characteristics, hatching size, metamorphosis, settlement, swimming speed, growth curves, and more.',
  metadataBase: new URL('https://larvalbase.ingevision.cloud'),
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'LarvalBase - Fish Larvae Trait Database',
    description: 'Comprehensive database of marine fish larvae dispersal traits.',
    url: 'https://larvalbase.ingevision.cloud',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased overflow-x-hidden`}>
        <I18nProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
