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

  constructor(gematriaData: Map<string, number>) {
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
        const gematria = this.gematriaData.get(letter) || 0; // Get gematria from provided data
        this.addNode({
          letter,
          gematria: gematria,
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
  breadthFirstSearch(startLetter: string, callback: (node: HebrewLetterNode) => void): void {
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
   * Maps a calculated island Gematria value to its corresponding tier name.
   * @param gematriaValue The combined Gematria value of an island.
   * @returns The name of the tier ("Tier 1", "Tier 2", etc.) or undefined if the value does not match a tier.
   */
  getTierByIslandGematria(gematriaValue: number): string | undefined {
    switch (gematriaValue) {
      case 547:
        return "Tier 1";
      case 500:
        return "Tier 2";
      case 287:
        return "Tier 3";
      case 81:
        return "Tier 4";
      case 80:
        return "Tier 5";
      default:
        return undefined;
    }
  }

  /**
   * Calculates the Gematria for all identified islands and returns them with their corresponding tiers.
   * @returns An array of objects, each containing the island name, its gematria, and its corresponding tier.
   */
  getAllIslandTiers(): { islandName: string; gematria: number | undefined; tier: string | undefined }[] {
    const islandTiers: { islandName: string; gematria: number | undefined; tier: string | undefined }[] = [];
    const islandNames = this.getAllIslandNames();

    for (const islandName of islandNames) {
      const gematria = this.calculateIslandGematria(islandName);
      const tier = gematria !== undefined ? this.getTierByIslandGematria(gematria) : undefined;
      islandTiers.push({
        islandName,
        gematria,
        tier,
      });
    }
    return islandTiers;
  }

  /**
   * Identifies disconnected subgraphs ("islands") in the network.
   * This is a simplified approach based on the provided spelling relationships.
   * A more robust graph algorithm might be needed for a truly disconnected component analysis
   * if nodes can exist without being part of any spelling.
   * For this model, we'll identify letters that don't appear in the 'spelling' array
   * of any other letter, plus the components reachable from letters that are
 * starting points in the spelling relationships and calculate their Gematria.
   * @returns An array of objects, where each object represents an island/subgraph
   * and contains a list of letter nodes and their combined Gematria value.
   */
  identifyAndCalculateIslands(): { nodes: HebrewLetterNode[], totalGematria: number }[] {
    const visited = new Set<string>();
    const islands: Set<Set<string>> = new Set();
    const lettersInSpellings = new Set<string>();

    // Identify all letters that appear in any spelling
    this.nodes.forEach(node => {
      node.spelling.forEach(letter => lettersInSpellings.add(letter));
    });

    // Identify isolated nodes (those not part of any spelling and not spelling themselves)
    // and perform DFS from any unvisited node to find connected components.
    this.nodes.forEach(node => {
      if (!visited.has(node.letter)) {
        const island = new Set<string>();
        this.dfs(node.letter, (visitedNode) => island.add(visitedNode.letter), visited);
        if (island.size > 0) islands.add(island);
      }
    });

    // Convert sets of letters into the desired output format with nodes and total Gematria
    const result: { nodes: HebrewLetterNode[], totalGematria: number }[] = [];
    islands.forEach(islandSet => {
      const islandNodes: HebrewLetterNode[] = [];
      let totalGematria = 0;
      islandSet.forEach(letter => {
        const node = this.getNode(letter);
        if (node) {
          islandNodes.push(node);
          totalGematria += node.gematria;
        }
      });
      result.push({
        nodes: islandNodes,
        totalGematria: totalGematria
      });
    });

    return result;
  }

  /**
   * Returns the Hebrew letters belonging to a specific island.
   * @param islandName The name of the island (e.g., "Primary Chain", "Aleph-Pey Loop").
   * @returns An array of Hebrew letters in the island, or undefined if the name is not recognized.
   */
  getIslandLetters(islandName: string): string[] | undefined {
    switch (islandName) {
      case "Primary Chain":
        return ["ז", "י", "נ", "ו", "ד", "ל", "ת", "מ"];
      case "Aleph-Pey Loop":
        return ["א", "פ"];
      case "Resh-Shin Island":
        return ["ר", "ש"];
      case "Samekh-Kaf Island":
        return ["ס", "כ"];
      case "Isolated Letters":
        return ["ב", "ג", "ה", "ח", "ט", "ע", "צ", "ק"];
      default:
        return undefined;
    }
  }

  /**
   * Calculates the combined Gematria value of a specific island.
   * @param islandName The name of the island.
   * @returns The total Gematria value of the island, or undefined if the island name is not recognized or a letter is not found.
   */
  calculateIslandGematria(islandName: string): number | undefined {
    const islandLetters = this.getIslandLetters(islandName);
    if (!islandLetters) {
      console.warn(`Island "${islandName}" not recognized.`);
      return undefined;
    }

    let totalGematria = 0;
    for (const letter of islandLetters) {
      const node = this.getNode(letter);
      if (node) {
        totalGematria += node.gematria;
      } else {
        console.warn(`Letter "${letter}" in island "${islandName}" not found in the network.`);
        return undefined; // Or handle this case differently
      }
    }
    return totalGematria;
  }

  /**
   * Returns an array of all defined island names.
   * @returns A string array of island names.
   */
  getAllIslandNames(): string[] {
    return ["Primary Chain", "Aleph-Pey Loop", "Resh-Shin Island", "Samekh-Kaf Island", "Isolated Letters"];
  }

  /**
   * Searches the network to find the Aleph-Pey loop (א -> פ -> א).
   * @returns An array of string arrays, where each inner array represents a path in the loop.
   */
  findAlephPeyLoop(): string[][] {
    const loops: string[][] = [];
    const alephNode = this.getNode('א');
    const peyNode = this.getNode('פ');

    if (alephNode && peyNode) {
      // Check for א -> פ
      if (alephNode.spelling.includes('פ')) {
        // Check for פ -> א
        if (peyNode.spelling.includes('א')) {
          loops.push(['א', 'פ']);
          loops.push(['פ', 'א']);
        }
      }
    }
    return loops;
  }

  /**
   * Identifies letters in the network whose spelling includes themselves, specifically 'מ' (Mem) and 'ו' (Vav).
   * @returns An array of strings, listing the letters that have self-loops.
   */
  findSelfLoops(): string[] {
    const selfLoops: string[] = [];
    const memNode = this.getNode('מ');
    const vavNode = this.getNode('ו');

    if (memNode && memNode.spelling.includes('מ')) {
      selfLoops.push('מ');
    }
    if (vavNode && vavNode.spelling.includes('ו')) {
      selfLoops.push('ו');
    }
    return selfLoops;
  }

  /**
   * Returns the string 'י' if a node for Yud exists in the network, indicating it as the defined hub.
   * @returns The string 'י' if Yud exists, otherwise undefined.
   */
  getYudHub(): string | undefined {
    return this.nodes.has('י') ? 'י' : undefined;
  }
}
const standardGematria: Map<string, number> = new Map();
standardGematria.set("א", 1);
standardGematria.set("ב", 2);
standardGematria.set("ג", 3);
standardGematria.set("ד", 4);
standardGematria.set("ה", 5);
standardGematria.set("ו", 6);
standardGematria.set("ז", 7);
standardGematria.set("ח", 8);
standardGematria.set("ט", 9);
standardGematria.set("י", 10);
standardGematria.set("כ", 20);
standardGematria.set("ל", 30);
standardGematria.set("מ", 40);
standardGematria.set("נ", 50);
standardGematria.set("ס", 60);
standardGematria.set("ע", 70);
standardGematria.set("פ", 80);
standardGematria.set("צ", 90);
standardGematria.set("ק", 100);
standardGematria.set("ר", 200);
standardGematria.set("ש", 300);
standardGematria.set("ת", 400);
standardGematria.set("ך", 500);
standardGematria.set("ם", 600);
standardGematria.set("ן", 700);
standardGematria.set("ף", 800);
standardGematria.set("ץ", 900);
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

export const hebrewAlphabetNetwork = new HebrewAlphabetNetwork(standardGematria);
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