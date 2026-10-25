import { MarketingFooter } from "@/marketing/components/MarketingFooter";
import { MarketingNav } from "@/marketing/components/MarketingNav";
import About from "@/marketing/about/About";
import Contact from "@/marketing/about/Contact";
import Hero from "@/marketing/about/Hero";
import Projects from "@/marketing/about/Projects";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-brand-dark">
      <MarketingNav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Contact />
      </main>
      <MarketingFooter />
    </div>
  );
}
