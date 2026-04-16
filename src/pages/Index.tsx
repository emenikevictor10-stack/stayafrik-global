import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { Destinations } from "@/components/home/Destinations";
import { FeaturedStays } from "@/components/home/FeaturedStays";
import { ValueProps } from "@/components/home/ValueProps";
import { HostCta } from "@/components/home/HostCta";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Destinations />
        <FeaturedStays />
        <ValueProps />
        <HostCta />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
