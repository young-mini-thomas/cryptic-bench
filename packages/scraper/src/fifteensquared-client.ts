// Fetch clues from fifteensquared.net - fresh daily Guardian solutions
// This provides up-to-date clues with answers from the blog

const FEED_URL = 'https://www.fifteensquared.net/feed/';
const USER_AGENT = 'CrypticBench/1.0 (https://github.com/yourusername/cryptic-bench)';

export interface FifteensquaredClue {
  clueNumber: string;
  direction: 'across' | 'down';
  clueText: string;
  answer: string;
  letterCount: string;
}

export interface FifteensquaredPuzzle {
  url: string;
  title: string;
  guardianNumber: number;
  setter: string;
  publicationDate: string;
  clues: FifteensquaredClue[];
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  category: string;
}

/**
 * Parse RSS feed XML to extract Guardian puzzle links
 */
function parseRssFeed(xml: string): RssItem[] {
  const items: RssItem[] = [];

  // Simple regex-based XML parsing for RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = itemXml.match(/<title>([^<]*)<\/title>/)?.[1] || '';
    const link = itemXml.match(/<link>([^<]*)<\/link>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1] || '';
    const category = itemXml.match(/<category><!\[CDATA\[([^\]]*)\]\]><\/category>/)?.[1] || '';

    items.push({ title, link, pubDate, category });
  }

  return items;
}

/**
 * Fetch recent Guardian puzzles from Fifteensquared RSS feed
 */
