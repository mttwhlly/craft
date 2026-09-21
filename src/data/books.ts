export interface Book {
  slug: string;
  title: string;
  author: string;
  seed: number;
}

// Titles and authors are public facts (as listed on press.stripe.com);
// no cover art, cover copy, or other creative text is reproduced here —
// every cover on this site is generated at runtime, see ../cover.ts.
function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

const RAW: [string, string][] = [
  ["Built to Grow", "Stephanie Friedman"],
  ["Poor Charlie’s Almanack", "Edited by Peter D. Kaufman"],
  ["Maintenance", "Stewart Brand"],
  ["The Origins of Efficiency", "Brian Potter"],
  ["The Scaling Era", "Dwarkesh Patel"],
  ["Boom", "Byrne Hobart"],
  ["Scaling People", "Claire Hughes Johnson"],
  ["Pieces of the Action", "Vannevar Bush"],
  ["Where Is My Flying Car?", "J. Storrs Hall"],
  ["The Big Score", "Michael S. Malone"],
  ["Scientific Freedom", "Donald W. Braben"],
  ["Working in Public", "Nadia Eghbal"],
  ["The Art of Doing Science and Engineering", "Richard W. Hamming"],
  ["The Making of Prince of Persia", "Jordan Mechner"],
  ["Get Together", "Bailey Richardson, Kevin Huynh & Kai Elmer Sotto"],
  ["An Elegant Puzzle", "Will Larson"],
  ["The Revolt of the Public", "Martin Gurri"],
  ["Stubborn Attachments", "Tyler Cowen"],
  ["The Dream Machine", "M. Mitchell Waldrop"],
  ["High Growth Handbook", "Elad Gil"],
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const BOOKS: Book[] = RAW.map(([title, author]) => ({
  slug: slugify(title),
  title,
  author,
  seed: seedFrom(title),
}));

export function findBook(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}
