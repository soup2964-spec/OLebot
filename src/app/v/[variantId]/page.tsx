import { notFound } from "next/navigation";
import { allVariants, getVariant } from "@/lib/registry";
import { LandingPage } from "@/components/LandingPage";

export function generateStaticParams() {
  return allVariants().map((v) => ({ variantId: v.id }));
}

export default async function VariantPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  const variant = getVariant(variantId);
  if (!variant) notFound();
  return <LandingPage variant={variant} />;
}
