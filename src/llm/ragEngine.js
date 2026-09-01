import fs from 'node:fs/promises';

export async function retrieveRelevantFiling(query, filePath = 'sample_data/sample_sebi_filing.txt', limit = 4) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const terms = String(query).toLowerCase().match(/[a-z]{4,}/g) || [];
    return text.split(/\n+/).map((line, index) => ({ line: index + 1, text: line.trim() }))
      .filter(x => x.text)
      .map(x => ({ ...x, score: terms.reduce((n, term) => n + (x.text.toLowerCase().includes(term) ? 1 : 0), 0) }))
      .sort((a, b) => b.score - a.score || a.line - b.line)
      .slice(0, limit)
      .map(({ line, text }) => ({ source: 'sample_sebi_filing.txt', line, quote: text }));
  } catch (error) {
    return [{ source: 'system', line: null, quote: 'Filing unavailable: ' + error.message }];
  }
}
