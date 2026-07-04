import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { GalaxyScene } from '../memory-map/GalaxyScene';
import { anchorForCluster, clusterConversations, computeTfIdf, clusterLabel, nodeOffset } from '../../lib/topicClustering';
import { colorForRecency } from '../../lib/memoryMap';
import { useInView } from '../../lib/useInView';
import type { MemoryNode, MemoryCluster } from '../../lib/memoryMap';
import type { Conversation } from '../../types/db';

// Illustrative-only demo topics — never claimed as real usage data, purely
// to show a visitor what their own Memory Map would look like once they
// have a history of conversations.
const DEMO_TOPICS = [
  { id: 'd1', title: 'Planning a trip to Kyoto', text: 'Planning a trip to Kyoto itinerary flights hotels temples food', days: 0, messages: 24 },
  { id: 'd2', title: 'Debugging a React hook', text: 'Debugging a React hook useEffect infinite loop dependency array', days: 1, messages: 41 },
  { id: 'd3', title: 'Learning conversational Spanish', text: 'Learning conversational Spanish verbs practice phrases vocabulary', days: 3, messages: 18 },
  { id: 'd4', title: 'Sourdough starter troubleshooting', text: 'Sourdough starter troubleshooting bread baking flour hydration', days: 6, messages: 12 },
  { id: 'd5', title: 'System design interview prep', text: 'System design interview prep scaling database caching architecture', days: 9, messages: 33 },
  { id: 'd6', title: 'React performance deep dive', text: 'React performance rendering memoization useMemo optimization hook', days: 2, messages: 27 },
  { id: 'd7', title: 'Japan trip: JR pass questions', text: 'Japan trip JR pass train tickets Kyoto Tokyo travel', days: 0, messages: 9 },
  { id: 'd8', title: 'Spanish subjunctive practice', text: 'Spanish subjunctive practice grammar verbs conversation', days: 4, messages: 15 },
  { id: 'd9', title: 'Home network troubleshooting', text: 'Home network troubleshooting router wifi speed connection', days: 12, messages: 20 },
  { id: 'd10', title: 'Database indexing strategy', text: 'Database indexing strategy query performance scaling design', days: 8, messages: 29 },
];

function buildDemoData(): { nodes: MemoryNode[]; clusters: MemoryCluster[] } {
  const now = Date.now();
  const docs = DEMO_TOPICS.map((t) => ({ id: t.id, text: t.text }));
  const vectors = computeTfIdf(docs);
  const clusters = clusterConversations(vectors);
  const memberCluster = new Map<string, string>();
  for (const c of clusters) for (const id of c.memberIds) memberCluster.set(id, c.id);

  const nodes: MemoryNode[] = DEMO_TOPICS.map((t) => {
    const clusterId = memberCluster.get(t.id) ?? 'cluster-0';
    const anchor = anchorForCluster(clusterId);
    const offset = nodeOffset(t.id);
    const position: [number, number, number] = [anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]];
    const conversation: Conversation = {
      id: t.id,
      user_id: 'demo',
      title: t.title,
      is_generating: false,
      active_model: null,
      is_pinned: false,
      is_temporary: false,
      created_at: new Date(now - t.days * 86_400_000).toISOString(),
      updated_at: new Date(now - t.days * 86_400_000).toISOString(),
    };
    return { conversation, position, recency: 1 - t.days / 14, weight: Math.sqrt(t.messages), clusterId };
  });

  const memoryClusters: MemoryCluster[] = clusters.map((c) => ({
    id: c.id,
    label: clusterLabel(c),
    position: anchorForCluster(c.id),
    size: c.memberIds.length,
  }));

  return { nodes, clusters: memoryClusters };
}

/** Landing-page showcase of Conversation DNA — a real embedded GalaxyScene with illustrative demo data, not live user data. */
export function MemoryMapShowcase() {
  const { nodes, clusters } = useMemo(buildDemoData, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sceneRef, sceneHasBeenInView, sceneIsCurrentlyInView] = useInView<HTMLDivElement>();

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-ink-primary-light dark:text-ink-primary"
        style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}
      >
        Your knowledge, mapped in 3D
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-ink-secondary-light dark:text-ink-secondary"
        style={{ fontSize: 15, textAlign: 'center', maxWidth: 560, margin: '0 auto 32px' }}
      >
        Every conversation becomes a glowing star, automatically clustered by topic. This is illustrative sample data — drag to rotate, scroll to zoom.
      </motion.p>
      <motion.div
        ref={sceneRef}
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="border-border-light dark:border-border"
        style={{ height: 440, borderRadius: 24, border: '1px solid', overflow: 'hidden' }}
      >
        {sceneHasBeenInView && (
          <GalaxyScene
            nodes={nodes}
            clusters={clusters}
            selectedId={selectedId}
            focusPosition={null}
            onSelectNode={(n) => setSelectedId(n.conversation.id)}
            enableZoom={false}
            active={sceneIsCurrentlyInView}
          />
        )}
      </motion.div>
    </div>
  );
}
