import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { StrongsEntry, strongsHebrewCorpus, strongsGreekCorpus } from './corpora';
import { ResonanceProfile, CascadeCorrespondence, AWEFormData, EntrainmentProfile, ELSResult, ExhaustiveResonanceResult } from './types';

/**
 * services.ts
 *
 * This file centralizes all external services and core logic engines.
 * It follows the Single Responsibility Principle by separating data fetching,
 * business logic, and utility functions from the UI components.
 */

// =================================================================================================
// --- AUDIO SERVICE ---
// =================================================================================================

export class AudioService {
    /**
     * Renders an array of frequencies to a WAV file blob.
     * @param frequencies - The array of frequencies to render.
     * @param noteDuration - The duration of each note in seconds.
     * @param waveform - The oscillator waveform type.
     * @returns A promise that resolves with the WAV file as a Blob.
     */
    public static async renderAudioToWav(frequencies: number[], noteDuration: number = 0.5, waveform: OscillatorType = 'sine'): Promise<Blob> {
        const totalDuration = frequencies.length * noteDuration;
        const offlineContext = new OfflineAudioContext(2, 44100 * totalDuration, 44100);
        const masterGain = offlineContext.createGain();
        masterGain.gain.setValueAtTime(0.25, 0);
        masterGain.connect(offlineContext.destination);

        frequencies.forEach((freq, i) => {
            const osc = offlineContext.createOscillator();
            osc.type = waveform;
            osc.frequency.setValueAtTime(freq, offlineContext.currentTime + i * noteDuration);
            osc.connect(masterGain);
            osc.start(offlineContext.currentTime + i * noteDuration);
            osc.stop(offlineContext.currentTime + (i + 1) * noteDuration);
        });

        const audioBuffer = await offlineContext.startRendering();

        // Standard WAV header creation logic
        const wavHeader = new Uint8Array(44);
        const view = new DataView(wavHeader.buffer);
        const numChannels = audioBuffer.numberOfChannels, sampleRate = audioBuffer.sampleRate, numSamples = audioBuffer.length, dataSize = numSamples * numChannels * 2;
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + dataSize, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true); // PCM
        view.setUint16(20, 1, true); // AudioFormat
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
        view.setUint16(32, numChannels * 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true);

        const pcmData = new Int16Array(numSamples * numChannels);
        for (let i = 0; i < numChannels; i++) {
            const channelData = audioBuffer.getChannelData(i);
            for (let j = 0; j < numSamples; j++) {
                pcmData[j * numChannels + i] = Math.max(-1, Math.min(1, channelData[j])) * 32767;
            }
        }
        return new Blob([wavHeader, pcmData], { type: 'audio/wav' });
    }
}

// =================================================================================================
// --- GEMINI API SERVICE ---
// =================================================================================================

/** Provides a centralized service for all interactions with the GoogleGenAI API. */
export class GeminiService {
    private static ai: GoogleGenAI | null = null;
    
    private static getClient(): GoogleGenAI {
        if (!this.ai) {
            if (!process.env.API_KEY) { throw new Error("API_KEY environment variable not set."); }
            this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        }
        return this.ai;
    }

    public static createChatSession(systemInstruction: string): Chat {
        const client = this.getClient();
        return client.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            },
        });
    }
    
    private static async _executeRequest<T>(
        apiCall: (client: GoogleGenAI) => Promise<GenerateContentResponse>,
        transform: (response: GenerateContentResponse) => T,
        errorContext: string
    ): Promise<T> {
        try {
            const client = this.getClient();
            const response = await apiCall(client);
            return transform(response);
        } catch (error) {
            console.error(`Gemini API Error (${errorContext}):`, error);
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            throw new Error(`Resonance Fault (${errorContext}): ${message}`);
        }
    }

    public static async generate(prompt: string, schema?: any): Promise<any> {
        return this._executeRequest(
            (client) => {
                const config: any = { responseMimeType: "application/json" };
                if (schema) config.responseSchema = schema;
                return client.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config });
            },
            (response) => {
                const text = response.text.trim().replace(/^```json\s*|```\s*$/g, '');
                try {
                    return JSON.parse(text);
                } catch(e) {
                    console.error("Failed to parse Gemini JSON response:", text);
                    // This error will be caught by the outer try/catch in _executeRequest
                    throw new Error("Failed to parse response JSON.");
                }
            },
            "JSON Schema"
        );
    }

    public static async generateWithImage(prompt: string, imageBase64: string, mimeType: string, schema?: any): Promise<any> {
        const imagePart = { inlineData: { data: imageBase64, mimeType } };
        const textPart = { text: prompt };

        return this._executeRequest(
            (client) => {
                const config: any = {};
                if (schema) {
                    config.responseMimeType = "application/json";
                    config.responseSchema = schema;
                }
                
                return client.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: { parts: [textPart, imagePart] },
                    config
                });
            },
            (response) => {
                if (schema) {
                    const text = response.text.trim().replace(/^```json\s*|```\s*$/g, '');
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.error("Failed to parse Gemini JSON response (multimodal):", text, e);
                        throw new Error("Failed to parse multimodal response JSON.");
                    }
                }
                return response.text; // Return text if no schema
            },
            "Multimodal"
        );
    }

    public static async generateWithSearch(prompt: string): Promise<GenerateContentResponse> {
        return this._executeRequest(
            (client) => client.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { tools: [{googleSearch: {}}] } }),
            (response) => response, // Identity transform
            "Search Grounding"
        );
    }

    public static async generateTextOnly(prompt: string): Promise<string> {
        return this._executeRequest(
            (client) => client.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }),
            (response) => response.text,
            "Text Only"
        );
    }
}

