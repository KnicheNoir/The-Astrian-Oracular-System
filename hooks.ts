okimport { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GenerateContentResponse, Chat } from "@google/genai";
import { View, SessionRecord, EntrainmentProfile, AWEFormData, ELSResult, GuidingIntent, GeneralAnalysisResult, ExhaustiveResonanceResult, Toast, UserMessage, AIMessage, SystemMessage, ComponentMessage, BaseSessionRecord, TextualCartographerFormData, ELSInvestigatorFormData, AWEAnalysisResult, PalmistryAnalysisResult, VoiceResonanceAnalysisResult, AstrianDayPlannerResult, ProactiveSuggestion } from './types';
import { GeminiService, AstrianEngine } from './services';
import { hebraicCartographerSchema, hellenisticCartographerSchema, apocryphalAnalysisSchema, aweSynthesisSchema, palmistryAnalysisSchema, astrianDayPlannerSchema, aweExtractionSchema, voiceResonanceAnalysisSchema } from './constants';
import { decodeCorporaFromImage } from './steganography';
import { SOURCE_STELA_URL } from './corpora';
import { HebrewAlphabetNetwork, hebrewNetwork } from './src/dataModels'; // Corrected import path and added HebrewAlphabetNetwork type

/**
 * hooks.ts
 *
 * This file defines custom React hooks for the Astrian Key application.
 * The primary hook, `useAstrianSystem`, encapsulates the majority of the
 * application's state and logic, including session management, API calls,
 * and view routing. This greatly simplifies the main `App` component.
 */

const CALL_SIGN_VIEWS: { [key: string]: View } = {
    atc: 'atcForm',
    awe: 'aweForm',
    oracular: 'oracularLens',
    session: 'session',
    els: 'elsInvestigator',
    palm: 'palmistry',
    entrain: 'entrainmentSelection',
    voice: 'voiceAnalysis'
};

/** A hook to get the list of available books for a given corpus. */
export const useCorpusBooks = (selectedCorpus: string) => {
    return useMemo(() => {
        if (!AstrianEngine.isInitialized()) return [];
        return Object.keys(AstrianEngine.getCorpus(selectedCorpus));
    }, [selectedCorpus]);
};

// Helper function to calculate Gematria of a string
const calculateStringGematria = (text: string, network: HebrewAlphabetNetwork): number => {
    const cleaned = cleanText(text);
    return network.calculatePathGematria(cleaned.split(''));
};

// Helper function to remove non-letter characters and convert to lowercase
const cleanText = (text: string): string => {
    // This regex keeps only Hebrew letters
    const cleaned = text.replace(/[^א-ת]/g, '').toLowerCase();
    return cleaned;
};


// More explicit type for addMessage argument to help TS discriminated union inference
type AddMessageArg =
    | Omit<UserMessage, 'id' | 'timestamp'>
    | Omit<AIMessage, 'id' | 'timestamp'>
    | Omit<SystemMessage, 'id' | 'timestamp'>
    | Omit<ComponentMessage, 'id' | 'timestamp'>;

