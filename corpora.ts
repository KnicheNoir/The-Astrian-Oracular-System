import { StrongsResult } from './types';

export interface StrongsEntry {
    originalWord: string;
    transliteration: string;
    definition: string;
}

/**
 * The list of available textual canons.
 * The actual text content is now decoded on-the-fly from the Source Stela.
 * @see steganography.ts
 */
export const corpusList = [
    "Tanakh (Hebrew OT)", 
    "New Testament (Greek)", 
    "Christian Old/New Testament (English KJV)", 
    "Apocrypha (English)", 
    "Ethiopian Orthodox Tewahedo Canon (English)"
];

/**
 * The URL for the source stela image. In a real application, this would be a
 * pre-encoded PNG file. Here, it is a placeholder as the decoding is simulated.
 */
export const SOURCE_STELA_URL = './source-stela.png';

// The raw corpora text is no longer stored here. It's now embedded and
// decoded steganographically. The Strong's Concordance remains here as
// it's a small, structured dataset not suitable for this encoding method.

export const strongsHebrewCorpus: Record<number, StrongsEntry> = {
  1: { originalWord: 'אָב', transliteration: 'ab', definition: 'father' },
  2: { originalWord: 'אַב', transliteration: 'ab', definition: 'father' },
  216: { originalWord: 'אוֹר', transliteration: "'or", definition: 'light, illumination, luminary' },
  3478: { originalWord: 'יִשְׂרָאֵל', transliteration: 'Yisrael', definition: 'Israel -- "God strives", the name of Jacob and his descendants' },
};

export const strongsGreekCorpus: Record<number, StrongsEntry> = {
  1: { originalWord: 'Α', transliteration: 'Alpha', definition: 'the first letter of the alphabet; signifies the beginning.' },
  2626: { originalWord: 'κατακλύζω', transliteration: 'katakluzó', definition: 'to inundate, deluge.' },
  3056: { originalWord: 'λόγος', transliteration: 'logos', definition: 'a word (as embodying an idea), a statement, a speech, the Divine Expression (i.e. Christ)' },
};