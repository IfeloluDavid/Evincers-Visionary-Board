// King James Version (public domain). One is shown per day in the app and one per reminder email.
export interface Verse {
  text: string;
  ref: string;
}

export const VERSES: Verse[] = [
  { ref: 'Habakkuk 2:2', text: 'Write the vision, and make it plain upon tables, that he may run that readeth it.' },
  { ref: 'Proverbs 16:3', text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
  { ref: 'Luke 14:28', text: 'For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { ref: 'Proverbs 21:5', text: 'The thoughts of the diligent tend only to plenteousness.' },
  { ref: 'Psalm 37:5', text: 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.' },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.' },
  { ref: 'Galatians 6:9', text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.' },
  { ref: 'Joshua 1:9', text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { ref: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary.' },
  { ref: 'Philippians 3:14', text: 'I press toward the mark for the prize of the high calling of God in Christ Jesus.' },
  { ref: 'Colossians 3:23', text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.' },
  { ref: 'Psalm 90:17', text: 'And establish thou the work of our hands upon us; yea, the work of our hands establish thou it.' },
  { ref: 'Proverbs 15:22', text: 'Without counsel purposes are disappointed: but in the multitude of counsellors they are established.' },
  { ref: 'Ecclesiastes 9:10', text: 'Whatsoever thy hand findeth to do, do it with thy might.' },
  { ref: '1 Thessalonians 5:18', text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
  { ref: 'Psalm 118:24', text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.' },
  { ref: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { ref: 'Proverbs 16:9', text: "A man's heart deviseth his way: but the LORD directeth his steps." },
  { ref: 'Psalm 32:8', text: 'I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye.' },
  { ref: 'Zechariah 4:10', text: 'For who hath despised the day of small things?' },
  { ref: 'Psalm 126:5', text: 'They that sow in tears shall reap in joy.' },
  { ref: 'Hebrews 12:1', text: 'Let us run with patience the race that is set before us.' },
  { ref: 'Psalm 107:1', text: 'O give thanks unto the LORD, for he is good: for his mercy endureth for ever.' },
  { ref: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
];

const DAY_MS = 86_400_000;

/** Deterministic: everyone sees the same verse on the same (UTC) day. */
export function verseForDay(now: Date): Verse {
  return VERSES[Math.floor(now.getTime() / DAY_MS) % VERSES.length]!;
}

/** Deterministic per ISO-ish week, used for reminder emails. */
export function verseForWeek(now: Date): Verse {
  return VERSES[Math.floor(now.getTime() / (7 * DAY_MS)) % VERSES.length]!;
}
