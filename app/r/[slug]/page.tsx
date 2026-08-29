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

  return { title: rota ? `${rota.departmentName} serving rota` : "Serving rota" };
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
