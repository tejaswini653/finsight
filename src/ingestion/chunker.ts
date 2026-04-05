export interface Chunk {
  text: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  wordCount: number;
}

export interface ChunkOptions {
  chunkSize?: number;    // words per chunk
  overlap?: number;      // words to overlap between chunks
}

// Splits a large document into smaller overlapping chunks.
// chunkSize: how many words per chunk (default 500)
// overlap: how many words to repeat between consecutive chunks (default 50)

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const chunkSize = options.chunkSize ?? 500;
  const overlap = options.overlap ?? 50;

  // Clean up whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");

  if (words.length === 0) return [];

  const chunks: Chunk[] = [];
  let i = 0;
  let chunkIndex = 0;

  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkText = chunkWords.join(" ");

    // Find the actual character positions in the original text
    const startChar = cleaned.indexOf(chunkWords[0], i > 0 ? chunks[chunks.length - 1].startChar : 0);
    const endChar = startChar + chunkText.length;

    chunks.push({
      text: chunkText,
      chunkIndex,
      startChar: Math.max(0, startChar),
      endChar,
      wordCount: chunkWords.length,
    });

    // Move forward by chunkSize minus overlap
    // This creates the sliding window effect
    i += chunkSize - overlap;
    chunkIndex++;
  }

  return chunks;
}

// Splits text by section headings first, then chunks each section.
// Better than blind word-count chunking for structured documents like 10-Ks
// because it keeps related content together.

export function chunkBySection(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  // Common SEC filing section patterns
  const sectionPattern = /(?:ITEM\s+\d+[A-Z]?\.?\s+[A-Z][A-Z\s]+)/g;
  const sections: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sectionPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      sections.push(text.slice(lastIndex, match.index).trim());
    }
    lastIndex = match.index;
  }

  // Push the last section
  if (lastIndex < text.length) {
    sections.push(text.slice(lastIndex).trim());
  }

  // If no sections found fall back to plain chunking
  if (sections.length <= 1) {
    return chunkText(text, options);
  }

  // Chunk each section independently then combine
  const allChunks: Chunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    if (section.length < 50) continue; // skip tiny sections
    const sectionChunks = chunkText(section, options);
    for (const chunk of sectionChunks) {
      allChunks.push({ ...chunk, chunkIndex: globalIndex++ });
    }
  }

  return allChunks;
}