// =================================================================================================
// --- ASTRIAN ENGINE CORE ---
// =================================================================================================

/** Encapsulates client-side analysis logic, such as Gematria and resonance mapping. */
export class AstrianEngine {
    private static corporaCache: Record<string, Record<string, string>> | null = null;
    
    private static readonly data = {
        chaldeanMap: { 'a': 1, 'i': 1, 'j': 1, 'q': 1, 'y': 1, 'b': 2, 'k': 2, 'r': 2, 'c': 3, 'g': 3, 'l': 3, 's': 3, 'd': 4, 'm': 4, 't': 4, 'e': 5, 'h': 5, 'n': 5, 'x': 5, 'u': 6, 'v': 6, 'w': 6, 'o': 7, 'z': 7, 'f': 8, 'p': 8 },
        hebrewMap: { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 },
        greekMap: { 'α': 1, 'β': 2, 'γ': 3, 'δ': 4, 'ε': 5, 'ϝ': 6, 'ζ': 7, 'η': 8, 'θ': 9, 'ι': 10, 'κ': 20, 'λ': 30, 'μ': 40, 'ν': 50, 'ξ': 60, 'ο': 70, 'π': 80, 'ϟ': 90, 'ρ': 100, 'σ': 200, 'τ': 300, 'υ': 400, 'φ': 500, 'χ': 600, 'ψ': 700, 'ω': 800 },
        periodicTable: { 1: { name: 'Hydrogen', symbol: 'H' }, 6: { name: 'Carbon', symbol: 'C' }, 7: { name: 'Nitrogen', symbol: 'N' }, 8: { name: 'Oxygen', symbol: 'O' }, 26: { name: 'Iron', symbol: 'Fe' }, 29: { name: 'Copper', symbol: 'Cu' }, 47: { name: 'Silver', symbol: 'Ag' }, 79: { name: 'Gold', symbol: 'Au' }, 80: { name: 'Mercury', symbol: 'Hg' }, 82: { name: 'Lead', symbol: 'Pb' } },
        thermoData: { 0: { substance: "Water", event: "Freezing Point", unit: "°C" }, 100: { substance: "Water", event: "Boiling Point", unit: "°C" }, 32: { substance: "Water", event: "Freezing Point", unit: "°F" }, 212: { substance: "Water", event: "Boiling Point", unit: "°F" } },
        sacredGeoData: { 60: { shape: 'Triangle (Equilateral)', property: 'Internal Angle' }, 90: { shape: 'Square', property: 'Internal Angle' }, 108: { shape: 'Pentagon', property: 'Internal Angle' }, 360: { shape: 'Circle', property: 'Degrees' }, '1.618': { shape: 'Phi', property: 'Golden Ratio (approx)' } },
        apocryphalKnowledge: { 7: { source: "Book of Enoch", concept: "The Seven Archangels" }, 72: { source: "Kabbalah", concept: "The 72 Angels/Names of God" }, 364: { source: "Book of Enoch", concept: "Days in the solar year" } },
        ancientMeasuresData: { 11: { name: 'Shekel (approx. grams)', culture: 'Hebrew', type: 'Weight' }, 52: { name: 'Royal Egyptian Cubit (cm)', culture: 'Egyptian', type: 'Length' } },
        celestialAndNauticalData: { 90: { concept: "Cardinal direction; Right Angle", field: "Navigation & Geometry" }, 360: { concept: "Full Circle; Completion", field: "Celestial Mechanics & Geometry" } }
    };

    public static async initializeCorpora(decodedCorpora: Record<string, Record<string, string>>): Promise<void> {
        this.corporaCache = decodedCorpora;
        return Promise.resolve();
    }
    
