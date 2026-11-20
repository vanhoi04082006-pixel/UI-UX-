"use client";

import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { FeatureStrip } from "./feature-strip";
import { HowItWorks } from "./how-it-works";
import { AiInterview } from "./ai-interview";
import { ProductHeart } from "./product-heart";
import { AudienceCards } from "./audience-cards";
import { Testimonials } from "./testimonials";
import { StatsBand } from "./stats-band";
import { Workflow } from "./workflow";
import { Faq } from "./faq";
import { FinalCta } from "./final-cta";
import { Footer } from "./footer";

/**
 * LANDING V-INTERN — "Sổ tay hành trình".
 * Gốc trang dẻo (sticky footer): min-h-screen flex flex-col, footer mt-auto.
 * Thứ tự trang: nền tảng → cách hoạt động → phỏng vấn AI → trái tim sản phẩm
 * → hai đối tượng → người dùng kể lại → dải số liệu → quy trình 7 bước
 * → hỏi đáp → CTA cuối → chân trang.
 */
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <FeatureStrip />
        <HowItWorks />
        <AiInterview />
        <ProductHeart />
        <AudienceCards />
        <Testimonials />
        <StatsBand />
        <Workflow />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
