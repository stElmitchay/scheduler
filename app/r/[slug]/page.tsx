import { notFound } from "next/navigation";
import { PublicRotaView } from "@/components/rota/public-rota";
import { getPublicRota } from "@/lib/rota/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rota = await getPublicRota(slug);

  if (!rota) {
    return { title: "Serving rota" };
  }

  const title = `${rota.departmentName} serving rota`;
  const description = `Serving dates for the ${rota.departmentName} team at Kharis Church Freetown. Search your name to find yours.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} · Kharis Church Freetown`,
      description,
      url: `/r/${slug}`,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} · Kharis Church Freetown`,
      description,
    },
  };
}

export default async function PublicRotaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rota = await getPublicRota(slug);

  if (!rota) {
    notFound();
  }

  return <PublicRotaView rota={rota} />;
}
