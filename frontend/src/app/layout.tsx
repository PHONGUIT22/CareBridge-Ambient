import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CareBridge Ambient - Echo Show Simulator',
  description:
    'Senior Medication Adherence & Care Companion powered by Alexa+ MCP and AWS Bedrock',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable}`}>
      <body
        className={`${inter.variable} ${geist.variable} font-sans antialiased text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}