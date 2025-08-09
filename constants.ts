import { Type } from "@google/genai";

/**
 * constants.ts
 *
 * Houses all static, constant data for the Astrian Key application,
 * primarily the schemas for validating responses from the Gemini API.
 * This separation of concerns keeps the core logic files clean.
 */

// =================================================================================================
// --- API SCHEMAS ---
// =================================================================================================

const gematriaAnalysisSchema = { type: Type.OBJECT, properties: { word: { type: Type.STRING }, englishMeaning: { type: Type.STRING }, transliteration: { type: Type.STRING }, standard: { type: Type.NUMBER }, ordinal: { type: Type.NUMBER }, reduced: { type: Type.NUMBER }, kolel: { type: Type.NUMBER }, atbashWord: { type: Type.STRING }, atbashValue: { type: Type.NUMBER }, }, required: ["word", "englishMeaning", "transliteration", "standard", "ordinal", "reduced", "kolel", "atbashWord", "atbashValue"] };
const deepElsAnalysisSchema = { type: Type.OBJECT, properties: { textGrid: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["text", "explanation"] }, elsAnalysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, englishMeaning: { type: Type.STRING }, transliteration: { type: Type.STRING }, direction: { type: Type.STRING }, skip: { type: Type.NUMBER }, verses: { type: Type.STRING }, path: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { row: { type: Type.NUMBER }, col: { type: Type.NUMBER } }, required: ["row", "col"] } } }, required: ["word", "transliteration", "direction", "skip", "verses", "path"] } } }, required: ["textGrid", "elsAnalysis"] };

export const hebraicCartographerSchema = {
    type: Type.OBJECT,
    properties: {
        hebrewText: { type: Type.STRING, description: "The original Hebrew text for the query, if applicable." },
        transliteration: { type: Type.STRING, description: "A phonetic transliteration of the Hebrew text." },
        englishTranslation: { type: Type.STRING, description: "A literal English translation of the Hebrew text." },
        gematriaAnalysis: { type: Type.ARRAY, description: "Gematria breakdown for key terms.", items: gematriaAnalysisSchema },
        vibrationalAnalysis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        cosmicArchitecture: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        archetypalDrivers: { type: Type.OBJECT, properties: { title: { type: 'STRING' }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        deepElsAnalysis: { type: Type.OBJECT, description: "Optional ELS analysis if significant sequences are found.", properties: deepElsAnalysisSchema.properties, required: deepElsAnalysisSchema.required },
        hebraicKeysOfMastery: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, generatedText: { type: Type.STRING } }, required: ["title", "generatedText"] },
        protocolUnflinchingTruth: { type: Type.OBJECT, properties: { challenge: { type: Type.STRING }, softLanding: { type: Type.STRING } }, required: ["challenge", "softLanding"] },
    },
    required: ["hebrewText", "transliteration", "englishTranslation", "gematriaAnalysis", "vibrationalAnalysis", "cosmicArchitecture", "archetypalDrivers", "hebraicKeysOfMastery", "protocolUnflinchingTruth"]
};

export const hellenisticCartographerSchema = {
    type: Type.OBJECT,
    properties: {
        greekText: { type: Type.STRING, description: "The original Greek text for the query." },
        transliteration: { type: Type.STRING, description: "A phonetic transliteration of the Greek text." },
        englishTranslation: { type: Type.STRING, description: "A literal English translation of the Greek text." },
        isopsephyAnalysis: { type: Type.ARRAY, description: "Isopsephy (Greek Gematria) breakdown for key terms.", items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ["word", "value"] } },
        vibrationalAnalysis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        cosmicArchitecture: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Analysis through the lens of Neoplatonism, Pleroma, Aeons." }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        archetypalDrivers: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Analysis through the lens of Gnostic archetypes (e.g., The Logos, Sophia)." }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        deepElsAnalysis: { type: Type.OBJECT, description: "Optional ELS analysis of the Greek text.", properties: deepElsAnalysisSchema.properties, required: deepElsAnalysisSchema.required },
        gnosticSynthesis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        protocolUnflinchingTruth: { type: Type.OBJECT, properties: { challenge: { type: Type.STRING }, softLanding: { type: Type.STRING } }, required: ["challenge", "softLanding"] },
    },
    required: ["greekText", "transliteration", "englishTranslation", "isopsephyAnalysis", "vibrationalAnalysis", "cosmicArchitecture", "archetypalDrivers", "gnosticSynthesis", "protocolUnflinchingTruth"]
};

