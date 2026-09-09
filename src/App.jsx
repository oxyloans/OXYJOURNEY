import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import JourneySection from "./components/JourneySection";
import HowItWorks from "./components/HowItWorks";
import BenefitsSection from "./components/BenefitsSection";
import FAQSection from "./components/FAQSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Header />
      <main>
        <HeroSection />
        <JourneySection />
        <HowItWorks />
        <BenefitsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
