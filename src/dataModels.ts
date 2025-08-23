i do
// src/dataModels.ts
import { type } from "os";

/**
 * Interface representing a node in the Hebrew alphabet network.
 */
export interface HebrewLetterNode {
  letter: string; // The Hebrew letter itself
  gematria: number; // The standard/absolute Gematria value of the letter
  phonetic: string; // The phonetic representation of the letter
  spelling: string[]; // An array of letters that form the spelling of this letter
}

/**
 * Class representing the Hebrew alphabet network.
 */
export class HebrewAlphabetNetwork {
  private nodes: Map<string, HebrewLetterNode>;

  constructor() {
    this.nodes = new Map();
  }

  /**
   * Adds a new letter node to the network.
   * @param node The HebrewLetterNode to add.
   */
  addNode(node: HebrewLetterNode): void {
    if (!this.nodes.has(node.letter)) {
      this.nodes.set(node.letter, node);
    } else {
      console.warn(`Node for letter "${node.letter}" already exists.`);
    }
  }

  /**
   * Gets a letter node from the network by its letter.
   * @param letter The Hebrew letter of the node to retrieve.
   * @returns The HebrewLetterNode if found, otherwise undefined.
   */
  getNode(letter: string): HebrewLetterNode | undefined {
    return this.nodes.get(letter);
  }

  /**
   * Gets all nodes in the network.
   * @returns A Map of all HebrewLetterNodes.
   */
  getAllNodes(): Map<string, HebrewLetterNode> {
    return this.nodes;
  }

  /**
   * Populates the network with nodes and edges based on Hebrew letter spellings.
   * @param spellings A map where keys are Hebrew letters and values are arrays of Hebrew letters that spell the key letter.
   */
  populateNetwork(spellings: Map<string, string[]>): void {
    // First, ensure all unique letters from spellings are added as nodes
    const allLetters = new Set<string>();
    for (const [letter, spelling] of spellings.entries()) {
      allLetters.add(letter);
      spelling.forEach(l => allLetters.add(l));
    }

    // Add nodes for any letters that don't exist yet (with placeholder data if needed)
    allLetters.forEach(letter => {
      if (!this.nodes.has(letter)) {
        // Add a placeholder node - you'll need to add actual data later
        // For now, we'll add a placeholder for gematria as 0, which needs to be updated with real data.
        this.addNode({
          letter,
          gematria: 0, // Placeholder, needs to be updated with actual gematria
          phonetic: '', // Placeholder
          spelling: [] });
      }
    });

    // Then, establish the spelling relationships (edges)
    for (const [letter, spelling] of spellings.entries()) {
      const node = this.nodes.get(letter);
      if (node) {
        // Update the spelling property for the node
        node.spelling = spelling;
        // In a more complex graph implementation, you might add explicit edge objects here.
        // For this interface, the 'spelling' array implicitly defines the outgoing edges.
      }
    }
  }

  /**
 * Performs a Breadth-First Search (BFS) starting from a given letter.
 * @param startLetter The letter to start the BFS from.
 * @param callback A function to call for each visited node.
 */
  bfs(startLetter: string, callback: (node: HebrewLetterNode) => void): void {
    const startNode = this.getNode(startLetter);
    if (!startNode) {
      return;
    }

    const visited = new Set<string>();
    const queue: string[] = [startLetter];
    visited.add(startLetter);

    while (queue.length > 0) {
      const currentLetter = queue.shift()!; // Dequeue the first letter
      const currentNode = this.getNode(currentLetter)!;

      callback(currentNode);

      // Enqueue unvisited neighbors (letters in the spelling)
      for (const nextLetter of currentNode.spelling) {
        if (!visited.has(nextLetter)) {
          visited.add(nextLetter);
          queue.push(nextLetter);
        }
      }
    }
  }
  /**
   * Performs a Depth-First Search (DFS) starting from a given letter.
   * @param startLetter The letter to start the DFS from.
   * @param callback A function to call for each visited node.
   * @param visited (Optional) A Set to keep track of visited nodes during the traversal.
   */
  dfs(startLetter: string, callback: (node: HebrewLetterNode) => void, visited: Set<string> = new Set()): void {
 const startNode = this.getNode(startLetter);
    if (!startNode || visited.has(startLetter)) {
      return;
    }

    // Visit the current node
    visited.add(startLetter);
    callback(startNode);

    // Recursively visit neighbors (letters in the spelling)
    for (const nextLetter of startNode.spelling) {
      this.dfs(nextLetter, callback, visited);
    }
  }

  /**
   * Calculates the combined Gematria value of a sequence of Hebrew letters (a path).
   * Assumes standard/absolute Gematria values are stored in the node.
   * @param letters An array of Hebrew letters representing the path.
   * @returns The total Gematria value of the path, or 0 if any letter in the path is not found.
   */
  calculatePathGematria(letters: string[]): number {
    let totalGematria = 0;
    for (const letter of letters) {
      const node = this.getNode(letter);
      if (node) {
        totalGematria += node.gematria;
      } else {
        console.warn(`Letter "${letter}" not found in the network.`);
        return 0; // Or handle this case differently, e.g., throw an error
      }
    }
    return totalGematria;
  }

