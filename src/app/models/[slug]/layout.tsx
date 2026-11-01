import type { Metadata } from 'next';
import { getProductBySlug } from '@/models/registry';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mod = getProductBySlug(slug);

  if (!mod) {
    return {
      title: 'Modelo 3D Não Encontrado',
    };
  }

  const { schema } = mod;
  const url = `https://stl.joaocouto.com/models/${schema.id}`;
  const previewUrl = `/previews/${schema.id}.png`;

  return {
    title: `${schema.name} — Gerador 3D (.STL e .3MF)`,
    description: `${schema.description} Personalize medidas, fontes e relevo online e baixe o arquivo .STL ou .3MF multicor pronto para fatiar.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      url,
      title: `${schema.name} | STLTools — stl.joaocouto.com`,
      description: schema.shortDescription,
      images: [
        {
          url: previewUrl,
          width: 560,
          height: 380,
          alt: schema.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${schema.name} | STLTools`,
      description: schema.shortDescription,
      images: [previewUrl],
    },
  };
}

export default function ModelDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