export async function fetchRecentGuardianPuzzles(limit = 10): Promise<Array<{ title: string; url: string; date: string }>> {
  try {
    const response = await fetch(FEED_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      console.error(`RSS feed returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = parseRssFeed(xml);

    // Filter for Guardian cryptic puzzles
    const guardianItems = items.filter(item =>
      item.category.toLowerCase() === 'guardian' &&
      item.title.toLowerCase().includes('guardian')
    );

    return guardianItems.slice(0, limit).map(item => ({
      title: item.title,
      url: item.link,
      date: item.pubDate,
    }));
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return [];
  }
}

/**
 * Extract puzzle number and setter from title
 * Examples:
 *   "Guardian 29,890 – Ramsay" -> { number: 29890, setter: "Ramsay" }
 *   "Guardian Cryptic crossword No 29,889 by Omnibus" -> { number: 29889, setter: "Omnibus" }
 */
function parsePuzzleTitle(title: string): { number: number; setter: string } {
  // Try patterns like "Guardian 29,890 – Ramsay" or "Guardian 29890 - Ramsay"
  let match = title.match(/Guardian\s+(?:Cryptic\s+crossword\s+No\s+)?(\d[\d,]*)\s*[–-]\s*(.+)/i);
  if (match) {
    return {
      number: parseInt(match[1].replace(/,/g, ''), 10),
      setter: match[2].trim(),
    };
  }

  // Try pattern "Guardian Cryptic crossword No 29,889 by Omnibus"
  match = title.match(/Guardian.*?(\d[\d,]*)\s+by\s+(.+)/i);
  if (match) {
    return {
      number: parseInt(match[1].replace(/,/g, ''), 10),
      setter: match[2].trim(),
    };
  }

  // Fallback: just try to find a number
  const numMatch = title.match(/(\d[\d,]+)/);
  return {
    number: numMatch ? parseInt(numMatch[1].replace(/,/g, ''), 10) : 0,
    setter: 'Unknown',
  };
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8209;/g, '-')  // Non-breaking hyphen
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

/**
 * Parse clue table HTML to extract clues
 * Supports two formats:
 * 1. Old format with cellpadding="3" and <font color='blue'>
 * 2. New format with class="fts-table" and CSS-styled spans
 */
function parseClueTable(html: string): FifteensquaredClue[] {
  // Try Format 1: cellpadding="3" tables
  let clues = parseFormat1(html);
  if (clues.length > 0) return clues;

  // Try Format 2: fts-table class
  clues = parseFormat2(html);
  if (clues.length > 0) return clues;

  return [];
}

/**
 * Format 1: Old style with cellpadding="3" and <font color='blue'>
 */
function parseFormat1(html: string): FifteensquaredClue[] {
  const clues: FifteensquaredClue[] = [];

  const tableMatch = html.match(/<table[^>]*cellpadding="3"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  let currentDirection: 'across' | 'down' = 'across';

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];

    if (/<b>Across<\/b>/i.test(rowHtml)) {
      currentDirection = 'across';
      continue;
    }
    if (/<b>Down<\/b>/i.test(rowHtml)) {
      currentDirection = 'down';
      continue;
    }

    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
    }

    if (cells.length < 3) continue;

    const clueNumber = cells[0].replace(/<[^>]*>/g, '').trim();
    if (!/^\d+/.test(clueNumber)) continue;

    const answerMatch = cells[1].match(/<b>([^<]+)<\/b>/i);
    if (!answerMatch) continue;
    const answer = decodeHtmlEntities(answerMatch[1])
      .replace(/[^A-Z\s-]/gi, '')
      .toUpperCase()
      .trim();

    const clueMatch = cells[2].match(/<font[^>]*color=['"]?blue['"]?[^>]*>([\s\S]*?)<\/font>/i);
    if (!clueMatch) continue;

    let clueText = clueMatch[1]
      .replace(/<[^>]*>/g, '')  // Remove all HTML tags
      .trim();
    clueText = decodeHtmlEntities(clueText);

    const letterCountMatch = clueText.match(/\((\d+(?:[,\-]\d+)*)\)\s*$/);
    let letterCount = '';
    if (letterCountMatch) {
      letterCount = `(${letterCountMatch[1]})`;
      clueText = clueText.replace(/\s*\(\d+(?:[,\-]\d+)*\)\s*$/, '').trim();
    } else {
      const cleanAnswer = answer.replace(/[^A-Z]/gi, '');
      letterCount = `(${cleanAnswer.length})`;
    }

    clues.push({
      clueNumber: clueNumber.split(/[,\s]/)[0],  // Take first number if multiple
      direction: currentDirection,
      clueText,
      answer: answer.replace(/[^A-Z]/gi, ''),
      letterCount,
    });
  }

  return clues;
}

/**
 * Format 2: New style with class="fts-table" and CSS classes
 * Structure:
 * <div class=" fts fts-table fts-spacing-medium">
 *   <table><tbody>
 *     <tr><td class=" fts-group" colspan="3">ACROSS</td></tr>
 *     <tr>
 *       <td class=" fts-subgroup"><span>1</span></td>
 *       <td class=" fts-subgroup"><span style="color: #0000ff;font-weight: bold">ANSWER</span></td>
 *       <td class=" fts-subgroup"><div><span>clue text</span><span>(6)</span></div></td>
 *     </tr>
 *   </tbody></table>
 * </div>
 */
function parseFormat2(html: string): FifteensquaredClue[] {
  const clues: FifteensquaredClue[] = [];

  // Find fts-table div - use greedy match to get entire table
  const ftsMatch = html.match(/<div[^>]*class="[^"]*fts-table[^"]*"[^>]*>[\s\S]*?<table>([\s\S]*?)<\/table>/i);
  if (!ftsMatch) return [];

  const tableHtml = ftsMatch[1];
  let currentDirection: 'across' | 'down' = 'across';

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];

    // Check for section header (fts-group class)
    if (/fts-group[^>]*>ACROSS/i.test(rowHtml)) {
      currentDirection = 'across';
      continue;
    }
    if (/fts-group[^>]*>DOWN/i.test(rowHtml)) {
      currentDirection = 'down';
      continue;
    }

    // Check if this row has fts-subgroup cells with clue data
    if (!rowHtml.includes('fts-subgroup')) continue;

    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
    }

    // Skip explanation rows (they have colspan and no clue number)
    if (cells.length < 3) continue;

    // Extract clue number from first cell
    const clueNumber = cells[0].replace(/<[^>]*>/g, '').trim();
    if (!/^\d+/.test(clueNumber)) continue;

    // Extract answer from second cell (bold blue span)
    const answerMatch = cells[1].match(/<span[^>]*style="[^"]*color:\s*#0000ff[^"]*"[^>]*>([^<]+)<\/span>/i);
    if (!answerMatch) continue;

    const answer = decodeHtmlEntities(answerMatch[1])
      .replace(/[^A-Z\s-]/gi, '')
      .toUpperCase()
      .trim();

    // Extract clue text from third cell
    // The clue is in a div with multiple spans - we need to combine them
    // and extract the letter count at the end
    const thirdCell = cells[2] || '';

    // Get all text from the cell, stripping HTML
    let fullClueText = thirdCell
      .replace(/<[^>]*>/g, ' ')  // Replace tags with spaces
      .replace(/\s+/g, ' ')       // Collapse whitespace
      .trim();
    fullClueText = decodeHtmlEntities(fullClueText);

    // Extract letter count from end
    const letterCountMatch = fullClueText.match(/\((\d+(?:[,\-]\d+)*)\)\s*$/);
    let letterCount = '';
    let clueText = fullClueText;

    if (letterCountMatch) {
      letterCount = `(${letterCountMatch[1]})`;
      clueText = fullClueText.replace(/\s*\(\d+(?:[,\-]\d+)*\)\s*$/, '').trim();
    } else {
      const cleanAnswer = answer.replace(/[^A-Z]/gi, '');
      letterCount = `(${cleanAnswer.length})`;
    }

    if (!answer) continue;

    clues.push({
      clueNumber: clueNumber.split(/[,\s]/)[0],
      direction: currentDirection,
      clueText: clueText || '(clue text not found)',
      answer: answer.replace(/[^A-Z]/gi, ''),
      letterCount,
    });
  }

  return clues;
}

/**
 * Fetch and parse a puzzle page from Fifteensquared
 */
export async function fetchPuzzle(url: string): Promise<FifteensquaredPuzzle | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      console.error(`Puzzle page returned ${response.status}: ${url}`);
      return null;
    }

    const html = await response.text();

    // Extract title from HTML and decode entities
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    let fullTitle = titleMatch?.[1] || '';
    // Remove "- Fifteensquared" suffix and decode entities
    fullTitle = fullTitle.replace(/\s*[–-]\s*Fifteensquared.*$/i, '').trim();
    fullTitle = decodeHtmlEntities(fullTitle);

    const { number, setter } = parsePuzzleTitle(fullTitle);
    // Clean setter name (remove any remaining "- Fifteensquared" text)
    const cleanSetter = setter.replace(/\s*-\s*Fifteensquared.*$/i, '').trim();

    // Extract publication date from URL or meta
    // URL pattern: /2025/12/30/guardian-29890-ramsay/
    const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    const publicationDate = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      : new Date().toISOString().split('T')[0];

    // Parse clues
    const clues = parseClueTable(html);

    if (clues.length === 0) {
      console.error(`No clues found in puzzle: ${url}`);
      return null;
    }

    return {
      url,
      title: fullTitle,
      guardianNumber: number,
      setter: cleanSetter,
      publicationDate,
      clues,
    };
  } catch (error) {
    console.error(`Error fetching puzzle ${url}:`, error);
    return null;
  }
}

/**
 * Fetch multiple recent Guardian puzzles
 */
export async function fetchRecentPuzzles(options: {
  limit?: number;
  verbose?: boolean;
} = {}): Promise<FifteensquaredPuzzle[]> {
  const { limit = 5, verbose = false } = options;

  if (verbose) {
    console.log('Fetching recent puzzles from Fifteensquared RSS...');
  }

  const puzzleLinks = await fetchRecentGuardianPuzzles(limit);

  if (verbose) {
    console.log(`Found ${puzzleLinks.length} Guardian puzzles in RSS feed`);
  }

  const puzzles: FifteensquaredPuzzle[] = [];

  for (const link of puzzleLinks) {
    if (verbose) {
      console.log(`  Fetching: ${link.title}`);
    }

    const puzzle = await fetchPuzzle(link.url);
    if (puzzle) {
      puzzles.push(puzzle);
    }

    // Rate limit
    await sleep(500);
  }

  return puzzles;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
