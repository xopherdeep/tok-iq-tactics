import type {Metadata} from 'next';
import {JetBrains_Mono, Plus_Jakarta_Sans} from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tales of Xadion: Birth of the Brotherhood',
  description:
    'Twin Commanders X and Sol hold the 64 stones of the Hall Crossing in a tactical RPG set in the desert realm of Xadion.',
  openGraph: {
    title: 'Tales of Xadion: Birth of the Brotherhood',
    description:
      'Twin Commanders X and Sol hold the 64 stones of the Hall Crossing in a tactical RPG set in the desert realm of Xadion.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tales of Xadion: Birth of the Brotherhood',
    description:
      'Twin Commanders X and Sol hold the 64 stones of the Hall Crossing in a tactical RPG set in the desert realm of Xadion.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#0f172a] text-slate-100 antialiased font-sans selection:bg-sky-500/30 selection:text-sky-100"
      >
        {children}
      </body>
    </html>
  );
}
