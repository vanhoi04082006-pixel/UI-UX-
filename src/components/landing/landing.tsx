"use client";

import { Navbar } from "@/components/v-intern/navbar";
import { Hero } from "@/components/v-intern/hero";
import { HowItWorks } from "./how-it-works";
import { AiInterviewShowcase } from "@/components/v-intern/ai-interview-showcase";
import { ProductHeart } from "@/components/v-intern/product-heart";
import { AudienceCards } from "@/components/v-intern/audience-cards";
import { Workflow } from "@/components/v-intern/workflow";
import { FinalCta } from "@/components/v-intern/final-cta";
import { Footer } from "@/components/v-intern/footer";

/**
 * LANDING V-INTERN — khôi phục theo bản gốc trong repo.
 * Gốc trang dẻo (sticky footer): min-h-screen flex flex-col, footer mt-auto.
 * Thứ tự trang: hero → cách hoạt động (bản nâng cấp hiện tại, giữ nguyên)
 * → phỏng vấn AI → trái tim sản phẩm → hai đối tượng → quy trình → CTA cuối.
 */
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <HowItWorks />
        <AiInterviewShowcase />
        <ProductHeart />
        <AudienceCards />
        <Workflow />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