export const aweSynthesisSchema = {
    type: Type.OBJECT,
    properties: {
        guidingQuestion: { type: Type.STRING },
        temporalMatrix: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        karmicDharmicLedger: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        collectiveNoosphere: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        alchemicalBridge: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ['title', 'explanation'] },
        shortestRouteToInternalMastery: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ['title', 'explanation'] },
        entrainmentExplanation: { type: Type.STRING, description: "An explanation for the custom-generated entrainment profile that was provided." }
    },
    required: ["guidingQuestion", "temporalMatrix", "karmicDharmicLedger", "collectiveNoosphere", "alchemicalBridge", "shortestRouteToInternalMastery", "entrainmentExplanation"]
};

export const apocryphalAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisTitle: { type: Type.STRING, description: "A fitting title for the analysis, e.g., 'The Watcher's Decree'." },
        coreConcept: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING, description: "Interpretation of the query in the context of Enochian/Apocryphal lore." } }, required: ["title", "explanation"] },
        angelicResonance: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING, description: "Connection to specific angelic beings, hierarchies, or concepts from the text." } }, required: ["title", "explanation"] },
        cosmologicalImplication: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING, description: "How the finding relates to the cosmology described in the Book of Enoch (e.g., heavens, sheol)." } }, required: ["title", "explanation"] },
        elsSynthesis: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING, description: "A synthesis of the client-provided ELS findings." } }, required: ["title", "explanation"] },
    },
    required: ["analysisTitle", "coreConcept", "angelicResonance", "cosmologicalImplication", "elsSynthesis"]
};

export const palmistryAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisTitle: { type: Type.STRING },
        overallReading: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        lifeLine: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        headLine: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        heartLine: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        fateLine: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } } },
        majorMounts: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
    },
    required: ["analysisTitle", "overallReading", "lifeLine", "headLine", "heartLine", "majorMounts"]
};

export const voiceResonanceAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisTitle: { type: Type.STRING, description: "e.g., 'The Resonant Signature of the Voice'" },
        coreVibrationalTone: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        prosodicFlow: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
        expressivePower: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
    },
    required: ["analysisTitle", "coreVibrationalTone", "prosodicFlow", "expressivePower"]
};


export const astrianDayPlannerSchema = {
    type: Type.OBJECT,
    properties: {
        planTitle: { type: Type.STRING },
        overview: { type: Type.STRING },
        schedule: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    timeRange: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    esotericAdvice: { type: Type.STRING },
                    elementalAlignment: { type: Type.STRING },
                },
                required: ["timeRange", "activity", "esotericAdvice", "elementalAlignment"],
            },
        },
    },
    required: ["planTitle", "overview", "schedule"],
};

export const aweExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        fullNameAtBirth: { type: Type.STRING },
        currentNameUsed: { type: Type.STRING },
        birthDate: { type: Type.STRING, description: "The user's date of birth in YYYY-MM-DD format." },
        birthTime: { type: Type.STRING, description: "The user's time of birth in HH:MM format (24-hour)." },
        birthLocation: { type: Type.STRING },
        inflectionPoints: { type: Type.ARRAY, description: "Significant life events mentioned by the user.", items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, date: { type: Type.STRING, description: "YYYY-MM-DD" } }, required: ["description", "date"] } },
        relationalNodeHarmonious: { type: Type.STRING },
        relationalNodeChallenging: { type: Type.STRING },
        geographicAnchor: { type: Type.STRING },
        centralQuestion: { type: Type.STRING },
    },
};