import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'STLTools — Catálogo de Produtos 3D Paramétricos & Calculadora de Custos',
  description:
    'Personalize suportes de celular com sua marca, chaveiros contornados, letras com nome sem cola, cortadores de biscoito, placas Pix QR Code e calcule o custo exato de impressão 3D.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen flex flex-col bg-surface-900 text-slate-100 antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800/80 bg-surface-900 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <span className="font-bold text-slate-300">STLTools</span> — Motor Paramétrico de Produtos 3D & Precificação Inteligente.
            </div>
            <div className="flex items-center gap-4">
              <span>Exportação nativa: .STL, .ZIP (Multicor) & .3MF</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
