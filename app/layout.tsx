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
  title: 'Tales of Xadion: IQ Tactics',
  description:
    'Sixty-four waystones in the wash. Outsmart the storm. Forge the TrenChess. A Sonoran desert tactical strategy RPG set across Spring 2004 and Sevens Night 2007.',
  openGraph: {
    title: 'Tales of Xadion: IQ Tactics',
    description:
      'Sixty-four waystones in the wash. Outsmart the storm. Forge the TrenChess.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tales of Xadion: IQ Tactics',
    description:
      'Sixty-four waystones in the wash. Outsmart the storm. Forge the TrenChess.',
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
        className="bg-[#0b1021] text-slate-100 antialiased font-sans selection:bg-teal-400/30 selection:text-teal-100"
      >
        {children}
      </body>
    </html>
  );
}
