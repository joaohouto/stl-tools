import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Converter Imagem (PNG, JPG) para SVG 3D — Vetorizador Online',
  description:
    'Converta logotipos, desenhos e imagens PNG/JPG em arquivos .SVG vetorizados limpos para extrusão 3D em chaveiros, carimbos, suportes e placas.',
  alternates: {
    canonical: 'https://stl.joaocouto.com/imagem-para-svg',
  },
  openGraph: {
    title: 'Vetorizador de Imagem PNG/JPG para SVG 3D | STLTools — stl.joaocouto.com',
    description:
      'Transforme qualquer imagem ou logo em vetor SVG pronto para modelagem e impressão 3D.',
    url: 'https://stl.joaocouto.com/imagem-para-svg',
  },
};

export default function VectorizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
