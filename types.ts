/**
 * types.ts
 *
 * Centralized type definitions for the Astrian Key application.
 * This file provides a single source of truth for all data structures,
 * promoting consistency and ease of maintenance.
 */

// =================================================================================================
// --- CORE ANALYSIS TYPES ---
// =================================================================================================

/** Represents a full Gematria analysis for a word. */
export interface GematriaAnalysis {
    word: string;
    englishMeaning: string;
    transliteration: string;
    standard: number;
    ordinal: number;
    reduced: number;
    kolel: number;
    atbashWord: string;
    atbashValue: number;
}

/** Represents a found Equidistant Letter Sequence (ELS). */
export interface ELSResult {
    word: string;
    englishMeaning?: string;
    transliteration?: string;
    direction: string;
    skip: number;
    verses: string;
    path: { row: number, col: number }[];
}

/** The complete result of a deep ELS analysis, including the character grid. */
export interface DeepELSAnalysisResult {
    textGrid: { text: string; explanation: string; };
    elsAnalysis: ELSResult[];
}

/** The complete analysis results from a Cartographer. */
export interface CartographerAnalysisResults {
    query: string;
    hebrewText?: string;
    greekText?: string;
    transliteration: string;
    englishTranslation: string;
    gematriaAnalysis?: GematriaAnalysis[];
    isopsephyAnalysis?: {word: string, value: number}[];
    vibrationalAnalysis: { title: string; explanation: string; };
    cosmicArchitecture: { title: string; explanation: string; };
    archetypalDrivers: { title: string; explanation: string; };
    deepElsAnalysis?: DeepELSAnalysisResult;
    hebraicKeysOfMastery?: { title: string; generatedText: string; };
    gnosticSynthesis?: {title: string; explanation: string; };
    protocolUnflinchingTruth: { challenge: string; softLanding: string; };
}

/** The multi-modal resonance profile for a given numerical value. */
export interface ResonanceProfile {
    sonic: {
        root: { hz: number; note: string; };
        third: { hz: number; note: string; };
        fifth: { hz: number; note: string; };
        chordName: string;
    };
    light: { wavelength: number; color: string; };
    element: { name: string; symbol: string; atomicNumber: number; } | null;
}

/** The full result of the client-side exhaustive resonance check. */
export interface ExhaustiveResonanceResult {
    query: string;
    gematriaValue: number;
    primaryResonance: ResonanceProfile;
    resonanceCascade: CascadeCorrespondence[];
}

/** The result of a General Query analysis, combining client and AI data. */
export interface GeneralAnalysisResult {
    exhaustiveResonance: ExhaustiveResonanceResult;
    interpretation: string; // The AI's part
    entrainmentProfile: EntrainmentProfile;
}

/** The result of an AWE Cascade analysis. */
export interface AWEAnalysisResult {
    guidingQuestion: string;
    temporalMatrix: { title: string; explanation: string; };
    karmicDharmicLedger: { title: string; explanation: string; };
    collectiveNoosphere: { title: string; explanation: string; };
    alchemicalBridge: { title: string; explanation: string; };
    shortestRouteToInternalMastery: { title: string; explanation: string; };
    suggestedEntrainmentProfile: EntrainmentProfile;
}

/** The result of an Apocryphal Analysis. */
export interface ApocryphalAnalysisResult {
    analysisTitle: string;
    coreConcept: { title: string; explanation: string; };
    angelicResonance: { title: string; explanation: string; };
    cosmologicalImplication: { title: string; explanation: string; };
    elsSynthesis: { title: string; explanation: string; };
}

/** The result of a Palmistry Analysis. */
export interface PalmistryAnalysisResult {
    analysisTitle: string;
    overallReading: { title: string; explanation: string; };
    lifeLine: { title: string; explanation: string; };
    headLine: { title: string; explanation: string; };
    heartLine: { title: string; explanation: string; };
    fateLine?: { title: string; explanation: string; };
    majorMounts: { title: string; explanation: string; };
}

/** The result of a Voice Resonance Analysis */
export interface VoiceResonanceAnalysisResult {
    analysisTitle: string;
    coreVibrationalTone: { title: string, explanation: string };
    prosodicFlow: { title: string, explanation: string };
    expressivePower: { title: string, explanation: string };
}


/** The result of an Astrian Day Planner generation. */
export interface AstrianDayPlannerResult {
    planTitle: string;
    overview: string;
    schedule: {
        timeRange: string;
        activity: string;
        esotericAdvice: string;
        elementalAlignment: string;
    }[];
}

// =================================================================================================
// --- FORM & UI STATE TYPES ---
// =================================================================================================

/** Main application view states for components rendered inside chat. */
export type View = 'aweForm' | 'atcForm' | 'session' | 'entrainment' | 'oracularLens' | 'elsInvestigator' | 'palmistry' | 'voiceAnalysis' | 'entrainmentSelection';

export type GuidingIntent = "Neutral" | "Harmony & Health" | "Clarity & Focus" | "Creativity & Inspiration" | "Love & Connection";

/** The data structure for the AWE (Analysis & Writ of Efflux) form. */
export interface AWEFormData {
    fullNameAtBirth: string;
    currentNameUsed: string;
    birthDate: string;
    birthTime: string;
    birthLocation: string;
    inflectionPoints: { description: string, date: string }[];
    relationalNodeHarmonious: string;
    relationalNodeChallenging: string;
    geographicAnchor: string;
    centralQuestion: string;
}

/** The data structure for the ATC form. */
export interface TextualCartographerFormData {
    corpus: string;
    book: string;
}

/** The data structure for the ELS Investigator form */
export interface ELSInvestigatorFormData {
    corpus: string;
    book: string;
    searchTerm: string;
    contextualSeed?: string;
}

// =================================================================================================
// --- SESSION & HISTORY TYPES ---
// =================================================================================================

/** A record of a single query and its result within the session. */
export type BaseSessionRecord = {
    id: string;
    timestamp: Date;
    query: any;
    queryString: string;
    analysisType: 'atc' | 'general' | 'awe' | 'hellenistic' | 'apocryphal' | 'oracular' | 'els' | 'palmistry' | 'planner' | 'voice';
};

export type UserMessage = { type: 'user'; id: string; timestamp: Date; text: string; };
export type AIMessage = { type: 'ai'; id: string; timestamp: Date; text: string; result?: any; analysisType?: BaseSessionRecord['analysisType']; proactiveSuggestion?: ProactiveSuggestion; };
export type SystemMessage = { type: 'system'; id: string; timestamp: Date; text: string; };
export type ComponentMessage = { type: 'component'; id: string; timestamp: Date; view: View, props: any; };

export type SessionRecord = UserMessage | AIMessage | SystemMessage | ComponentMessage;

export type ProactiveSuggestion = {
    text: string;
    action: () => void;
};


// =================================================================================================
// --- UTILITY & MISC TYPES ---
// =================================================================================================

/** Defines a brainwave entrainment profile. */
export interface EntrainmentProfile {
    state: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
    baseFrequency: number;
    beatFrequency: number;
    explanation: string;
}

/** A found correspondence from the client-side resonance cascade. */
export interface CascadeCorrespondence {
  domain: string;
  correspondence: string;
  explanation: string;
}

/** A result from a Strong's Concordance lookup. */
export interface StrongsResult {
    number: number;
    definition: string;
    transliteration: string;
    originalWord: string;
}

/** Represents a toast notification. */
export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error';
}