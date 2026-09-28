import { RotaApp } from "@/components/rota/rota-app";

export const dynamic = "force-dynamic";

const description =
  "Build and publish your department's monthly serving rota at Kharis Church Freetown. Department access code needed.";

export const metadata = {
  title: "Serving rota",
  description,
  openGraph: {
    title: "Serving rota · Kharis Church Freetown",
    description,
    url: "/rota",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Serving rota · Kharis Church Freetown",
    description,
  },
};

export default function RotaPage() {
  return <RotaApp />;
}
