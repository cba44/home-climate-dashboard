import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Home Climate Dashboard',
  description: 'Live temperature and humidity monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
