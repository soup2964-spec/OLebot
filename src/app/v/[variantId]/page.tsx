import { notFound } from "next/navigation";
import { allVariantsSync, getVariant } from "@/platform/registry";
import { LandingPage } from "@/features/landing/LandingPage";

export function generateStaticParams() {
  return allVariantsSync().map((v) => ({ variantId: v.id }));
}

export default async function VariantPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  const variant = await getVariant(variantId);
  if (!variant) notFound();
  return <LandingPage variant={variant} />;
}