    public static isInitialized(): boolean {
        return this.corporaCache !== null;
    }

    public static getCorpus(corpusName: string): Record<string, string> {
        if (!this.corporaCache) {
            throw new Error("Astrian Engine corpora not initialized. The Source Stela has not been decoded.");
        }
        return this.corporaCache[corpusName] || {};
    }
    
    public static calculateChaldean = (text: string) => text.toLowerCase().split('').reduce((sum, char) => sum + (this.data.chaldeanMap[char] || 0), 0);
    public static calculateHebraicStandard = (hebrewText: string) => hebrewText.split('').reduce((sum, char) => sum + (this.data.hebrewMap[char] || 0), 0);
    
    public static getLocalStrongsEntry(number: number, isHebrew: boolean): StrongsEntry | null {
        const corpus = isHebrew ? strongsHebrewCorpus : strongsGreekCorpus;
        return corpus[number] || null;
    }

    public static findELS(text: string, searchTerm: string, contextualSeed?: string): ELSResult[] {
        if (!searchTerm || !text) return [];
        const cleanText = text.replace(/[\s.,/#!$%^&*;:{}=\-_`~()0-9]/g, "");
        if (!cleanText) return [];
    
        // If a contextual seed is provided (e.g., "David"), its Gematria value becomes the required skip.
        // This focuses the search on a specific resonance.
        const requiredSkip = contextualSeed ? this.calculateHebraicStandard(contextualSeed) : null;
        if (requiredSkip !== null && requiredSkip === 0) return []; // Avoid infinite loops

        const results: ELSResult[] = [];
        const gridWidth = Math.ceil(Math.sqrt(cleanText.length));
        const maxSkip = requiredSkip ? requiredSkip + 1 : 200; // Search only specific skip or a range
        const minSkip = requiredSkip ? requiredSkip : 1;

        for (let skip = minSkip; skip < maxSkip; skip++) {
            for (let start = 0; start < cleanText.length; start++) {
                let sequence = '';
                let path: {row: number, col: number}[] = [];
                let possible = true;
                for (let i = 0; i < searchTerm.length; i++) {
                    const index = start + (i * skip);
                    if (index >= cleanText.length) {
                        possible = false;
                        break;
                    }
                    sequence += cleanText[index];
                    path.push({ row: Math.floor(index / gridWidth), col: index % gridWidth });
                }

                if (possible && sequence === searchTerm) {
                    results.push({ word: searchTerm, direction: 'Forward', skip, verses: `Found starting at index ${start}`, path });
                    if (results.length > 5) return results; // Limit results for performance
                }
            }
        }
        return results;
    }

    public static reduceNumber(num: number): number {
        if ([11, 22, 33].includes(num)) return num;
        let sum = num;
        while (sum > 9) {
            sum = String(sum).split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
            if ([11, 22, 33].includes(sum)) return sum;
        }
        return sum;
    }

    private static hzToNote = (frequency: number) => {
        const noteNames = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
        const n = 12 * (Math.log(frequency / 440) / Math.log(2));
        return `${noteNames[(Math.round(n) + 120) % 12]}${Math.floor(Math.round(n) / 12) + 4}`;
    };

    private static nmToColor = (wavelength: number) => {
        if (wavelength >= 380 && wavelength < 450) return "Violet";
        if (wavelength >= 450 && wavelength < 495) return "Blue";
        if (wavelength >= 495 && wavelength < 570) return "Green";
        if (wavelength >= 570 && wavelength < 590) return "Yellow";
        if (wavelength >= 590 && wavelength < 620) return "Orange";
        if (wavelength >= 620 && wavelength <= 750) return "Red";
        return "Beyond Visible Spectrum";
    };

    /** SIMULATED voice analysis. Creates a descriptive prompt for Gemini. */
    public static analyzeVoiceSample(): string {
        const fundamental = (100 + Math.random() * 150).toFixed(1); // Random male/female fundamental freq
        const prosody = ["calm and steady", "energetic and varied", "soft and hesitant", "clear and resonant"][Math.floor(Math.random() * 4)];
        const harmonics = ["rich", "clear", "subtle", "complex"][Math.floor(Math.random() * 4)];

        return `The user has provided a voice sample. A simulated bio-acoustic analysis reveals the following characteristics:
        - Fundamental Frequency: ~${fundamental}Hz
        - Prosody (rhythm and intonation): ${prosody}
        - Harmonic Overtone Series: ${harmonics}
        
        Based on this, please provide a "Voice Resonance Analysis" for their Astrian Signature. This should be a short, esoteric interpretation of what these vocal qualities signify about their inner state, expressive power, and connection to their 'true voice'.`;
    }

    private static getPythagoreanChord = (rootHz: number) => ({ root: rootHz, third: rootHz * (5 / 4), fifth: rootHz * (3 / 2) });
    public static getTempleMusicologyNotes = (value: number): number[] => {
        const rootHz = 110 + (this.reduceNumber(value) * 20); // A2 based arpeggio
        return [rootHz, rootHz * (5/4), rootHz * (3/2), rootHz * 2]; // root, 3rd, 5th, octave
    };

    public static performExhaustiveResonanceCheck(query: string): ExhaustiveResonanceResult {
        const gematriaValue = this.calculateChaldean(query);
        const baseFrequency = 256 + (gematriaValue * 4.15); // C4 based scale
        const chord = this.getPythagoreanChord(baseFrequency);
        const rootNote = this.hzToNote(chord.root);
        
        const primaryResonance: ResonanceProfile = {
            sonic: {
                root: { hz: parseFloat(chord.root.toFixed(2)), note: rootNote },
                third: { hz: parseFloat(chord.third.toFixed(2)), note: this.hzToNote(chord.third) },
                fifth: { hz: parseFloat(chord.fifth.toFixed(2)), note: this.hzToNote(chord.fifth) },
                chordName: `${rootNote.replace(/[0-9]/g, '')} Major`
            },
            light: { wavelength: Math.round(380 + ((gematriaValue % 100) * 3.7)), color: this.nmToColor(380 + ((gematriaValue % 100) * 3.7)) },
            element: this.data.periodicTable[gematriaValue] ? { ...this.data.periodicTable[gematriaValue], atomicNumber: gematriaValue } : null
        };
        
        const cascadeSources = [
            { data: this.data.thermoData, domain: 'Thermodynamics', format: (v: any, k: number) => ({ correspondence: `${v.event} of ${v.substance} (${k}${v.unit})` }) },
            { data: this.data.sacredGeoData, domain: 'Sacred Geometry', format: (v: any, k: number) => ({ correspondence: `${v.property} of a ${v.shape} (${k}°)` }) },
            { data: this.data.apocryphalKnowledge, domain: 'Apocryphal & Esoteric Lore', format: (v: any) => ({ correspondence: `${v.concept} (from the ${v.source})` }) },
            { data: this.data.ancientMeasuresData, domain: 'Ancient Measures', format: (v: any) => ({ correspondence: `${v.name} (${v.culture}, ${v.type})` }) },
            { data: this.data.celestialAndNauticalData, domain: 'Celestial & Nautical Measures', format: (v: any) => ({ correspondence: `${v.concept} (${v.field})` }) },
        ];

        const resonanceCascade: CascadeCorrespondence[] = cascadeSources.flatMap(source => 
            Object.entries(source.data)
                .filter(([k]) => parseInt(k) === gematriaValue)
                .map(([k, v]) => ({
                    domain: source.domain,
                    correspondence: source.format(v, parseInt(k)).correspondence,
                    explanation: `The value ${gematriaValue} directly corresponds to this key point.`
                }))
        );

        return { query, gematriaValue, primaryResonance, resonanceCascade };
    }

    public static generateCustomEntrainmentProfile = (data: AWEFormData): Omit<EntrainmentProfile, 'explanation'> => {
        const nameSignature = this.reduceNumber(this.calculateChaldean(data.fullNameAtBirth));
        const dateParts = data.birthDate.split('-').map(p => parseInt(p, 10));
        const dateSignature = this.reduceNumber(dateParts.reduce((a, b) => a + b, 0));
        const beatFrequency = 2 + (nameSignature % 10);
        const baseFrequency = 100 + (dateSignature * 10);
        let state: EntrainmentProfile['state'] = 'gamma';
        if (beatFrequency < 4) state = 'delta'; else if (beatFrequency < 8) state = 'theta'; else if (beatFrequency < 13) state = 'alpha'; else if (beatFrequency < 38) state = 'beta';
        return { state, baseFrequency, beatFrequency };
    };
    
    public static generateProfileFromResonance = (resonance: ResonanceProfile, gematriaValue: number): Omit<EntrainmentProfile, 'explanation'> => {
        const beatFrequency = 2 + (this.reduceNumber(gematriaValue) % 10);
        let state: EntrainmentProfile['state'] = 'gamma';
        if (beatFrequency < 4) state = 'delta'; else if (beatFrequency < 8) state = 'theta'; else if (beatFrequency < 13) state = 'alpha'; else if (beatFrequency < 38) state = 'beta';
        return { state, baseFrequency: resonance.sonic.root.hz, beatFrequency };
    };
}