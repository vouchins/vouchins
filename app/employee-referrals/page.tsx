import { ProductLandingPage } from "@/components/product-landing-page";
import { createProductPageMetadata } from "@/lib/product-page-metadata";
import { PRODUCT_PAGES } from "@/lib/product-pages";

const content = PRODUCT_PAGES["employee-referrals"];
export const metadata = createProductPageMetadata(content);

export default function EmployeeReferralsPage() {
  return <ProductLandingPage content={content} />;
}
