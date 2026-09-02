// Benchmark Aho-Corasick implementation in JS/TS
class AhoCorasickNode {
  children: Map<string, AhoCorasickNode> = new Map();
  fail: AhoCorasickNode | null = null;
  outputs: string[] = [];
}

class AhoCorasick {
  root: AhoCorasickNode = new AhoCorasickNode();

  constructor(keywords: string[]) {
    this.buildTrie(keywords);
    this.buildFailureLinks();
  }

  private buildTrie(keywords: string[]) {
    for (const word of keywords) {
      let node = this.root;
      for (const char of word.toLowerCase()) {
        if (!node.children.has(char)) {
          node.children.set(char, new AhoCorasickNode());
        }
        node = node.children.get(char)!;
      }
      node.outputs.push(word);
    }
  }

  private buildFailureLinks() {
    const queue: AhoCorasickNode[] = [];
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const [char, child] of curr.children.entries()) {
        let f = curr.fail;
        while (f && !f.children.has(char)) {
          f = f.fail;
        }
        child.fail = f ? f.children.get(char)! : this.root;
        child.outputs = [...child.outputs, ...child.fail.outputs];
        queue.push(child);
      }
    }
  }

  search(text: string): { keyword: string; index: number }[] {
    const results: { keyword: string; index: number }[] = [];
    let curr: AhoCorasickNode | null = this.root;
    const lower = text.toLowerCase();

    for (let i = 0; i < lower.length; i++) {
      const char = lower[i];
      while (curr && curr !== this.root && !curr.children.has(char)) {
        curr = curr.fail;
      }
      curr = curr?.children.get(char) ?? this.root;
      if (curr.outputs.length > 0) {
        for (const out of curr.outputs) {
          results.push({ keyword: out, index: i - out.length + 1 });
        }
      }
    }
    return results;
  }
}

// Generate 5,000 toxic/blocked test patterns
const sampleKeywords: string[] = [];
for (let i = 0; i < 5000; i++) {
  sampleKeywords.push(`nsfw_keyword_${i}_toxic_${Math.random().toString(36).substring(2, 7)}`);
}
// Add some actual target words
sampleKeywords.push("explicit_porn", "hate_speech", "violence_gore", "gambling_scam");

console.log("Building Aho-Corasick Trie with 5,000 keywords...");
const startBuild = performance.now();
const ac = new AhoCorasick(sampleKeywords);
const endBuild = performance.now();
console.log(`Trie built in ${(endBuild - startBuild).toFixed(2)}ms`);

// Create simulated social media payload (2,000 chars)
const paragraph = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. User @creative_influencer posted a video about gaming, lifestyle, explicit_porn and fitness. Check out the latest trends on Instagram Reels and TikTok! `.repeat(12);
console.log(`Simulated text payload length: ${paragraph.length} chars`);

// Measure single search time
const iterations = 1000;
const startSearch = performance.now();
let totalMatches = 0;
for (let i = 0; i < iterations; i++) {
  const matches = ac.search(paragraph);
  totalMatches += matches.length;
}
const endSearch = performance.now();
const avgSearchTimeMs = (endSearch - startSearch) / iterations;
console.log(`Search iterations: ${iterations}`);
console.log(`Total matches found per run: ${totalMatches / iterations}`);
console.log(`Average search latency: ${avgSearchTimeMs.toFixed(4)}ms`);
console.log(`Theoretical max searches per second: ${(1000 / avgSearchTimeMs).toFixed(0)} ops/sec`);

