import hebrewAlphabetData from '../data/hebrewAlphabetData.json';

interface HebrewLetterData {
  hebrew: string;
  transliteration_key: string;
  standard_gematria: number;
  traditional_spelling: string[];
  full_value_gematria: number;
  network_connections: string[];
  island: string;
  color: string;
}

const alphabetData: { [key: string]: HebrewLetterData } = hebrewAlphabetData;

/**
 * Calculates the Standard Gematria value of a given string.
 * Supports both Hebrew characters and transliterated English keys from the data structure.
 * Ignores characters that are not Hebrew letters.
 * @param inputText The string to calculate Gematria for.
 * @returns The Standard Gematria value.
 */
export function calculateStandardGematria(inputText: string): number {
  let totalGematria = 0;
  const lowerInputText = inputText.toLowerCase();

  const hebrewToKeyMap: { [key: string]: string } = {};
  for (const key in alphabetData) {
    hebrewToKeyMap[alphabetData[key].hebrew.toLowerCase()] = key;
  }

  for (const char of lowerInputText) {
    let letterKey: string | undefined;

    if (hebrewToKeyMap[char]) {
      letterKey = hebrewToKeyMap[char];
    } else if (alphabetData[char]) {
      letterKey = char;
    }

    if (letterKey && alphabetData[letterKey]) {
      totalGematria += alphabetData[letterKey].standard_gematria;
    } else {
      // Optional: Handle characters that are not Hebrew letters
      // console.warn(`Character "${char}" is not a recognized Hebrew letter or transliteration key and will be ignored.`);
    }
  }

  return totalGematria;
}

/**
 * Calculates the Full Value Gematria of a given string.
 * Supports both Hebrew characters and transliterated English keys.
 * Ignores characters that are not Hebrew letters.
 * @param inputText The string to calculate Gematria for.
 * @returns The Full Value Gematria value.
 */
export function calculateFullValueGematria(inputText: string): number {
  let totalFullGematria = 0;
  const lowerInputText = inputText.toLowerCase();

  const hebrewToKeyMap: { [key: string]: string } = {};
  for (const key in alphabetData) {
    hebrewToKeyMap[alphabetData[key].hebrew.toLowerCase()] = key;
  }

  for (const char of lowerInputText) {
    let letterKey: string | undefined;

    if (hebrewToKeyMap[char]) {
      letterKey = hebrewToKeyMap[char];
    } else if (alphabetData[char]) {
      letterKey = char;
    }

    if (letterKey && alphabetData[letterKey]) {
      totalFullGematria += alphabetData[letterKey].full_value_gematria;
    } else {
      // Optional: Handle characters that are not Hebrew letters
      // console.warn(`Character "${char}" is not a recognized Hebrew letter or transliteration key and will be ignored.`);
    }
  }

  return totalFullGematria;
}