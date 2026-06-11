// Items lookup from the CSV catalog
// Fetches and parses the CSV once, then provides lookup by Item ID or EZ Number

// const CSV_URL = '8cf0b22f3_Items.csv';
const CSV_URL = `${new URL(import.meta.env.VITE_API_URL).origin}/static/8cf0b22f3_Items.csv`;
/**TODO:Upload the CSV to your own S3 bucket and update the URL
Serve it from Express: app.use('/static', express.static('public')) and put the CSV in backend/public/
Just keep the URL temporarily until you re-host it */
let cachedLookup = null;

function parseCSV(text) {
  const lines = text.split('\n');

  const byItemId = {};
  const byEzNumber = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    const itemId = cols[0]?.trim();
    const ezNumber = cols[1]?.trim();
    const name = cols[2]?.trim();
    const extDesc = cols[3]?.trim();
    const basePrice = cols[5]?.trim();

    if (!itemId || name?.includes('*****')) continue;

    const entry = {
      item_id: itemId,
      ez_number: ezNumber,
      name: name || '',
      description: extDesc ? `${name} - ${extDesc}` : name || '',
      base_price: parseFloat(basePrice) || 0,
    };

    byItemId[itemId.toLowerCase()] = entry;
    if (ezNumber) {
      byEzNumber[ezNumber.toLowerCase()] = entry;
    }
  }

  return { byItemId, byEzNumber };
}

export async function getItemsLookup() {
  if (cachedLookup) return cachedLookup;
  const response = await fetch(CSV_URL);
  const text = await response.text();
  cachedLookup = parseCSV(text);
  return cachedLookup;
}

export function lookupItem(lookup, query) {
  if (!query || !lookup) return null;
  const q = query.trim().toLowerCase();
  return lookup.byItemId[q] || lookup.byEzNumber[q] || null;
}