// Lightweight, free-tier-friendly conversation clustering — plain TF-IDF
// over each conversation's own text (title + first few messages), no
// embeddings API. Good enough to visually group similar conversations; not
// meant to be a rigorous topic model.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'for', 'with', 'as', 'by', 'at', 'from', 'that', 'this', 'these',
  'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'me', 'do', 'does',
  'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'have', 'has', 'had', 'what',
  'how', 'why', 'when', 'where', 'which', 'who', 'about', 'into', 'like', 'just', 'not', 'so',
  'if', 'than', 'then', 'there', 'here', 'their', 'them', 'please', 'thanks', 'hi', 'hello',
  'new', 'chat', 'conversation', 'temporary',
]);

export interface ConversationDoc {
  id: string;
  text: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** Top TF-IDF keyword vector per document, keyed by conversation id. */
export function computeTfIdf(docs: ConversationDoc[], topN = 6): Map<string, Map<string, number>> {
  const termsByDoc = new Map<string, string[]>();
  const docFrequency = new Map<string, number>();

  for (const doc of docs) {
    const terms = tokenize(doc.text);
    termsByDoc.set(doc.id, terms);
    const seen = new Set(terms);
    for (const term of seen) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
    }
  }

  const n = docs.length || 1;
  const result = new Map<string, Map<string, number>>();

  for (const doc of docs) {
    const terms = termsByDoc.get(doc.id) ?? [];
    const termFrequency = new Map<string, number>();
    for (const term of terms) termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);

    const scored = Array.from(termFrequency.entries()).map(([term, tf]) => {
      const df = docFrequency.get(term) ?? 1;
      const idf = Math.log(n / (1 + df)) + 1;
      return [term, tf * idf] as const;
    });
    scored.sort((a, b) => b[1] - a[1]);

    result.set(doc.id, new Map(scored.slice(0, topN)));
  }

  return result;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, weight] of a) {
    normA += weight * weight;
    const other = b.get(term);
    if (other) dot += weight * other;
  }
  for (const weight of b.values()) normB += weight * weight;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface Cluster {
  id: string;
  memberIds: string[];
  /** Averaged term weights across members — used both for assignment and for deriving the cluster's label. */
  centroid: Map<string, number>;
}

const SIMILARITY_THRESHOLD = 0.12;

/** Greedily assigns each conversation to the most similar existing cluster, or starts a new one. */
export function clusterConversations(vectors: Map<string, Map<string, number>>): Cluster[] {
  const clusters: Cluster[] = [];

  for (const [id, vector] of vectors) {
    let best: { cluster: Cluster; score: number } | null = null;
    for (const cluster of clusters) {
      const score = cosineSimilarity(vector, cluster.centroid);
      if (score > SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { cluster, score };
      }
    }

    if (best) {
      best.cluster.memberIds.push(id);
      // Fold the new member's weights into the running centroid average.
      const n = best.cluster.memberIds.length;
      const merged = new Map(best.cluster.centroid);
      for (const [term, weight] of vector) {
        merged.set(term, ((merged.get(term) ?? 0) * (n - 1) + weight) / n);
      }
      best.cluster.centroid = merged;
    } else {
      clusters.push({ id: `cluster-${clusters.length}`, memberIds: [id], centroid: new Map(vector) });
    }
  }

  return clusters;
}

/** The cluster's 1-2 most representative terms, for its floating label. */
export function clusterLabel(cluster: Cluster): string {
  const top = Array.from(cluster.centroid.entries()).sort((a, b) => b[1] - a[1]);
  return top
    .slice(0, 2)
    .map(([term]) => term)
    .join(' · ') || 'Misc';
}

// ── Deterministic, seeded positioning — nodes must stay put between visits ──

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Cluster anchors used to sit at a pure random point on the sphere per
 * cluster id — with only a handful of clusters, random placement regularly
 * put two or three anchors close enough together that their floating
 * labels overlapped into an illegible smear once projected to screen
 * space. Clusters are created with sequential ids ("cluster-0",
 * "cluster-1", ...), so instead we place them via a golden-angle spiral
 * indexed by that number, which guarantees even angular separation
 * regardless of how many clusters exist.
 */
export function anchorForCluster(clusterId: string, radius = 6): [number, number, number] {
  const match = clusterId.match(/cluster-(\d+)/);
  if (match) {
    const i = parseInt(match[1], 10);
    const slots = 12;
    const y = 1 - ((i % slots) / (slots - 1)) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;
    return [radius * ringRadius * Math.cos(theta), radius * y, radius * ringRadius * Math.sin(theta)];
  }
  const rand = seededRandom(hashString(clusterId));
  const theta = rand() * Math.PI * 2;
  const phi = Math.acos(rand() * 2 - 1);
  return [radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi)];
}

export function nodeOffset(conversationId: string, spread = 1.6): [number, number, number] {
  const rand = seededRandom(hashString(conversationId));
  return [(rand() - 0.5) * spread * 2, (rand() - 0.5) * spread * 2, (rand() - 0.5) * spread * 2];
}
