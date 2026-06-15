import { redirect } from "next/navigation";
import { SITE } from "@/config/site";

export default async function ProductLinkRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`${SITE.apiBase}/v1/product-links/r/${encodeURIComponent(slug)}`);
}