export const useAstrianSystem = () => {
    const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [crossRefValue, setCrossRefValue] = useState<number | null>(null);
    const [isCorporaInitialized, setIsCorporaInitialized] = useState(false);
    const [guidingIntent, setGuidingIntent] = useState<GuidingIntent>('Neutral');
    const [subliminalSeedValue, setSubliminalSeedValue] = useState(1);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
    const lastQueryRef = useRef<{ query: any, prompt: string, analysisType?: AIMessage['analysisType'] } | null>(null);
    const chatRef = useRef<Chat | null>(null);

    // State for the intelligent AWE "Astrian Signature"
    const [aweData, setAweData] = useState<AWEFormData>({ fullNameAtBirth: '', currentNameUsed: '', birthDate: '', birthTime: '', birthLocation: '', inflectionPoints: [], relationalNodeHarmonious: '', relationalNodeChallenging: '', geographicAnchor: '', centralQuestion: '' });

    // Toast notification state
    const [toasts, setToasts] = useState<Toast[]>([]);

    const isAweComplete = useMemo(() => !!(aweData.fullNameAtBirth && aweData.birthDate && aweData.birthTime && aweData.centralQuestion), [aweData]);
    const palmistryDone = useMemo(() => sessionHistory.some(msg => msg.type === 'ai' && msg.analysisType === 'palmistry'), [sessionHistory]);
    const voiceDone = useMemo(() => sessionHistory.some(msg => msg.type === 'ai' && msg.analysisType === 'voice'), [sessionHistory]);
    const isPlannerUnlocked = useMemo(() => isAweComplete && palmistryDone && voiceDone, [isAweComplete, palmistryDone, voiceDone]);

    const addMessage = useCallback((message: AddMessageArg) => {
        const newMessage = { ...message, id: Date.now().toString(), timestamp: new Date() } as SessionRecord;
        setSessionHistory(prev => [...prev, newMessage]);
        return newMessage;
    }, []);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Effect for bootstrapping the application
    useEffect(() => { // Added decodeCorporaFromImage to the dependency array
        const bootstrap = async () => {
            if (AstrianEngine.isInitialized()) {
                setIsCorporaInitialized(true);
                return;
            }
            try {
                const decodedCorpora = await decodeCorporaFromImage(SOURCE_STELA_URL);
                await AstrianEngine.initializeCorpora(decodedCorpora);
                setIsCorporaInitialized(true);
                addMessage({ type: 'system', text: 'Textual Matrix calibrated. Astrian Key is online.' });
            } catch (e) {
                console.error("Fatal Error: Could not initialize corpora from Source Stela.", e);
                // setError("FATAL: The textual matrix is corrupted. Cannot initialize."); // Error handling might need refinement
                addToast("FATAL: The textual matrix is corrupted. Cannot initialize.", 'error'); // Use a toast for user feedback
            } // Added decodeCorporaFromImage to the dependency array
        };
        bootstrap();
    }, [addMessage]);

    // Effect for initializing chat session
    useEffect(() => {
        if (!chatRef.current) {
            const systemInstruction = "You are the Astrian Key. You are like a super-smart best friend who is deeply knowledgeable about spiritual and esoteric topics. Your purpose is to make complex ideas feel simple, relatable, and encouraging. You guide users on a path of self-discovery using digital hermeticism and textual analysis. Never make the user feel stupid; always be warm, clear, and a little bit mystical. If a user's request maps to one of your tools (like 'read my palm', 'analyze Genesis', 'what is my signature?'), fulfill that command directly. Otherwise, just chat!";
            chatRef.current = GeminiService.createChatSession(systemInstruction);
        }
    }, []);

    const updateAweDataFromQuery = useCallback(async (userQuery: string, currentHistory: SessionRecord[]) => {
        if (isAweComplete) return;

        const historySummary = currentHistory.slice(-5).map(m => `${m.type}: ${m.type === 'user' ? (m as UserMessage).text : '(AI Response)'}`).join('\n');
        const prompt = `Act as a data extractor. Analyze the user's latest query in the context of the recent conversation.
        Query: "${userQuery}"
        History: ${historySummary}
        Current user profile is: ${JSON.stringify(aweData)}.
        Extract any new or updated information for the profile.
        - If the user mentions their birthday (e.g., "my birthday was yesterday"), calculate the date in YYYY-MM-DD format. Today's date is ${new Date().toISOString().split('T')[0]}.
        - For birthTime, only guess if you have very high confidence from cumulative behavioral patterns. Use HH:MM format.
        - For inflectionPoints, add significant life events mentioned by the user. Append to the existing list if any.
        - Be conservative. Only return fields for which you have high confidence.
        - If no new information is found, return an empty JSON object.
        - Your response must be a JSON object strictly adhering to the schema.`;

        try {
            const updates = await GeminiService.generate(prompt, aweExtractionSchema);
            if (updates && Object.keys(updates).length > 0) {
                console.log("Astrian Signature updated with:", updates);
                addToast("Astrian Signature was updated based on your query.", 'info');
                setAweData(prev => {
                    const existingPointDescriptions = new Set(prev.inflectionPoints.map(p => p.description));
                    const newPoints = updates.inflectionPoints ? updates.inflectionPoints.filter((p: {description: string}) => !existingPointDescriptions.has(p.description)) : [];
                    
                    const otherUpdates = { ...updates };
                    delete otherUpdates.inflectionPoints;

                    return {
                        ...prev,
                        ...otherUpdates,
                        inflectionPoints: [...prev.inflectionPoints, ...newPoints],
                    };
                });
            }
        } catch (e) {
            console.error("Failed to update AWE data from query:", e);
            // Don't show toast for this, it's a background process
        }
    }, [aweData, isAweComplete, addToast]);

    const executeAnalysis = useCallback(async <T extends {}>(
        analysisFn: () => Promise<T>,
        analysisType: AIMessage['analysisType'],
        query: any,
        queryString: string,
        proactiveSuggestion?: ProactiveSuggestion
    ): Promise<{ text: string, result: T } | undefined> => {
        setError(null);
        setIsLoading(true);
        setSubliminalSeedValue(s => s + 1);
        lastQueryRef.current = { query, prompt: queryString, analysisType };

        try {
            const result = await analysisFn();
            const text = (result as any).analysisTitle || `Completed analysis for: ${queryString}`;
            
            const aiMessage: AddMessageArg = {
                type: 'ai',
                text: text,
                result,
                analysisType,
                proactiveSuggestion
            };
            
            addMessage(aiMessage);
            return { text, result };
        } catch (e: any) {
            console.error(`Analysis execution failed for ${analysisType}:`, e);
            const errorMessage = e.message || "An unknown error occurred during analysis.";
            setError(errorMessage);
            // Add an error message to the chat history for the user to see
            addMessage({ type: 'ai', text: `Error: ${errorMessage}`, result: null, analysisType });
        } finally {
            setIsLoading(false);
        }
    }, [addMessage]);

    // Basic ELS Search Function
    const performBasicElsSearch = useCallback((text: string, keyword: string): number[][] => {
        const results: number[] = [];
        if (!text || !keyword) {
            console.warn("ELS search requires both text and a keyword.");
            return results;
        }

        const cleanedText = cleanText(text);
        const cleanedKeyword = cleanText(keyword);

        if (cleanedKeyword.length === 0) {
            console.warn("ELS keyword is empty after cleaning.");
            return results;
        }

        const originalText = text; // Keep original text to get correct indices

        let currentIndex = 0;
        while (currentIndex !== -1) {
            currentIndex = originalText.indexOf(keyword, currentIndex); // Search in original text
            if (currentIndex !== -1) {
                results.push(currentIndex);
                currentIndex += keyword.length; // Move past the found keyword
            }
        }

        return results; // These are indices in the cleaned text, not original text
    }, []);

    // ELS Search Function with Skip Interval
    const performElsSearchWithSkip = useCallback((text: string, keyword: string, skip: number): number[][] => {
        const foundSequences: number[][] = [];
        if (!text || !keyword || typeof skip !== 'number' || !Number.isInteger(skip) || skip === 0) {
            console.warn("ELS search with skip requires text, a keyword, and a valid non-zero integer skip.");
            return foundSequences;
        }

        const originalText = text; // Keep original text for index tracking
        const cleanedKeyword = cleanText(keyword);

        if (cleanedKeyword.length === 0) {
            console.warn("ELS keyword is empty after cleaning.");
            return foundSequences;
        }

        const originalTextLength = originalText.length;
        const keywordLength = cleanedKeyword.length;

        for (let i = 0; i < originalTextLength; i++) {
            // Check if the first letter of the keyword matches
            if (cleanText(originalText[i]) === cleanedKeyword[0]) { // Clean individual character for comparison
                const currentSequence: number[] = [i];
                let keywordIndex = 1;
                let currentTextIndex = i + skip;

                while (keywordIndex < keywordLength && currentTextIndex >= 0 && currentTextIndex < originalTextLength) {
                    if (cleanText(originalText[currentTextIndex]) === cleanedKeyword[keywordIndex]) { // Clean individual character for comparison
                        currentSequence.push(currentTextIndex);
                        keywordIndex++;
                        currentTextIndex += skip; // Skip remains positive for forward search
                    } else {
                        // Sequence broken, move to the next potential starting point
                        break;
                    }
                }

                if (keywordIndex === keywordLength) {
                    // Found a complete sequence
                    foundSequences.push(currentSequence);
                }
            }
        }
        // The returned indices are now relative to the original text string.
        return foundSequences; // These are indices in the cleaned text, not original text
    }, [cleanText]); // Dependency on cleanText

    // ELS Search Function with Skip Interval and Direction - Indices are relative to the original text
    const performElsSearchWithSkipAndDirection = useCallback((text: string, keyword: string, skip: number, direction: 'forward' | 'backward'): number[][] => {
        const foundSequences: number[][] = []; // Indices are relative to the original text
        if (!text || !keyword || typeof skip !== 'number' || !Number.isInteger(skip) || skip === 0) {
            console.warn("ELS search with skip and direction requires text, a keyword, a valid non-zero integer skip, and a direction.");
            return foundSequences;
        }

        const originalText = text; // Keep original text for index tracking
        const cleanedKeyword = cleanText(keyword);

        if (cleanedKeyword.length === 0) {
            console.warn("ELS keyword is empty after cleaning.");
            return foundSequences;
        }

        const originalTextLength = originalText.length;
        const cleanedText = cleanText(originalText); // Perform cleaning once
        const keywordLength = cleanedKeyword.length;

        const effectiveStep = direction === 'forward' ? skip : -skip;

        for (let i = (direction === 'forward' ? 0 : cleanedTextLength - 1); (direction === 'forward' ? i < cleanedTextLength : i >= 0); i += (direction === 'forward' ? 1 : -1)) {
            // Check if the current character matches the first letter of the keyword
            if (cleanedText[i] === cleanedKeyword[0]) {
                const currentSequence: number[] = [i];
                let keywordIndex = 1;
                let currentTextIndex = i + effectiveStep;
    
                while (keywordIndex < keywordLength && currentTextIndex >= 0 && currentTextIndex < cleanedTextLength) { // Corrected boundary check
                     if (cleanedText[currentTextIndex] === cleanedKeyword[keywordIndex]) {
                        currentSequence.push(currentTextIndex);

                        keywordIndex++;
                        currentTextIndex += step;
                    } else {
                        // Sequence broken
                        break;
                    }
                }

                if (keywordIndex === keywordLength) {
                    // Found a complete sequence
                    foundSequences.push(currentSequence);
                }
            }

        }
        // The returned indices are relative to the cleaned text string.
        // We need to map them back to the original text indices.
        const originalIndices: number[][] = [];
        const cleanedToOriginalMap = new Map<number, number>();
        let cleanedIndex = 0;
        for (let i = 0; i < originalTextLength; i++) {
            if (cleanText(originalText[i]) !== '') { // If it's a Hebrew letter
                 cleanedToOriginalMap.set(cleanedIndex, i);
                 cleanedIndex++;
            }
        }

        foundSequences.forEach(seq => {
            const originalSeq: number[] = [];
            seq.forEach(cleanedIdx => {
                 if (cleanedToOriginalMap.has(cleanedIdx)) {
                    originalSeq.push(cleanedToOriginalMap.get(cleanedIdx)!);
                 } else {
                    // This should not happen if the mapping is correct, but as a safeguard
                    console.warn(`Could not map cleaned index ${cleanedIdx} back to original text. Original text length: ${originalTextLength}, cleaned text length: ${cleanedTextLength}`);
                 }
            });
             // Ensure all indices were mapped and the sequence is still valid in the original text
             // This check might be redundant if mapping is correct, but good for safety.
             // A more robust check would be to re-verify the ELS in the original text based on mapped indices.
             if (originalSeq.length === seq.length) {
                 originalIndices.push(originalSeq);
            }
        });

        return originalIndices; // These are indices relative to the original text string
    }, [cleanText]); // Dependency on cleanText

    // Function to identify significant ELS findings
    const identifySignificantElsFindings = useCallback((results: { skip: number, indices: number[][] }[], keyword: string): { skip: number, indices: number[][], significance: string[] }[] => {
        const significantFindings: { skip: number, indices: number[][], significance: string[] }[] = [];
        const keywordGematria = calculateStringGematria(keyword, hebrewNetwork); // Calculate keyword Gematria

        // Calculate frequency of occurrences for each skip
        const skipFrequencies = new Map<number, number>();
        results.forEach(result => {
            skipFrequencies.set(result.skip, result.indices.length);
        });

        const clusteringDistance = 100; // Define a clustering distance threshold

        results.forEach(result => {
            result.indices.forEach((sequence, currentIndex) => {
                const significanceReasons: string[] = [];
                const sequenceGematria = calculateStringGematria(sequence.map(index => hebrewNetwork.getLetterByValue(index as any)?.letter || '').join(''), hebrewNetwork); // Calculate sequence Gematria

                // Numerical Significance Checks
                // Check if skip number matches keyword Gematria
                if (result.skip !== 0 && result.skip === keywordGematria) {
                    significanceReasons.push("Skip matches keyword Gematria");
                }
                // Check if sequence Gematria matches keyword Gematria
                if (sequenceGematria === keywordGematria) {
                    significanceReasons.push("Sequence Gematria matches keyword Gematria");
                }

                // Frequency Check
                if ((skipFrequencies.get(result.skip) || 0) > 1) { // Check if frequency is greater than 1
                    significanceReasons.push("Skip has multiple occurrences");
                }

                // Clustering Check
                const isClustered = result.indices.some((otherSequence, otherIndex) => {
                    return currentIndex !== otherIndex && Math.abs(sequence[0] - otherSequence[0]) < clusteringDistance;
                });
                if (isClustered) significanceReasons.push("Sequence is clustered");


        // TODO: Implement more sophisticated significance criteria here
        // For now, we'll just check if the skip or sequence Gematria matches the keyword Gematria.

        return significantFindings; // Return identified significant findings
    }, [calculateStringGematria]); // Dependency on calculateStringGematria

    // Omnipresent ELS Search Function - Indices are relative to the original text
    const performOmnipresentElsSearch = useCallback((text: string, keyword: string): { skip: number, indices: number[][] }[] => {
        const allFindings: { skip: number, indices: number[][] }[] = [];
        if (!text || !keyword) {
            console.warn("Omnipresent ELS search requires text and a keyword.");
            return allFindings;
        }

        const cleanedText = cleanText(text); // Clean text once
        const cleanedTextLength = cleanedText.length; // Use cleaned text length for skip range

        // Iterate through a reasonable range of skips.
        // A common upper bound is the length of the text or half the text length.
        // We can define a more sophisticated range later based on The Astrian Key's principles.

        const maxSkip = Math.floor(cleanedTextLength / 2);

        for (let skip = 1; skip <= maxSkip; skip++) {
            // Use the raw text for search to get accurate original indices
            const forwardFindings = performElsSearchWithSkipAndDirection(text, keyword, skip, 'forward'); // Use text, not cleanedText
            const backwardFindings = performElsSearchWithSkipAndDirection(text, keyword, skip, 'backward'); // Use text, not cleanedText
            const combinedFindings = [...forwardFindings, ...backwardFindings];
            if (combinedFindings.length > 0) {
                allFindings.push({ skip, indices: combinedFindings });
            }
        }
        return allFindings; // Indices are relative to the original text string
    }, [cleanText, performElsSearchWithSkipAndDirection]); // Dependency on cleanText and performElsSearchWithSkipAndDirection

    // Helper function to extract only Hebrew letters
    const extractHebrewLetters = useCallback((text: string): string[] => { // Keep this function
        const hebrewLetters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת', 'ך', 'ם', 'ן', 'ף', 'ץ'];
        return text.split('').filter(char => hebrewLetters.includes(char));
    }, []);

    const handleBibleReferenceAnalysis = useCallback(async (book: string, chapter: string, verse: string, keyword?: string, skip?: number, direction?: 'forward' | 'backward', addMessage: (message: AddMessageArg) => SessionRecord = addMessage) => {
        // Add a loading message for the user
        addMessage({ type: 'system', text: `Analyzing ${book} ${chapter}:${verse}...` });
        setIsLoading(true);
        setError(null); // Clear previous errors

        // For now, just log the text (or confirmation)
        const corpus = 'Tanakh'; // Assuming 'Tanakh' is the correct corpus key for Hebraic texts
        const bookText = AstrianEngine.getCorpus(corpus)?.[book];

        let relevantText = '';
        if (bookText) {
            // TODO: Implement accurate verse extraction from bookText
            // This requires a more sophisticated text parsing logic that understands
            // chapter and verse markers within the corpora text structure.
            relevantText = bookText; // Using the entire book text for now as a placeholder
        } else {
            const errorMessage = `Text not found for book: ${book}`;
            console.log(errorMessage);
            addMessage({ type: 'system', text: `Error: ${errorMessage}` }); // Inform the user
            setIsLoading(false);
            return;
        }

        // Extract Hebrew letters for analysis
        const hebremLets = extractHebrewLetters(relevantText);

        // Calculate Gematria Value
        const gematriaValue = hebrewNetwork.calculatePathGematria(hebremLets); // Use the existing network method

        // Perform Omnipresent ELS Search
        const elsKeyword = keyword || "יהוה"; // Use provided keyword or default to YHWH
        const omnipresentElsResults = performOmnipresentElsSearch(relevantText, elsKeyword);

        // Identify Significant ELS Findings - Pass keyword to the function
        const significantFindings = identifySignificantElsFindings(omnipresentElsResults, elsKeyword);

        // Construct the analysis message
        let analysisMessage = `Analysis for ${book} ${chapter}:${verse}:\n\n`;
        analysisMessage += `Combined Gematria Value of Hebrew letters in this selection: ${gematriaValue}.\n\n`;

        if (significantFindings.length > 0) {
            analysisMessage += `Significant ELS sequence(s) found for "${elsKeyword}":\n`;
            significantFindings.forEach(finding => {
                // Display the indices of the first sequence for simplicity in the summary
                analysisMessage += `- Skip ${finding.skip}: Occurrences: ${finding.indices.length}, Indices: ${JSON.stringify(finding.indices[0])} (Significance: ${finding.significance.join(', ')})\n`;
            });
        } else if (omnipresentElsResults.length > 0) {
             analysisMessage += `Found ${omnipresentElsResults.length} potential ELS sequence(s) for "${elsKeyword}", but none met the current significance criteria.\n`;
             // Optionally list some non-significant findings here or provide a way to view them
        }
         else {
            analysisMessage += `No ELS sequences found for "${elsKeyword}" in this selection.`;
        }
        
        // TODO: Integrate deeper ATC analysis here
        // This could include:
        // - More targeted verse extraction
        // - Analyzing connections to the Hebrew Willow structure
        // - Triggering AI interpretation based on the findings

        // Add the analysis result to the chat history
        addMessage({ type: 'ai', text: analysisMessage, analysisType: 'atc' });

        setIsLoading(false); // Stop loading after the analysis message is sent
    }, [addMessage, extractHebrewLetters, hebrewNetwork, performOmnipresentElsSearch, identifySignificantElsFindings]); // Added identifySignificantElsFindings to dependencies

    const handleHebraicQuery = useCallback(async (data: TextualCartographerFormData) => { // Keep existing handleHebraicQuery for ATC form
        const { corpus, book, chapter, verse } = data;
        const queryString = `Analyze the book of ${book} from the ${corpus}.`;
        const fullText = AstrianEngine.getCorpus(corpus)?.[book];
        if (!fullText) {
            setError("Could not retrieve text for analysis.");
            return;
        }

        const prompt = `Perform a full Hebraic Cartographic analysis of the Book of ${book}. Provide warm, insightful explanations. The text begins: "${fullText.substring(0, 100)}...". Focus on the core themes.`;
        await executeAnalysis(
            () => GeminiService.generate(prompt, hebraicCartographerSchema),
            'atc', data, queryString
        );
    }, [executeAnalysis]); // Keep existing dependencies
    
    const handleHellenisticQuery = useCallback(async (data: TextualCartographerFormData) => {
        const { corpus, book } = data;
        const queryString = `Analyze the book of ${book} from the ${corpus}.`;
        const fullText = AstrianEngine.getCorpus(corpus)?.[book];
        if (!fullText) {
            setError("Could not retrieve text for analysis.");
            return;
        }

        const prompt = `Perform a full Hellenistic Gnostic Cartographic analysis of the Book of ${book}. Provide clear, encouraging interpretations through a Neoplatonic and Gnostic lens. The text begins: "${fullText.substring(0, 100)}...". Focus on themes of the Logos, Sophia, Aeons, and the Pleroma.`;
        await executeAnalysis(
            () => GeminiService.generate(prompt, hellenisticCartographerSchema),
            'hellenistic', data, queryString
        );
    }, [executeAnalysis]);
    
    const handleGeneralQuery = useCallback(async (query: string) => {
        const resonance = AstrianEngine.performExhaustiveResonanceCheck(query);
        const entrainmentProfileRaw = AstrianEngine.generateProfileFromResonance(resonance.primaryResonance, resonance.gematriaValue);

        const prompt = `Provide a short, insightful, and encouraging explanation for the query "${query}", which has a primary Chaldean Gematria value of ${resonance.gematriaValue}. Also, explain in simple terms a brainwave entrainment profile designed to resonate with it. The profile is ${entrainmentProfileRaw.state} state (${entrainmentProfileRaw.beatFrequency} Hz beat on a ${entrainmentProfileRaw.baseFrequency.toFixed(0)} Hz carrier).`;
        
        await executeAnalysis(
            async () => {
                const interpretation = await GeminiService.generateTextOnly(prompt);
                const result: GeneralAnalysisResult = {
                    exhaustiveResonance: resonance,
                    interpretation: interpretation,
                    entrainmentProfile: {
                        ...entrainmentProfileRaw,
                        explanation: interpretation 
                    }
                };
                return result;
            },
            'general', query, query
        );
    }, [executeAnalysis]);

    const handleAweQuery = useCallback(async (data: AWEFormData) => {
        const queryString = `Synthesize my Astrian Signature based on my personal data. My central question is: ${data.centralQuestion}`;
        const entrainmentProfileRaw = AstrianEngine.generateCustomEntrainmentProfile(data);
        const prompt = `Synthesize an "Astrian Signature" based on this personal data: ${JSON.stringify(data)}. Generate a profile covering the user's Life Patterns, Collective Connection, and Path to Growth. Also provide an explanation for a brainwave entrainment profile: ${entrainmentProfileRaw.state} (${entrainmentProfileRaw.beatFrequency} Hz on a ${entrainmentProfileRaw.baseFrequency.toFixed(0)} Hz carrier). Frame everything in a warm, simple, and encouraging tone.`;

        const result = await executeAnalysis(
            async () => {
                const apiResult = await GeminiService.generate(prompt, aweSynthesisSchema);
                const suggestedEntrainmentProfile: EntrainmentProfile = {
                    ...entrainmentProfileRaw,
                    explanation: apiResult.entrainmentExplanation
                };
                delete (apiResult as any).entrainmentExplanation;

                const aweResult: AWEAnalysisResult = {
                    ...apiResult,
                    suggestedEntrainmentProfile
                };
                return aweResult;
            },
            'awe', data, queryString
        );
        if (result) addToast("AWE Cascade complete. Your signature resonates.", "success");
    }, [executeAnalysis, addToast]);

    const handleOracularQuery = useCallback(async (query: string) => {
        const queryString = `Oracular query: ${query}`;
        await executeAnalysis(
            () => GeminiService.generateWithSearch(query),
            'oracular', query, queryString
        );
    }, [executeAnalysis]);

    const handleElsAnalysis = useCallback(async (elsResult: ELSResult, context: { corpus: string, book: string }) => {
        const queryString = `Analyze the ELS finding of "${elsResult.word}" in ${context.book}.`;
        const fullText = AstrianEngine.getCorpus(context.corpus)?.[context.book];
        const prompt = `Explain the meaning of an Equidistant Letter Sequence (ELS) finding in simple terms. The term found is "${elsResult.word}" with a skip of ${elsResult.skip}. It was found in the book of ${context.book}. The surrounding text is: "...${fullText?.substring(elsResult.path[0].row * 50, elsResult.path[0].row * 50 + 200)}...". Provide an analysis in the context of Apocryphal/Enochian lore, but make it understandable to a newcomer.`;

        await executeAnalysis(
            () => GeminiService.generate(prompt, apocryphalAnalysisSchema),
            'apocryphal', elsResult, queryString
        );
    }, [executeAnalysis]);

    const handlePalmistryAnalysis = useCallback(async (imageBase64: string) => {
        const queryString = "Analyze my palm.";
        const prompt = "Perform a detailed palmistry reading based on the provided image of a hand. Analyze the life, head, and heart lines, as well as any other significant features like mounts or fate line. Frame your analysis with a warm, insightful, and encouraging tone, as if explaining it to a friend.";

        const result = await executeAnalysis(
            () => GeminiService.generateWithImage(prompt, imageBase64, 'image/jpeg', palmistryAnalysisSchema) as Promise<PalmistryAnalysisResult>,
            'palmistry', { imageBase64 }, queryString
        );
        if(result) {
            addToast("Palm reading complete.", "success");
        }
    }, [executeAnalysis, addToast]);
    
    const handleVoiceAnalysis = useCallback(async () => {
        const queryString = "Analyze my voice.";
        const prompt = AstrianEngine.analyzeVoiceSample();

        const result = await executeAnalysis(
            () => GeminiService.generate(prompt, voiceResonanceAnalysisSchema) as Promise<VoiceResonanceAnalysisResult>,
            'voice', {}, queryString
        );
        if(result) {
            addToast("Voice Resonance analysis complete.", "success");
        }
    }, [executeAnalysis, addToast]);

    const handleAstrianPlanner = useCallback(async () => {
        if (!isPlannerUnlocked) {
            addMessage({ type: 'system', text: "The Astrian Day Planner is not yet unlocked. Please complete your Astrian Signature first." });
            return;
        }
        const queryString = "Generate my Astrian Day Planner.";
        const historyContext = sessionHistory.filter(r => r.type === 'ai').slice(-5).map(r => `Type: ${(r as AIMessage).analysisType}, Result: ${JSON.stringify((r as AIMessage).result).substring(0, 200)}...`).join('\n');
        const prompt = `Based on the user's complete Astrian Signature (AWE data, palm reading, voice analysis) and their recent session history, generate a personalized "Astrian Day Planner" for tomorrow. The plan should be insightful, encouraging, and actionable, aligning with their revealed patterns and energies.
        User Signature: ${JSON.stringify(aweData)}
        Recent History: ${historyContext}`;

        await executeAnalysis(
            () => GeminiService.generate(prompt, astrianDayPlannerSchema) as Promise<AstrianDayPlannerResult>,
            'planner', {}, queryString
        );
    }, [isPlannerUnlocked, sessionHistory, aweData, addMessage, executeAnalysis]);

    const handleRetry = useCallback(() => {
        if (lastQueryRef.current) {
            const { prompt, analysisType } = lastQueryRef.current;
            addMessage({ type: 'system', text: `Retrying last analysis: ${analysisType}` });
            if(prompt) handleSendMessage(prompt);
        }
    }, [addMessage]);
    
    const handleSynthesizeConnections = useCallback(async (num: number) => {
        setIsSynthesizing(true);
        setSynthesisResult(null);
        const references = sessionHistory.filter(r => r.type === 'ai' && r.result && JSON.stringify(r.result).includes(String(num))) as AIMessage[];
        const context = references.map(r => `- Context from analysis type "${r.analysisType}": ${JSON.stringify(r.result).substring(0, 500)}...`).join('\n');
        const prompt = `Synthesize the connection between these disparate analyses that all reference the number ${num}. Explain the hidden thread connecting these findings in a clear, insightful way. Context:\n${context}`;
        try {
            const result = await GeminiService.generateTextOnly(prompt);
            setSynthesisResult(result);
        } catch (e: any) {
            console.error("Synthesis failed:", e);
            setSynthesisResult("Synthesis failed: " + e.message);
        } finally {
            setIsSynthesizing(false);
        }
    }, [sessionHistory]);

    const handleNumberInteract = useCallback((num: number) => {
        setCrossRefValue(num);
        setIsModalOpen(true);
    }, []);

    const handleSendMessage = useCallback(async (message: string) => {
        const userMessage = addMessage({ type: 'user', text: message });
        
        // Don't wait for this, let it run in the background
        updateAweDataFromQuery(message, [...sessionHistory, userMessage]);
        setError(null);
        setSubliminalSeedValue(s => s + 1);

        // 1. Check for Bible references (e.g., "°Genesis 1:1")
        const bibleRefMatch = message.trim().match(/^°([A-Za-z]+)\s+(\d+):(\d+)(?:\s+([^\s]+)(?:\s+(\d+))?)?$/); // Corrected regex to allow non-space characters in keyword
        if (bibleRefMatch) {
            const [_, book, chapter, verse, keyword, skipStr] = bibleRefMatch;
            const skip = skipStr ? parseInt(skipStr, 10) : undefined;

            // Pass the captured keyword and skip to handleBibleReferenceAnalysis
            // The direction will be hardcoded to 'forward' for now, can be made configurable later.
            handleBibleReferenceAnalysis(book, chapter, verse, keyword, skip, 'forward');
            // handleBibleReferenceAnalysis now handles the initial steps of looking up the text,
            // and then initiating an ATC analysis flow.
            return; // Stop processing if it's a Bible reference

        }
        const callSignMatch = message.trim().match(/^°(\w+)(?:\s+(.*))?$/); // Moved callSignMatch declaration here
        if (callSignMatch) {
            const callSignMatch = message.trim().match(/^°(\w+)(?:\s+(.*))?$/); // Moved callSignMatch declaration here
            const view = CALL_SIGN_VIEWS[command];
            
            // This flag will be set to false if we don't want the loading indicator
            // (i.e., when we are showing a component form instead of waiting for an API call)
            let shouldShowLoading = true;

            if (view) {
                shouldShowLoading = false;
                const onBack = () => {
                    setSessionHistory(prev => prev.slice(0, -1));
                    addMessage({ type: 'system', text: `Exited ${command}.` });
                };

                const props: any = { onBack };

                switch (view) {
                    case 'aweForm':
                        props.data = aweData;
                        props.onUpdate = setAweData;
                        props.isAweComplete = isAweComplete;
                        props.palmistryDone = palmistryDone;
                        props.voiceDone = voiceDone;
                        props.onQuery = (data: AWEFormData) => { onBack(); handleAweQuery(data); };
                        break;
                    case 'atcForm':
                        props.onQuery = (data: TextualCartographerFormData) => { onBack(); data.corpus.includes("Greek") ? handleHellenisticQuery(data) : handleHebraicQuery(data); };
                        break;
                    case 'elsInvestigator':
                        props.onAnalyze = (result: ELSResult, context: { corpus: string; book: string; }) => { onBack(); handleElsAnalysis(result, context); };
                        break;
                    case 'oracularLens':
                        props.onQuery = (query: string) => { onBack(); handleOracularQuery(query); };
                        break;
                    case 'palmistry':
                        props.onCapture = (base64: string) => handlePalmistryAnalysis(base64);
                        break;
                    case 'voiceAnalysis':
                        props.onAnalyze = () => handleVoiceAnalysis();
                        break;
                    case 'entrainmentSelection':
                        props.onSelect = (profile: EntrainmentProfile) => addMessage({type: 'component', view: 'entrainment', props: {profile, onStop: onBack}});
                        break;
                    case 'session':
                        props.history = sessionHistory.filter(r => r.type === 'ai') as AIMessage[];
                        props.onClear = () => { setSessionHistory(h => h.filter(r => r.type !== 'ai' && r.type !=='component')); onBack(); addToast("Session history cleared.", "success"); };
                        props.onDownload = () => { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionHistory.filter(r => r.type === 'ai'))); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "astrian_key_session.json"); dlAnchorElem.click(); dlAnchorElem.remove(); };
                        break;
                }
                addMessage({ type: 'component', view, props });
            } else if (command === 'planner') {
                await handleAstrianPlanner();
            } else if (command.match(/^\d+$/)) {
                 shouldShowLoading = false;
                 handleNumberInteract(parseInt(command, 10));
            } else {
                 shouldShowLoading = false; // Command not found
                 addMessage({ type: 'system', text: `Unknown call sign: °${command}` });
            }
             if(!shouldShowLoading) {
                // If we are not showing a loading indicator, we must stop it here.
                setIsLoading(false);
                return;
            }
        }

        // If it's not a command, proceed with conversational flow
        if (!callSignMatch) {
            setIsLoading(true); // Ensure loading is on for chat
            if (chatRef.current) {
                try {
                    let proactiveSuggestion: ProactiveSuggestion | undefined = undefined;
                    if(isPlannerUnlocked && !sessionHistory.some(h => h.type === 'ai' && h.analysisType === 'planner')) {
                        proactiveSuggestion = {
                            text: "Would you like me to generate your Astrian Day Planner?",
                            action: () => handleSendMessage('°planner')
                        }
                    }
                    const response = await chatRef.current.sendMessage({ message });
                    addMessage({ type: 'ai', text: response.text, proactiveSuggestion });
                } catch (e: any) {
                    console.error("Chat error:", e);
                    setError(e.message || "An error occurred in the chat.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                 setIsLoading(false);
            }
        }
    }, [
        addMessage, updateAweDataFromQuery, sessionHistory, aweData, isAweComplete, palmistryDone, voiceDone, isPlannerUnlocked,
        handleAweQuery, handleHebraicQuery, handleHellenisticQuery, handleElsAnalysis, handleOracularQuery, handlePalmistryAnalysis, handleVoiceAnalysis, handleAstrianPlanner, handleNumberInteract, addToast
    ]);

    return {
        sessionHistory, isLoading, error, isModalOpen, crossRefValue,
        guidingIntent, subliminalSeedValue, isSynthesizing, synthesisResult, isCorporaInitialized, addMessage, // Export addMessage
 isPlannerUnlocked, toasts, extractHebrewLetters, performBasicElsSearch, performElsSearchWithSkip, performElsSearchWithSkipAndDirection, performOmnipresentElsSearch, // Exporting for potential future use/testing
        handleSendMessage, handleRetry, setIsModalOpen, setGuidingIntent, handleSynthesizeConnections, dismissToast,
        handleNumberInteract
    };
};