  /**
   * Calculates the combined Gematria value of a set of letters,
   * potentially representing an "island" or subgraph.
   * @param letters A Set or array of Hebrew letters in the island/subgraph.
   * @returns The total Gematria value of the letters in the set.
   */
  calculateSetGematria(letters: Set<string> | string[]): number {
    let totalGematria = 0;
    const letterSet = new Set(letters);
    letterSet.forEach(letter => {
      const node = this.getNode(letter);
      if (node) {
        totalGematria += node.gematria;
      } else {
        console.warn(`Letter "${letter}" not found in the network.`);
        // Continue with the rest of the letters, but log the warning
      }
    });
    return totalGematria;
  }

  /**
   * Identifies disconnected subgraphs ("islands") in the network.
   * This is a simplified approach based on the provided spelling relationships.
   * A more robust graph algorithm might be needed for a truly disconnected component analysis
   * if nodes can exist without being part of any spelling.
   * For this model, we'll identify letters that don't appear in the 'spelling' array
   * of any other letter, plus the components reachable from letters that are
   * starting points in the spelling relationships.
   * @returns An array of sets, where each set represents an island/subgraph.
   */
  findIslands(): Set<Set<string>> {
    const visited = new Set<string>();
    const islands: Set<Set<string>> = new Set();
    const lettersInSpellings = new Set<string>();

    // Identify all letters that appear in any spelling
    this.nodes.forEach(node => {
      node.spelling.forEach(letter => lettersInSpellings.add(letter));
    });

    // Identify isolated nodes (those not part of any spelling and not spelling themselves)
    this.nodes.forEach(node => {
        if (!lettersInSpellings.has(node.letter) && !node.spelling.includes(node.letter)) {
            if (!visited.has(node.letter)) {
                const island = new Set<string>();
                island.add(node.letter);
                visited.add(node.letter);
                islands.add(island);
            }
        }
    });

    // Perform DFS from unvisited nodes to find connected components (which could be islands or larger structures)
    this.nodes.forEach(node => {
      if (!visited.has(node.letter)) {
 const island = new Set<string>();
        this.dfs(node.letter, (visitedNode) => island.add(visitedNode.letter), visited);
        if (island.size > 0) islands.add(island);
      }
    });
    return islands;
  }
}

const hebrewSpellings = new Map<string, string[]>();
hebrewSpellings.set("א", ["א", "ל", "ף"]);
hebrewSpellings.set("ב", ["ב", "י", "ת"]);
hebrewSpellings.set("ג", ["ג", "י", "מ", "ל"]);
hebrewSpellings.set("ד", ["ד", "ל", "ת"]);
hebrewSpellings.set("ה", ["ה", "א"]);
hebrewSpellings.set("ו", ["ו", "ו"]);
hebrewSpellings.set("ז", ["ז", "י", "ן"]);
hebrewSpellings.set("ח", ["ח", "י", "ת"]);
hebrewSpellings.set("ט", ["ט", "י", "ת"]);
hebrewSpellings.set("י", ["י", "ו", "ד"]);
hebrewSpellings.set("כ", ["כ", "ף"]);
hebrewSpellings.set("ל", ["ל", "מ", "ד"]);
hebrewSpellings.set("מ", ["מ", "ם"]);
hebrewSpellings.set("נ", ["נ", "ו", "ן"]);
hebrewSpellings.set("ס", ["ס", "מ", "ך"]);
hebrewSpellings.set("ע", ["ע", "י", "ן"]);
hebrewSpellings.set("פ", ["פ", "א"]);
hebrewSpellings.set("צ", ["צ", "ד", "י"]);
hebrewSpellings.set("ק", ["ק", "ו", "ף"]);
hebrewSpellings.set("ר", ["ר", "י", "ש"]);
hebrewSpellings.set("ש", ["ש", "י", "ן"]);
hebrewSpellings.set("ת", ["ת", "ו"]); // Assuming Tav's spelling is Tav-Vav based on previous input

// Including final forms in the spellings data if they appear in the spellings
hebrewSpellings.set("ך", ["כ", "ף"]); // Final Kaf
hebrewSpellings.set("ם", ["מ", "ם"]); // Final Mem
hebrewSpellings.set("ן", ["נ", "ו", "ן"]); // Final Nun
hebrewSpellings.set("ף", ["פ", "א"]); // Final Pey
hebrewSpellings.set("ץ", ["צ", "ד", "י"]); // Final Tsade

export const hebrewAlphabetNetwork = new HebrewAlphabetNetwork();
hebrewAlphabetNetwork.populateNetwork(hebrewSpellings);

// --- Example Usage ---

console.log("--- DFS Example (Starting from Aleph) ---");
hebrewAlphabetNetwork.dfs('א', (node) => {
  console.log(`Visited: ${node.letter} (Gematria: ${node.gematria})`);
});
console.log("-----------------------------------------");

console.log("--- Calculate Path Gematria Example (Bet, Yud, Tav) ---");
const examplePath = ['ב', 'י', 'ת'];
const pathGematria = hebrewAlphabetNetwork.calculatePathGematria(examplePath);
console.log(`Gematria of path [${examplePath.join(', ')}]: ${pathGematria}`);
console.log("-----------------------------------------------------");

// --- End Example Usage ---