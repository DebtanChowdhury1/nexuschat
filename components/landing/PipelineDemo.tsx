import { useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';

import { PipelineScene } from './PipelineScene';
import { color } from '../../constants/theme';
import { useInView } from '../../lib/useInView';

const STEPS = [
  { label: 'Message sent', caption: '"Plan a 3-day trip to Kyoto"' },
  { label: 'AI streams live', caption: 'Sure — here are three ideas to get you started…' },
  { label: 'Synced to device 2', caption: 'Phone ↔ Web, live, no refresh needed' },
  { label: 'Branch created', caption: 'Edit any message — the original stays reachable' },
];

/**
 * The "pipeline demo" — a real 3D scene (see PipelineScene) with a glowing
 * packet traveling along a curved path, driven by scroll position rather
 * than a video embed. A tall (300vh) section with a sticky viewport inside;
 * scrolling through it advances scrollYProgress 0->1.
 */
export function PipelineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  // Gates mounting the 3D canvas until this section is actually near the
  // viewport, and pauses its render loop once scrolled away — see
  // lib/useInView.ts for why (WebGL context exhaustion / perpetual render
  // loops when every landing-page canvas mounts and keeps running
  // simultaneously). Uses its OWN ref on a nested element rather than
  // sharing `ref` above: pointing both this IntersectionObserver (which
  // mounts the WebGL canvas) and useScroll's target at the very same node
  // was reproducibly resetting window.scrollY to 0 mid-scroll — inserting
  // the canvas into the exact element Framer measures for scroll-progress
  // collided with its rect recalculation. A separate, nested element
  // sidesteps it.
  const [canvasHostRef, sceneHasBeenInView, sceneIsCurrentlyInView] = useInView<HTMLDivElement>();
  const [activeStep, setActiveStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const { width } = useWindowDimensions();

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActiveStep(Math.min(3, Math.floor(v * 4)));
  });

  const progressMotion = useTransform(scrollYProgress, (v) => Math.min(1, v));
  useMotionValueEvent(progressMotion, 'change', setOverallProgress);

  return (
    <div ref={ref} style={{ height: '180vh', position: 'relative' }} className="z-10">
      <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="mx-auto w-full max-w-4xl px-6">
          <p
            className="text-ink-primary-light dark:text-ink-primary"
            style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}
          >
            How it works
          </p>

          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {STEPS.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <motion.div
                  animate={{
                    backgroundColor: i <= activeStep ? color.brand.DEFAULT : 'rgba(128,128,128,0.25)',
                    scale: i === activeStep ? 1.15 : 1,
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </motion.div>
                <span
                  className="text-ink-secondary-light dark:text-ink-secondary"
                  style={{ fontSize: 13, display: width > 700 ? 'inline' : 'none' }}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div
            ref={canvasHostRef}
            className="border-border-light dark:border-border"
            style={{ borderRadius: 24, border: '1px solid', height: 340, overflow: 'hidden', position: 'relative' }}
          >
            {sceneHasBeenInView && (
              <PipelineScene progress={overallProgress} activeStep={activeStep} active={sceneIsCurrentlyInView} />
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px', pointerEvents: 'none' }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-ink-secondary-light dark:text-ink-secondary"
                  style={{ fontSize: 13.5, textAlign: 'center', margin: 0 }}
                >
                  {STEPS[activeStep].caption}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
