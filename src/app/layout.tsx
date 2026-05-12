import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/layout/AppLayout';
import { ToastProvider } from '@/shared/components/toast/Toast';
import { PermissionsProvider } from '@/shared/auth/PermissionsProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'TFD — Tratamento Fora do Domicílio',
  description:
    'Sistema de gestão de Tratamento Fora do Domicílio — SES Maranhão',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <PermissionsProvider>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </PermissionsProvider>
      </body>
    </html>
  );
}
