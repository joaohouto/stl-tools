import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calculadora de Custos e Preço de Venda para Impressão 3D',
  description:
    'Calcule o custo exato de filamento (PLA, PETG, ABS, TPU), energia elétrica, depreciação de impressora (Bambu Lab, Creality, Prusa), reserva de falhas e preços sugeridos para Shopee, Mercado Livre e venda direta no Pix.',
  alternates: {
    canonical: 'https://stl.joaocouto.com/calculadora',
  },
  openGraph: {
    title: 'Calculadora de Custos e Precificação 3D | STLTools — stl.joaocouto.com',
    description:
      'Ferramenta gratuita para calcular custos reais de impressão 3D, margem de lucro, lotes de atacado e taxas reversas de Shopee e Mercado Livre.',
    url: 'https://stl.joaocouto.com/calculadora',
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
