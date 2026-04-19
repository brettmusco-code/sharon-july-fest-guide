import { Sparkles, MapPin, Calendar } from "lucide-react";
import Countdown from "./Countdown";

const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-secondary">
      {/* Stars / decorative dots */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-firework-gold animate-sparkle"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Bunting decoration top */}
      <div className="absolute top-0 left-0 right-0 h-8 flex justify-center gap-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="w-12 h-8 -mt-2"
            style={{
              background: i % 3 === 0 ? "hsl(356, 72%, 45%)" : i % 3 === 1 ? "white" : "hsl(215, 60%, 30%)",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 py-16 max-w-4xl mx-auto">
        <div className="animate-float mb-4">
          <span className="text-6xl">🎆</span>
        </div>

        <p className="font-body text-primary-foreground/80 uppercase tracking-[0.3em] text-sm mb-3 font-semibold">
          Town of Sharon, Massachusetts
        </p>

        <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl text-primary-foreground leading-tight mb-4 text-shadow-festive">
          Independency Day Celebration
        </h1>

        <div className="flex items-center justify-center gap-2 text-firework-gold text-xl md:text-2xl font-body font-bold mb-8">
          <Calendar className="w-6 h-6" />
          <span>July 3, 2026</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-primary-foreground/70 font-body mb-8">
          <MapPin className="w-5 h-5" />
          <span>Memorial Park Beach</span>
        </div>

        <div className="mb-10 flex justify-center">
          <Countdown />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#schedule"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-body font-bold text-lg hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-5 h-5" />
            View Schedule
          </a>
          <a
            href="#map"
            className="inline-flex items-center gap-2 bg-firework-gold text-accent-foreground px-8 py-4 rounded-lg font-body font-bold text-lg hover:opacity-90 transition-opacity"
          >
            <MapPin className="w-5 h-5" />
            Explore Map
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
