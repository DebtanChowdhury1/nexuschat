import { useEffect, useRef } from 'react';

import { AmbientBackground } from './AmbientBackground';
import { ClosingCta } from './ClosingCta';
import { FeatureGrid } from './FeatureGrid';
import { FreeTierSection } from './FreeTierSection';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { MemoryMapShowcase } from './MemoryMapShowcase';
import { PipelineDemo } from './PipelineDemo';
import { RoomsShowcase } from './RoomsShowcase';
import { Testimonials } from './Testimonials';

function scrollToRef(ref: React.RefObject<HTMLDivElement | null>) {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Web-only marketing page (native never mounts this tree — see
 * app/(auth)/index.tsx). Built as plain DOM elements + Framer Motion rather
 * than RN primitives + a ScrollView, since the scroll-linked pieces
 * (AmbientBackground, PipelineDemo, LandingNav's hide-on-scroll) all need
 * real window scroll, not a nested RN ScrollView's own scroll container.
 */
export function LandingPage() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const memoryMapRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  // React Native Web's default reset pins `html, body { height: 100% }` and
  // `body { overflow: hidden }` — correct for the authenticated app screens,
  // which manage their own scrolling via an RN ScrollView inside a fixed
  // viewport, but wrong here since this page is plain DOM relying on real
  // window scroll (see comment above). Left alone, `overflow:hidden`
  // propagates to become the viewport's effective overflow (blocking real
  // trackpad/wheel scrolling entirely), and simply flipping it to `auto`
  // without also freeing the height turns `body` itself into a nested,
  // internally-scrolling box instead of growing the document — which still
  // *looks* scrollable but breaks everything here keyed off real `window`
  // scroll (Framer's useScroll, the nav's hide-on-scroll, the ambient
  // parallax). So both overflow and height need freeing, restored on
  // unmount so the authenticated screens' fixed-viewport layout is
  // unaffected.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevHtmlHeight = document.documentElement.style.height;
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';
    document.body.style.height = 'auto';
    document.documentElement.style.height = 'auto';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.height = prevBodyHeight;
      document.documentElement.style.height = prevHtmlHeight;
    };
  }, []);

  const navLinks = [
    { label: 'Features', onClick: () => scrollToRef(featuresRef) },
    { label: 'How it works', onClick: () => scrollToRef(pipelineRef) },
    { label: 'Live Rooms', onClick: () => scrollToRef(roomsRef) },
    { label: 'Memory Map', onClick: () => scrollToRef(memoryMapRef) },
    { label: 'Pricing', onClick: () => scrollToRef(pricingRef) },
  ];

  return (
    <div className="bg-bg-light dark:bg-bg-dark" style={{ position: 'relative' }}>
      <AmbientBackground />
      <LandingNav links={navLinks} />
      <Hero onSeeHowItWorks={() => scrollToRef(pipelineRef)} />
      <div ref={featuresRef}>
        <FeatureGrid />
      </div>
      <div ref={pipelineRef}>
        <PipelineDemo />
      </div>
      <div ref={roomsRef}>
        <RoomsShowcase />
      </div>
      <div ref={memoryMapRef}>
        <MemoryMapShowcase />
      </div>
      <Testimonials />
      <div ref={pricingRef}>
        <FreeTierSection />
      </div>
      <ClosingCta />
      <LandingFooter />
    </div>
  );
}
