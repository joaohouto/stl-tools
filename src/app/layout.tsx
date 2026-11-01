import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const viewport: Viewport = {
  themeColor: "#f97316",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://stl.joaocouto.com"),
  title: {
    default: "STLTools by João Couto — Modelos 3D Paramétricos & Calculadora 3D",
    template: "%s | STLTools — stl.joaocouto.com",
  },
  description:
    "Personalize e baixe arquivos 3D (.STL e .3MF multicor p/ Bambu Lab e OrcaSlicer) direto no navegador: chaveiros com nome, suporte de celular flutuante, coroa Stanley Jug, porta-crachá, carimbos, placas QR Code Pix e calculadora de custos 3D. Criado por João Couto (joaocouto.com).",
  keywords: [
    "gerador de stl",
    "modelos 3d personalizados",
    "impressão 3d",
    "chaveiro 3d com nome",
    "suporte de celular 3d",
    "calculadora custo impressão 3d",
    "precificação impressão 3d",
    "bambu lab 3mf multicor",
    "orcaslicer",
    "placa qr code pix 3d",
    "tampa stanley jug 3d",
    "vetorizar imagem para svg 3d",
    "joão couto",
    "joaocouto.com",
    "stl.joaocouto.com",
  ],
  authors: [{ name: "João Couto", url: "https://joaocouto.com" }],
  creator: "João Couto",
  publisher: "João Couto",
  category: "technology",
  alternates: {
    canonical: "https://stl.joaocouto.com",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://stl.joaocouto.com",
    siteName: "STLTools — stl.joaocouto.com",
    title: "STLTools by João Couto — Gerador de Modelos 3D Paramétricos (.STL & .3MF)",
    description:
      "Gere arquivos .STL e .3MF multicor personalizados em segundos direto no navegador e calcule custos e preços de venda para Shopee, Mercado Livre e venda direta.",
    images: [
      {
        url: "/previews/suporte-celular-marca.png",
        width: 560,
        height: 380,
        alt: "STLTools — Catálogo 3D Paramétrico por João Couto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "STLTools by João Couto — Modelos 3D Paramétricos (.STL & .3MF)",
    description:
      "Crie chaveiros, suportes, placas QR Pix, tampas Stanley Jug e calcule custos de impressão 3D direto no navegador.",
    images: ["/previews/suporte-celular-marca.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "STLTools",
    url: "https://stl.joaocouto.com",
    applicationCategory: "DesignApplication",
    operatingSystem: "All",
    inLanguage: "pt-BR",
    description:
      "Plataforma web de modelagem CAD 3D paramétrica para impressão 3D (.STL e .3MF multicor), vetorização de imagens para SVG e calculadora profissional de custos de impressão 3D.",
    author: {
      "@type": "Person",
      name: "João Couto",
      url: "https://joaocouto.com",
    },
    isPartOf: {
      "@type": "WebSite",
      name: "João Couto",
      url: "https://joaocouto.com",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
  };

  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen flex flex-col bg-surface-900 text-slate-100 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
