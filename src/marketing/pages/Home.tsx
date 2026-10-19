import { MarketingFooter } from "@/marketing/components/MarketingFooter";
import { MarketingNav } from "@/marketing/components/MarketingNav";
import { JsonLd } from "@/marketing/components/JsonLd";
import { ChallengesSection } from "@/marketing/home/ChallengesSection";
import { CTASection } from "@/marketing/home/CTASection";
import { FeatureHighlights } from "@/marketing/home/FeatureHighlights";
import { HeroSection } from "@/marketing/home/HeroSection";
import { TimelineSection } from "@/marketing/home/TimelineSection";
import { organizationJsonLd, websiteJsonLd } from "@/marketing/seo";
import { IaWhatsappSection } from "@/marketing/home/IaWhatsappSection";
//import { SitesLandingSection } from "@/marketing/home/SitesLandingSection";
//import { IntegrationsSection } from "@/marketing/home/IntegrationsSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-brand-dark">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <MarketingNav />
      <main className="relative z-0">
        <HeroSection />
        <ChallengesSection />
        <FeatureHighlights />
        <IaWhatsappSection />
        {/*<SitesLandingSection />
        <IntegrationsSection />*/}
        <TimelineSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
