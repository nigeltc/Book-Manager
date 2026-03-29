import { db, locationsTable, booksTable } from "@workspace/db";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(__dirname, "../../attached_assets/basement-boxes_1774809865154.txt");

const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

// Parse the file into location -> books map
const locationBooks: Map<string, string[]> = new Map();
let currentLocation: string | null = null;
const locationDescriptions: Map<string, string> = new Map();

// Patterns that indicate a location header
// Locations have patterns like: "AOB1: Alex Office Books", "NB1: Books - 86s", "NBK1 - Books", "N22 - Books"
// They are either followed by "---" lines, or are standalone lines before book entries
const locationHeaderPattern = /^([A-Z][A-Z0-9]+(?:\d+)?(?::\s+.+|-\s+.+)?)$/;

// A book line has a semicolon separator: "Title;Author" or just "Title;"
// Note: some lines use comma as separator (bugs in original data)
function isBookLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Skip separator lines
  if (/^-+$/.test(trimmed)) return false;
  // Contains semicolon = book entry
  if (trimmed.includes(";")) return true;
  // Some book entries have no author and no semicolon at end - harder to detect
  return false;
}

function parseBookLine(line: string): { title: string; author: string | null } {
  const trimmed = line.trim();
  const semicolonIdx = trimmed.indexOf(";");
  if (semicolonIdx === -1) {
    return { title: trimmed, author: null };
  }
  const title = trimmed.substring(0, semicolonIdx).trim();
  const author = trimmed.substring(semicolonIdx + 1).trim() || null;
  return { title, author };
}

function isLocationHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  
  // Match patterns like: AOB1: Text, NB1: Text, NBK1 - Text, N22 - Text, K3 - Text
  // Must start with capital letters/numbers followed by colon or dash
  const match = trimmed.match(/^([A-Z]{1,4}\d+(?:\.\d+)?)\s*(?::\s*(.+)|-\s*(.+))?$/);
  if (match) {
    const code = match[1];
    const desc = (match[2] || match[3] || "").trim();
    return desc ? `${code}: ${desc}` : code;
  }
  return null;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  if (!trimmed) continue;
  
  // Check if this is a separator line (location header follows)
  if (/^-{3,}$/.test(trimmed)) continue;
  
  // Check if this looks like a location header
  const locName = isLocationHeader(trimmed);
  if (locName) {
    // Look ahead - if next non-empty line is a separator or a book, this is a location
    let isLoc = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) continue;
      if (/^-{3,}$/.test(nextLine)) { isLoc = true; break; }
      if (nextLine.includes(";")) { isLoc = true; break; }
      break;
    }
    
    if (isLoc) {
      currentLocation = locName;
      if (!locationBooks.has(currentLocation)) {
        locationBooks.set(currentLocation, []);
      }
      continue;
    }
  }
  
  // Book line
  if (currentLocation && isBookLine(trimmed)) {
    locationBooks.get(currentLocation)!.push(trimmed);
  }
}

console.log(`Found ${locationBooks.size} locations`);
let totalBooks = 0;
for (const [loc, books] of locationBooks) {
  console.log(`  ${loc}: ${books.length} books`);
  totalBooks += books.length;
}
console.log(`Total books: ${totalBooks}`);

// Insert into database
console.log("\nSeeding database...");

// Clear existing data
await db.delete(booksTable);
await db.delete(locationsTable);

const locationIdMap = new Map<string, number>();

for (const [locName, books] of locationBooks) {
  if (books.length === 0) continue;
  
  // Extract code and description
  const colonIdx = locName.indexOf(":");
  const name = colonIdx > -1 ? locName.substring(0, colonIdx).trim() : locName;
  const description = colonIdx > -1 ? locName.substring(colonIdx + 1).trim() : null;
  
  const [loc] = await db
    .insert(locationsTable)
    .values({ name, description })
    .returning();
  
  locationIdMap.set(locName, loc.id);
  
  const bookValues = books.map((bookLine) => {
    const { title, author } = parseBookLine(bookLine);
    return { title, author, locationId: loc.id };
  });
  
  if (bookValues.length > 0) {
    await db.insert(booksTable).values(bookValues);
  }
}

const locationCount = await db.$count(locationsTable);
const bookCount = await db.$count(booksTable);
console.log(`\nSeeded ${locationCount} locations and ${bookCount} books successfully!`);
process.exit(0);
