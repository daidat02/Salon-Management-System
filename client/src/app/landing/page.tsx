import FaqSection from './components/FaqSection';
import FeaturesSection from './components/FeaturesSection';
import FinalCtaSection from './components/FinalCtaSection';
import HeroSection from './components/HeroSection';
import HowItWorksSection from './components/HowItWorksSection';
import ImpactSection from './components/ImpactSection';
import LandingFooter from './components/LandingFooter';
import LandingHeader from './components/LandingHeader';
import MetricsSection from './components/MetricsSection';
import PricingSection from './components/PricingSection';
import ProblemSolutionSection from './components/ProblemSolutionSection';
import ShowcaseSection from './components/ShowcaseSection';
import TestimonialsSection from './components/TestimonialsSection';

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main id="top">
        <HeroSection />
        <MetricsSection />
        <ProblemSolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ShowcaseSection />
        <ImpactSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
