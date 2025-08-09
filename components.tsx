import React, { useState, useMemo, useEffect, useRef, useCallback, memo, FC, ReactNode } from 'react';
import * as htmlToImage from 'html-to-image';
import { GenerateContentResponse } from "@google/genai";
import { AudioService, AstrianEngine } from './services';
import { useCorpusBooks } from './hooks';
import { StrongsEntry, corpusList } from './corpora';
import {
    GematriaAnalysis, DeepELSAnalysisResult, CartographerAnalysisResults, AWEFormData, TextualCartographerFormData,
    ELSInvestigatorFormData, EntrainmentProfile, SessionRecord, GeneralAnalysisResult, AWEAnalysisResult,
    ApocryphalAnalysisResult, View, StrongsResult, ELSResult, GuidingIntent, ExhaustiveResonanceResult,
    PalmistryAnalysisResult, AstrianDayPlannerResult, VoiceResonanceAnalysisResult, Toast, AIMessage, ProactiveSuggestion
} from './types';

/**
 * components.tsx
 *
 * Contains all React components for the Astrian Key application,
 * designed for the "Glass & Starlight" UI paradigm.
 */

// =================================================================================================
// --- GENERIC UI & VISUALS ---
// =================================================================================================

export const KaleidoscopicBackground: FC = memo(() => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { antialias: true, powerPreference: 'low-power' });
        if (!gl) {
            console.error("WebGL not supported, falling back to simple background.");
            canvas.style.backgroundColor = '#0c0a1d';
            return;
        }

        const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;
            uniform vec2 u_resolution;
            uniform float u_time;

            void main() {
                vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
                vec2 original_uv = uv;
                float time = u_time * 0.05;

                float zoom = 1.2 + sin(time) * 0.3;
                uv *= zoom;
                float angle = time * 0.2;
                mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                uv = rotation * uv;

                // Kaleidoscopic repetitions
                uv = fract(uv * 3.0) - 0.5;
                uv = abs(uv);
                
                // Fractal-like iteration
                for(int i = 0; i < 6; i++) {
                    uv = abs(uv) / dot(uv, uv) - vec2(0.9 + sin(time * 0.1) * 0.2);
                }
                
                float color = length(uv);
                
                // "Cool" color mapping, emphasizing blues and purples at the edges.
                vec3 finalColor = vec3(pow(color, 3.0) * 0.05, pow(color, 2.0) * 0.15, pow(color, 1.5) * 0.35);

                // Add a subtle vignette
                float vignette = smoothstep(1.0, 0.4, length(original_uv));
                finalColor *= vignette;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
        const timeUniformLocation = gl.getUniformLocation(program, "u_time");
        
        gl.useProgram(program);

        let animationFrameId: number;
        const startTime = Date.now();

        const render = () => {
            if (!canvas || canvas.clientHeight === 0) return;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }

            const currentTime = (Date.now() - startTime) * 0.001;
            
            gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
            gl.uniform1f(timeUniformLocation, currentTime);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteBuffer(positionBuffer);
        };
    }, []);

    return <canvas ref={canvasRef} className="kaleidoscopic-background"></canvas>;
});

export const SubliminalGlyph: FC<{ seed: number }> = memo(({ seed }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width;
        const a = seed % 10 + 1;
        const b = Math.floor(seed / 10) % 10 + 1;
        const phase = (seed % 7) * (Math.PI / 14);
        let time = 0;
        let animFrame: number;

        const draw = () => {
            if(!ctx) return;
            ctx.clearRect(0, 0, size, size);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
            ctx.lineWidth = 1.5;

            for (let i = 0; i < 1000; i++) {
                const t = (i / 999) * 4 * Math.PI;
                const x = size / 2 + (size / 2 - 10) * Math.sin(a * t + phase + time);
                const y = size / 2 + (size / 2 - 10) * Math.sin(b * t);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            time += 0.002;
            animFrame = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animFrame);
    }, [seed]);

    return (
        <div className="subliminal-glyph-container">
            <canvas ref={canvasRef} width="100" height="100"></canvas>
        </div>
    );
});

export const ToastContainer: FC<{ toasts: Toast[], onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

const ToastItem: FC<{ toast: Toast, onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div className={`toast ${toast.type}`} onClick={() => onDismiss(toast.id)}>
            {toast.message}
        </div>
    );
};


export const InteractiveNumber: FC<{ value: number | string, onInteract: (num: number) => void }> = ({ value, onInteract }) => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (isNaN(num)) return <>{value}</>;
    return <span className="interactive-number" onClick={() => onInteract(num)}>{value}</span>
};

export const LoadingIndicator: FC<{ text?: string }> = ({ text = "ANALYZING..." }) => <div className="loading-indicator-inline"><div className="typing-indicator"><span/><span/><span/></div>{text}</div>;
export const ErrorMessage: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => <div className="error-message">{message}{onRetry && <button onClick={onRetry} className="action-btn secondary-action retry-btn">Retry Analysis</button>}</div>;

export const CollapsibleCard: FC<{ title: string; children: ReactNode; startOpen?: boolean }> = ({ title, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleShare = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (cardRef.current) {
            htmlToImage.toPng(cardRef.current, { 
                backgroundColor: '#0c0a1d',
                // Temporarily open the card for the screenshot if it's closed
                style: {
                   maxHeight: isOpen ? undefined : '3000px',
                   overflow: isOpen ? undefined : 'visible'
                }
             })
            .then(url => { 
                const link = document.createElement('a');
                link.download = `astrian-key-analysis-${title.toLowerCase().replace(/\s/g, '-')}.png`;
                link.href = url;
                link.click();
            });
        }
    }, [title, isOpen]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const { left, top, width, height } = cardRef.current.getBoundingClientRect();
        const x = e.clientX - left - width / 2;
        const y = e.clientY - top - height / 2;
        const rotateY = (x / width) * 10;
        const rotateX = -(y / height) * 10;
        cardRef.current.style.transform = `scale(1.01) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = 'scale(1) perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    return (
        <div 
            ref={cardRef}
            className={`card collapsible-card ${isOpen ? 'open' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
             <button title="Share as Image" className="share-card-btn" onClick={handleShare}>⍈</button>
            <div className="collapsible-title" onClick={() => setIsOpen(!isOpen)}>
                <h4>{title}</h4>
                <span className="collapsible-icon">{isOpen ? '−' : '+'}</span>
            </div>
            <div className="content-container">
                <div className="content">{children}</div>
            </div>
        </div>
    );
};

export const RevelatoryScroll: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="revelatory-scroll-viewport">
            <div className="revelatory-scroll-container">
                <div className="revelatory-scroll-content">
                    {React.Children.map(children, (child, index) =>
                        <div key={index} className="scroll-reveal-item">{child}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// =================================================================================================
// --- AUDIO COMPONENTS ---
// =================================================================================================

export const AudioPlayer: FC<{ frequencies: number[], fileName: string, mode: 'chord' | 'arpeggio', waveform: OscillatorType, noteDuration?: number }> = memo(({ frequencies, fileName, mode, waveform, noteDuration = 0.4 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const timeoutsRef = useRef<number[]>([]);
    const stopAudio = useCallback(() => { if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; } timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; setIsPlaying(false); }, []);
    const playAudio = useCallback(() => { if (isPlaying) return; const context = new (window.AudioContext || (window as any).webkitAudioContext)(); audioContextRef.current = context; setIsPlaying(true); if (mode === 'chord') { const masterGain = context.createGain(); masterGain.gain.setValueAtTime(0.2, context.currentTime); masterGain.connect(context.destination); frequencies.forEach(freq => { const osc = context.createOscillator(); osc.type = waveform; osc.frequency.setValueAtTime(freq, context.currentTime); osc.connect(masterGain); osc.start(); }); } else { frequencies.forEach((freq, i) => { const timeoutId = window.setTimeout(() => { if (!audioContextRef.current || audioContextRef.current.state === 'closed') return; const masterGain = context.createGain(); masterGain.connect(context.destination); masterGain.gain.setValueAtTime(0, context.currentTime); masterGain.gain.linearRampToValueAtTime(0.25, context.currentTime + 0.05); masterGain.gain.linearRampToValueAtTime(0, context.currentTime + noteDuration - 0.05); const osc = context.createOscillator(); osc.type = waveform; osc.frequency.setValueAtTime(freq, context.currentTime); osc.connect(masterGain); osc.start(); osc.stop(context.currentTime + noteDuration); }, i * noteDuration * 1000); timeoutsRef.current.push(timeoutId); }); const finalTimeout = window.setTimeout(stopAudio, frequencies.length * noteDuration * 1000); timeoutsRef.current.push(finalTimeout); } }, [isPlaying, frequencies, mode, waveform, noteDuration, stopAudio]);
    const handleDownload = useCallback(async () => { try { const blob = await AudioService.renderAudioToWav(frequencies, mode === 'chord' ? 2 : noteDuration, waveform); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${fileName}.wav`; link.click(); URL.revokeObjectURL(link.href); } catch (e) { console.error("Failed to render audio:", e); } }, [frequencies, fileName, mode, waveform, noteDuration]);
    useEffect(() => stopAudio, [stopAudio]);
    return <div className="temple-arpeggio-player-container"><button onClick={isPlaying ? stopAudio : playAudio} className="action-btn secondary-action">{isPlaying ? `■ Stop` : `► Play`}</button><button onClick={handleDownload} className="els-action-btn download-audio-btn">Download</button></div>;
});

// =================================================================================================
// --- DISPLAY COMPONENTS (SUB-COMPONENTS) ---
// =================================================================================================

const GematriaDisplay: FC<{ analysis: GematriaAnalysis[], onNumberInteract: (num: number) => void }> = memo(({ analysis, onNumberInteract }) => <CollapsibleCard title="Gematria Analysis" startOpen>{analysis.map(item => <div key={item.word} className="gematria-word-card"><h3><span className="hebrew-letter">{item.word}</span> ({item.transliteration})</h3><p><em>{item.englishMeaning}</em></p><div className="gematria-grid"><div>Standard</div><div><InteractiveNumber value={item.standard} onInteract={onNumberInteract} /></div><div>Ordinal</div><div><InteractiveNumber value={item.ordinal} onInteract={onNumberInteract} /></div><div>Reduced</div><div><InteractiveNumber value={item.reduced} onInteract={onNumberInteract} /></div><div>Atbash</div><div><InteractiveNumber value={item.atbashValue} onInteract={onNumberInteract} /> ({item.atbashWord})</div></div><AudioPlayer frequencies={AstrianEngine.getTempleMusicologyNotes(item.standard)} fileName={`gematria-${item.transliteration}-${item.standard}`} mode="arpeggio" waveform="sawtooth" /></div>)}</CollapsibleCard>);
const ELSDisplay: FC<{ analysis: DeepELSAnalysisResult; textLang?: 'hebrew' | 'english' | 'greek', onNumberInteract: (num: number) => void }> = memo(({ analysis, textLang = 'hebrew', onNumberInteract }) => {
    const [highlightedPath, setHighlightedPath] = useState<number[] | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    if (!analysis?.textGrid?.text) return null;
    const gridCols = Math.max(...analysis.textGrid.text.split('\n').map(row => row.length));
    const chars = analysis.textGrid.text.replace(/\n/g, '').split('');
    const handleDownload = useCallback(() => { if (gridRef.current) htmlToImage.toPng(gridRef.current, { backgroundColor: '#0c0a1d' }).then(url => { const link = document.createElement('a'); link.download = 'astrian-key-els-grid.png'; link.href = url; link.click(); }); }, [gridRef]);
    return <CollapsibleCard title="Equidistant Letter Sequence (ELS) Analysis" startOpen><p className="explanation-text">{analysis.textGrid.explanation}</p><div ref={gridRef} className={`text-grid-container ${textLang}-grid`} style={{ '--grid-cols': gridCols } as React.CSSProperties}>{chars.map((char, index) => <span key={index} className={`grid-char ${highlightedPath?.includes(index) ? 'highlight' : ''}`} style={{ '--highlight-index': highlightedPath?.includes(index) ? analysis.elsAnalysis.findIndex(e => e.path.map(p => p.row * gridCols + p.col).includes(index)) : 0 } as React.CSSProperties}>{char}</span>)}</div><div className="els-list">{analysis.elsAnalysis.map((result, index) => <div key={index} className="els-result-item" style={{'--highlight-index': index} as React.CSSProperties} onMouseEnter={() => setHighlightedPath(result.path.map(p => p.row * gridCols + p.col))} onMouseLeave={() => setHighlightedPath(null)}><h4>Found: <span className={`${textLang}-text`}>{result.word}</span></h4><p>Direction: {result.direction}, Skip: <InteractiveNumber value={result.skip} onInteract={onNumberInteract} /></p></div>)}</div><div className="els-actions"><button onClick={handleDownload} className="els-action-btn download-grid-btn">Download Grid</button></div></CollapsibleCard>;
});

const ResonanceCascadeDisplay: FC<{ cascade: any[], value: number, onNumberInteract: (num: number) => void }> = memo(({ cascade, value, onNumberInteract }) => {
    if (cascade.length === 0) return null;
    return <CollapsibleCard title="Resonance Cascade"><div className="resonance-cascade-container"><h3 className="resonance-cascade-title">Correspondences for <InteractiveNumber value={value} onInteract={onNumberInteract} /></h3>{cascade.map((p, i) => <div key={i} className="resonance-cascade-module"><h4 className="resonance-cascade-domain">{p.domain}</h4><p>{p.correspondence}</p></div>)}</div></CollapsibleCard>;
});

const StrongsLookup: FC<{ value: number; isHebrew: boolean; onNumberInteract: (num: number) => void }> = memo(({ value, isHebrew, onNumberInteract }) => {
    const [result, setResult] = useState<StrongsResult | null>(null);
    const handleLookup = useCallback(() => { const entry = AstrianEngine.getLocalStrongsEntry(value, isHebrew); setResult(entry ? { number: value, ...entry } : null); }, [value, isHebrew]);
    return <CollapsibleCard title="Lexicon Cross-Validation"><div className="lexicon-cross-validation-container"><p>Cross-reference Gematria value <InteractiveNumber value={value} onInteract={onNumberInteract}/> with the internal Strong's Concordance.</p><button onClick={handleLookup} className="action-btn secondary-action">Lookup #{value}</button>{result && <div className="lexicon-entry"><h4>Strong's Concordance Entry</h4><p><strong>#{result.number} {result.originalWord}</strong> <span className="transliteration">({result.transliteration})</span> — <span className="definition">{result.definition}</span></p></div>}</div></CollapsibleCard>;
});

// =================================================================================================
// --- DISPLAY COMPONENTS (PRIMARY) ---
// =================================================================================================

export const AstrianKeyDisplay: FC<{ data: GeneralAnalysisResult, onStartEntrainment: (profile: EntrainmentProfile) => void, onNumberInteract: (num: number) => void }> = memo(({ data, onStartEntrainment, onNumberInteract }) => (
    <div className="astrian-key-display-container">
        <CollapsibleCard title={`Astrian Key for: "${data.exhaustiveResonance.query}"`} startOpen>
            <div className="astrian-key-header"><h3>Primary Resonance Value: <InteractiveNumber value={data.exhaustiveResonance.gematriaValue} onInteract={onNumberInteract}/></h3></div>
            <p className="key-response">{data.interpretation}</p>
        </CollapsibleCard>
        <CollapsibleCard title="Multi-Modal Resonance Profile" startOpen>
            <h4>Sonic Resonance</h4><p>A harmonic chord based on the value <InteractiveNumber value={data.exhaustiveResonance.gematriaValue} onInteract={onNumberInteract}/> ({data.exhaustiveResonance.primaryResonance.sonic.chordName})</p>
            <AudioPlayer frequencies={[data.exhaustiveResonance.primaryResonance.sonic.root.hz, data.exhaustiveResonance.primaryResonance.sonic.third.hz, data.exhaustiveResonance.primaryResonance.sonic.fifth.hz]} fileName={`resonance-${data.exhaustiveResonance.query}-${data.exhaustiveResonance.gematriaValue}`} mode="chord" waveform="sine" />
            <h4>Light Spectrum</h4><p>Corresponds to a wavelength of <InteractiveNumber value={data.exhaustiveResonance.primaryResonance.light.wavelength.toFixed(0)} onInteract={onNumberInteract}/> nm, appearing as {data.exhaustiveResonance.primaryResonance.light.color}.</p>
            {data.exhaustiveResonance.primaryResonance.element && <><h4>Elemental Correspondence</h4><p>The value <InteractiveNumber value={data.exhaustiveResonance.primaryResonance.element.atomicNumber} onInteract={onNumberInteract}/> corresponds to the atomic number of {data.exhaustiveResonance.primaryResonance.element.name} ({data.exhaustiveResonance.primaryResonance.element.symbol}).</p></>}
        </CollapsibleCard>
        <ResonanceCascadeDisplay cascade={data.exhaustiveResonance.resonanceCascade} value={data.exhaustiveResonance.gematriaValue} onNumberInteract={onNumberInteract}/>
        <CollapsibleCard title="Brainwave Entrainment Protocol"><p>{data.entrainmentProfile.explanation}</p><button className="action-btn deepen-btn" onClick={() => onStartEntrainment(data.entrainmentProfile)}>Begin {data.entrainmentProfile.state} Entrainment</button></CollapsibleCard>
    </div>
));

const ApocryphalDisplay: FC<{ data: ApocryphalAnalysisResult, onNumberInteract: (num: number) => void }> = memo(({ data, onNumberInteract }) => (
    <div className="apocryphal-cartographic-map-container">
        <CollapsibleCard title={data.analysisTitle || "Apocryphal Analysis"} startOpen>
            {Object.entries(data)
                .filter(([key]) => key !== 'analysisTitle' && (data as any)[key])
                .map(([key, value]) => (
                    <div key={key} className="apocryphal-section">
                        <h4>{(value as any).title || key}</h4>
                        <p className="key-response">{(value as any).explanation}</p>
                    </div>
                ))}
        </CollapsibleCard>
    </div>
));

const HebraicDisplay: FC<{ data: CartographerAnalysisResults, onNumberInteract: (num: number) => void }> = memo(({ data, onNumberInteract }) => (
    <div className="hebraic-cartographic-map-container">
        <CollapsibleCard title="Primary Analysis" startOpen>
            <p><span className="hebrew-text">{data.hebrewText}</span></p>
            <p><strong>Transliteration:</strong> {data.transliteration}</p>
            <p><strong>Translation:</strong> {data.englishTranslation}</p>
        </CollapsibleCard>
        {data.gematriaAnalysis && <GematriaDisplay analysis={data.gematriaAnalysis} onNumberInteract={onNumberInteract} />}
        {data.gematriaAnalysis?.[0]?.standard && <StrongsLookup value={data.gematriaAnalysis[0].standard} isHebrew={true} onNumberInteract={onNumberInteract} />}
        {data.deepElsAnalysis && <ELSDisplay analysis={data.deepElsAnalysis} textLang="hebrew" onNumberInteract={onNumberInteract} />}
        {Object.entries({
            "Vibrational Analysis": data.vibrationalAnalysis, 
            "Cosmic Architecture": data.cosmicArchitecture, 
            "Archetypal Drivers": data.archetypalDrivers, 
            "Hebraic Keys of Mastery": data.hebraicKeysOfMastery, 
            "Core Challenge (Protocol Unflinching Truth)": data.protocolUnflinchingTruth
        }).map(([key, value]) => value && <CollapsibleCard key={key} title={key}><p className="key-response">{(value as any).explanation || (value as any).generatedText || `${(value as any).challenge} ${(value as any).softLanding}`}</p></CollapsibleCard>)}
    </div>
));

const HellenisticDisplay: FC<{ data: CartographerAnalysisResults, onNumberInteract: (num: number) => void }> = memo(({ data, onNumberInteract }) => (
    <div className="hellenistic-cartographic-map-container">
        <CollapsibleCard title="Primary Analysis" startOpen>
            <p><span className="greek-text">{data.greekText}</span></p>
            <p><strong>Transliteration:</strong> {data.transliteration}</p>
            <p><strong>Translation:</strong> {data.englishTranslation}</p>
        </CollapsibleCard>
        {data.isopsephyAnalysis && (
            <CollapsibleCard title="Isopsephy Analysis">
                {data.isopsephyAnalysis.map(item => <p key={item.word}><strong>{item.word}:</strong> <InteractiveNumber value={item.value} onInteract={onNumberInteract} /></p>)}
            </CollapsibleCard>
        )}
        {data.isopsephyAnalysis?.[0]?.value && <StrongsLookup value={data.isopsephyAnalysis[0].value} isHebrew={false} onNumberInteract={onNumberInteract} />}
        {data.deepElsAnalysis && <ELSDisplay analysis={data.deepElsAnalysis} textLang="greek" onNumberInteract={onNumberInteract} />}
        {Object.entries({
            "Vibrational Analysis": data.vibrationalAnalysis, 
            "Cosmic Architecture (Gnostic)": data.cosmicArchitecture, 
            "Archetypal Drivers (Gnostic)": data.archetypalDrivers, 
            "Gnostic Synthesis": data.gnosticSynthesis, 
            "Core Challenge (Protocol Unflinching Truth)": data.protocolUnflinchingTruth
        }).map(([key, value]) => value && <CollapsibleCard key={key} title={key}><p className="key-response">{(value as any).explanation || `${(value as any).challenge} ${(value as any).softLanding}`}</p></CollapsibleCard>)}
    </div>
));

export const TextualCartographicMap: FC<{ data: CartographerAnalysisResults, type: AIMessage['analysisType'], onNumberInteract: (num: number) => void }> = memo(({ data, type, onNumberInteract }) => {
    switch(type) {
        case 'atc':
        case 'els':
            return <HebraicDisplay data={data} onNumberInteract={onNumberInteract} />;
        case 'hellenistic':
            return <HellenisticDisplay data={data} onNumberInteract={onNumberInteract} />;
        case 'apocryphal':
            return <ApocryphalDisplay data={data as unknown as ApocryphalAnalysisResult} onNumberInteract={onNumberInteract} />;
        default:
            return null;
    }
});

export const AWEAnalysisDisplay: FC<{ data: AWEAnalysisResult, onStartEntrainment: (profile: EntrainmentProfile) => void, onNumberInteract: (num: number) => void }> = memo(({ data, onStartEntrainment, onNumberInteract }) => (
    <div className="awe-display-container">{Object.entries(data).filter(([key]) => key !== 'suggestedEntrainmentProfile' && key !== 'guidingQuestion').map(([key, value]) => (<CollapsibleCard key={key} title={(value as any).title || key.replace(/([A-Z])/g, ' $1').trim()} startOpen><p className="key-response">{(value as any).explanation}</p></CollapsibleCard>))}<CollapsibleCard title="Brainwave Entrainment Protocol" startOpen><p>{data.suggestedEntrainmentProfile.explanation}</p><button className="action-btn deepen-btn" onClick={() => onStartEntrainment(data.suggestedEntrainmentProfile)}>Begin {data.suggestedEntrainmentProfile.state} Entrainment</button></CollapsibleCard></div>
));

export const OracularLensDisplay: FC<{data: GenerateContentResponse}> = memo(({data}) => {
    const sources = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
    return <div className="oracular-lens-container"><CollapsibleCard title="The Oracular Lens" startOpen><p className="key-response">{data.text}</p></CollapsibleCard>{sources && sources.length > 0 && (<CollapsibleCard title="Consulted Sources"><ul className="source-list">{sources.map((source, index) => (<li key={index} className="source-item"><a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="source-link">{source.web?.title || 'Untitled Source'}</a><span className="source-uri">{source.web?.uri}</span></li>))}</ul></CollapsibleCard>)}</div>;
});

export const PalmistryAnalysisDisplay: FC<{ data: PalmistryAnalysisResult, onNumberInteract: (num: number) => void }> = memo(({ data, onNumberInteract }) => (
    <div className="palmistry-display-container">
       <CollapsibleCard title={data.analysisTitle || "Palmistry Reading"} startOpen>
            <h4>{data.overallReading.title}</h4>
            <p className="key-response">{data.overallReading.explanation}</p>
       </CollapsibleCard>
       {Object.entries(data).filter(([key]) => key !== 'analysisTitle' && key !== 'overallReading' && (data as any)[key]).map(([key, value]) => (
           <CollapsibleCard key={key} title={(value as any).title}>
               <p className="key-response">{(value as any).explanation}</p>
           </CollapsibleCard>
       ))}
    </div>
));

export const VoiceResonanceAnalysisDisplay: FC<{ data: VoiceResonanceAnalysisResult, onNumberInteract: (num: number) => void }> = memo(({ data, onNumberInteract }) => (
    <div className="voice-resonance-display-container">
       <CollapsibleCard title={data.analysisTitle || "Voice Resonance Analysis"} startOpen>
           <p className="key-response">A reading based on the tonal and rhythmic qualities of your voice.</p>
       </CollapsibleCard>
       {Object.entries(data).filter(([key]) => key !== 'analysisTitle' && (data as any)[key]).map(([key, value]) => (
           <CollapsibleCard key={key} title={(value as any).title}>
               <p className="key-response">{(value as any).explanation}</p>
           </CollapsibleCard>
       ))}
    </div>
));

export const AstrianDayPlannerDisplay: FC<{ data: AstrianDayPlannerResult, onNumberInteract: (num: number) => void }> = memo(({ data, onNumberInteract }) => (
    <div className="astrian-planner-display-container">
        <CollapsibleCard title={data.planTitle} startOpen>
            <p className="key-response">{data.overview}</p>
        </CollapsibleCard>
        {data.schedule.map((item, index) => (
            <CollapsibleCard key={index} title={`${item.timeRange}: ${item.activity}`}>
                <p><strong>Esoteric Advice:</strong> {item.esotericAdvice}</p>
                <p><strong>Elemental Alignment:</strong> {item.elementalAlignment}</p>
            </CollapsibleCard>
        ))}
    </div>
));

const ProactiveSuggestionDisplay: FC<{suggestion: ProactiveSuggestion}> = ({suggestion}) => {
    return (
        <button onClick={suggestion.action} className="proactive-suggestion-btn">
            {suggestion.text}
        </button>
    )
}


// =================================================================================================
// --- FORM COMPONENTS ---
// =================================================================================================

const AnalysisForm: FC<{title: string, children: ReactNode, onBack?: () => void, description?: string}> = ({title, children, onBack, description}) => (
    <div className="form-container card">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
            {onBack && <button onClick={onBack} className="action-btn secondary-action" style={{position: 'absolute', left: 0}}>Back</button>}
            <h1 style={{textAlign: 'center', margin: '0 auto'}}>{title}</h1>
        </div>
        {description && <p className="section-description" style={{textAlign: 'center'}}>{description}</p>}
        {children}
    </div>
);

export const AWEForm: FC<{ data: AWEFormData, onUpdate: (data: AWEFormData) => void, onQuery: (data: AWEFormData) => void, onBack: () => void, isAweComplete: boolean, palmistryDone: boolean, voiceDone: boolean }> = ({ data, onUpdate, onQuery, onBack, isAweComplete, palmistryDone, voiceDone }) => {
    const [formData, setFormData] = useState<AWEFormData>(data);
    
    useEffect(() => {
        setFormData(data);
    }, [data]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const updatedData = { ...formData, [e.target.name]: e.target.value };
        setFormData(updatedData);
        onUpdate(updatedData);
    };
    const handleEventChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => { 
        const newEvents = [...formData.inflectionPoints]; 
        newEvents[index] = { ...newEvents[index], [e.target.name]: e.target.value }; 
        const updatedData = { ...formData, inflectionPoints: newEvents };
        setFormData(updatedData);
        onUpdate(updatedData);
    };
    const addEvent = () => { 
        const updatedData = { ...formData, inflectionPoints: [...formData.inflectionPoints, { description: '', date: '' }] };
        setFormData(updatedData);
        onUpdate(updatedData);
    };
    const removeEvent = (index: number) => {
        const updatedData = { ...formData, inflectionPoints: formData.inflectionPoints.filter((_, i) => i !== index) };
        setFormData(updatedData);
        onUpdate(updatedData);
    };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onQuery(formData); };
    
    const description = "This is your Astrian Signature. The system intelligently populates it based on your queries. You can also edit it directly.";

    return (
        <AnalysisForm title="Your Astrian Signature" onBack={onBack} description={description}>
            <div className="signature-status">
                <h4>Signature Manifestation</h4>
                <ul>
                    <li className={isAweComplete ? 'complete' : 'incomplete'}>Core Profile Data {isAweComplete ? '✓' : '✗'}</li>
                    <li className={palmistryDone ? 'complete' : 'incomplete'}>Palm Reading {palmistryDone ? '✓' : '✗'}</li>
                    <li className={voiceDone ? 'complete' : 'incomplete'}>Voice Resonance {voiceDone ? '✓' : '✗'}</li>
                </ul>
                {!isAweComplete && <p>Please fill out your name, birth information, and central question.</p>}
                {isAweComplete && !palmistryDone && <p>Next step: Perform a Palmistry reading using the '°palm' call sign.</p>}
                {isAweComplete && palmistryDone && !voiceDone && <p>Next step: Perform a Voice Resonance analysis using the '°voice' call sign.</p>}
                {isAweComplete && palmistryDone && voiceDone && <p className="complete">Your signature is manifest. You may now access the Astrian Day Planner ('°planner').</p>}
            </div>
            <form onSubmit={handleSubmit} className="awe-form">
                <div className="awe-section">
                    <div className="form-subgrid"><div className="form-field"><label>Full Name at Birth</label><input type="text" name="fullNameAtBirth" value={formData.fullNameAtBirth} onChange={handleInputChange} maxLength={100} /></div><div className="form-field"><label>Current Name Used</label><input type="text" name="currentNameUsed" value={formData.currentNameUsed} onChange={handleInputChange} maxLength={100}/></div></div>
                    <div className="form-subgrid"><div className="form-field"><label>Birth Date</label><input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange}/></div><div className="form-field"><label>Birth Time</label><input type="time" name="birthTime" value={formData.birthTime} onChange={handleInputChange}/></div></div>
                    <div className="form-field"><label>Birth Location (City, Country)</label><input type="text" name="birthLocation" value={formData.birthLocation} onChange={handleInputChange} maxLength={200}/></div>
                </div>
                <div className="awe-section">
                    <h4 className="awe-section-title">Inflection Points</h4>{formData.inflectionPoints.map((event, index) => <div key={index} className="life-event-row"><input type="text" name="description" placeholder="Event Description" value={event.description} onChange={(e) => handleEventChange(index, e)} maxLength={200} /><input type="date" name="date" value={event.date} onChange={(e) => handleEventChange(index, e)} /><button type="button" onClick={() => removeEvent(index)} className="remove-btn">×</button></div>)}
                    <button type="button" onClick={addEvent} className="action-btn secondary-action add-event-btn">+ Add Inflection Point</button>
                </div>
                <div className="awe-section">
                    <h4 className="awe-section-title">Relational & Geographic Harmonics</h4>
                    <div className="form-field"><label>Describe a primary harmonious relationship.</label><textarea name="relationalNodeHarmonious" value={formData.relationalNodeHarmonious} onChange={handleInputChange} maxLength={1000}></textarea></div>
                    <div className="form-field"><label>Describe a primary challenging relationship.</label><textarea name="relationalNodeChallenging" value={formData.relationalNodeChallenging} onChange={handleInputChange} maxLength={1000}></textarea></div>
                    <div className="form-field"><label>Describe a deeply connected geographic location.</label><input type="text" name="geographicAnchor" value={formData.geographicAnchor} onChange={handleInputChange} maxLength={200}/></div>
                </div>
                <div className="awe-section">
                    <h4 className="awe-section-title">Central Question</h4>
                    <div className="form-field"><label>What is the central question of your life right now?</label><textarea name="centralQuestion" value={formData.centralQuestion} onChange={handleInputChange} maxLength={1000}></textarea></div>
                </div>
                <div className="form-actions"><button type="submit" className="action-btn deepen-btn">Perform Manual AWE Cascade</button><button type="button" onClick={onBack} className="action-btn secondary-action">Back to Main Query</button></div>
            </form>
        </AnalysisForm>
    );
};

export const TextualCartographerForm: FC<{ onQuery: (data: TextualCartographerFormData) => void, onBack: () => void }> = ({ onQuery, onBack }) => {
    const [formData, setFormData] = useState<TextualCartographerFormData>({ corpus: corpusList[0], book: '' });
    const availableBooks = useCorpusBooks(formData.corpus);
    
    useEffect(() => {
        if (availableBooks.length > 0 && !availableBooks.includes(formData.book)) {
            setFormData(f => ({ ...f, book: availableBooks[0] }));
        }
    }, [availableBooks, formData.book]);

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onQuery(formData); };

    return <AnalysisForm title="Textual Cartographer" onBack={onBack}><form onSubmit={handleSubmit} className="atc-form"><div className="atc-section"><h4 className="atc-section-title">Source Text Selection</h4><p className="section-description">Select a corpus and a book to perform a deep, general analysis from the internal library.</p><div className="form-field"><label htmlFor="corpus">Corpus</label><select id="corpus" name="corpus" value={formData.corpus} onChange={handleInputChange}>{corpusList.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="form-field"><label htmlFor="book">Book</label><select id="book" name="book" value={formData.book} onChange={handleInputChange} disabled={!availableBooks.length}>{availableBooks.map(b => <option key={b} value={b}>{b}</option>)}</select></div></div><div className="form-actions" style={{justifyContent: 'center'}}><button type="submit" className="action-btn deepen-btn">Chart the Territory</button></div></form></AnalysisForm>;
};

export const ELSInvestigator: FC<{ onBack: () => void, onAnalyze: (result: ELSResult, context: { corpus: string, book: string }) => void }> = ({ onBack, onAnalyze }) => {
    const [formData, setFormData] = useState<ELSInvestigatorFormData>({ corpus: corpusList[0], book: '', searchTerm: '', contextualSeed: '' });
    const [results, setResults] = useState<ELSResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const availableBooks = useCorpusBooks(formData.corpus);
    const isHebrewCorpus = useMemo(() => formData.corpus.includes("Hebrew"), [formData.corpus]);
    
    useEffect(() => { 
        if (availableBooks.length > 0 && !availableBooks.includes(formData.book)) {
             setFormData(f => ({ ...f, book: availableBooks[0] }));
        }
    }, [availableBooks, formData.book]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setResults(null);
        if (!formData.searchTerm) { setError("A search term is required."); return; }
        setIsLoading(true);
        setTimeout(() => {
            const corpusData = AstrianEngine.getCorpus(formData.corpus);
            const fullText = corpusData ? corpusData[formData.book] : undefined;
            if (!fullText) { setError(`Corpus or book not found.`); setIsLoading(false); return; }
            const elsResults = AstrianEngine.findELS(fullText, formData.searchTerm, formData.contextualSeed);
            setResults(elsResults); setIsLoading(false);
        }, 0);
    };
    return <AnalysisForm title="ELS Investigator" onBack={onBack}><form onSubmit={handleSubmit}><div className="atc-section"><h4 className="atc-section-title">Investigation Parameters</h4><p className="section-description">Find hidden sequences. For a deeper search, provide a Contextual Seed (e.g., a name) to use its Gematria value as the required skip distance.</p><div className="form-field"><label>Corpus</label><select name="corpus" value={formData.corpus} onChange={handleInputChange}>{corpusList.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="form-field"><label>Book</label><select name="book" value={formData.book} onChange={handleInputChange} disabled={!availableBooks.length}>{availableBooks.map(b => <option key={b} value={b}>{b}</option>)}</select></div><div className="form-field"><label>Search Term (in original language)</label><input type="text" name="searchTerm" className={isHebrewCorpus ? "hebrew-input" : ""} value={formData.searchTerm} onChange={handleInputChange} required maxLength={50} /></div><div className="form-field"><label>Contextual Seed (Optional, Hebrew)</label><input type="text" name="contextualSeed" className={isHebrewCorpus ? "hebrew-input" : ""} placeholder={isHebrewCorpus ? "e.g., דוד" : "e.g., David"} value={formData.contextualSeed} onChange={handleInputChange} maxLength={50}/></div></div><div className="form-actions" style={{justifyContent: 'center'}}><button type="submit" className="action-btn deepen-btn" disabled={isLoading}>{isLoading ? 'Investigating...' : 'Investigate'}</button></div></form>{isLoading && <LoadingIndicator text="INVESTIGATING..." />}{error && <ErrorMessage message={error} />}{results && (<div className="els-investigator-results card"><h3 className="results-title">{results.length > 0 ? `Found ${results.length} sequence(s)` : `No sequences found`}</h3><div className="els-list">{results.map((result, index) => (<div key={index} className="els-result-item" style={{'--highlight-index': index} as React.CSSProperties}><h4>Found: <span className="hebrew-text">{result.word}</span></h4><p>Direction: {result.direction}, Skip: {result.skip}</p><button onClick={() => onAnalyze(result, { corpus: formData.corpus, book: formData.book })} className="action-btn secondary-action">Analyze with ATC</button></div>))}</div></div>)}</AnalysisForm>;
};

export const GenericQueryForm: FC<{ onQuery: (query: string) => void, onBack: () => void, title: string, prompt: string, inputLabel: string }> = ({ onQuery, onBack, title, prompt, inputLabel }) => {
    const [query, setQuery] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onQuery(query); };
    return <AnalysisForm title={title} onBack={onBack}><form onSubmit={handleSubmit}><p className="section-description">{prompt}</p><div className="form-field"><label>{inputLabel}</label><input type="text" value={query} onChange={(e) => setQuery(e.target.value)} required maxLength={500}/></div><div className="form-actions" style={{justifyContent: 'center'}}><button type="submit" className="action-btn deepen-btn">Initiate</button></div></form></AnalysisForm>;
};

// =================================================================================================
// --- VIEW COMPONENTS ---
// =================================================================================================

export const StelaCalibrationView: FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width;
        let time = 0;
        let animFrame: number;
        const draw = () => {
            if(!ctx) return;
            time += 0.01;
            ctx.clearRect(0, 0, size, size);
            ctx.lineWidth = 0.5;
            for(let i=0; i < 20; i++) {
                ctx.beginPath();
                const shade = Math.floor(150 + Math.sin(time + i/5) * 50);
                ctx.strokeStyle = `rgba(${shade}, ${shade+20}, 255, 0.3)`;
                ctx.arc(
                    size / 2 + Math.cos(i * Math.PI / 10) * (size/4 + Math.sin(time) * 10), 
                    size / 2 + Math.sin(i * Math.PI / 10) * (size/4 + Math.cos(time) * 10),
                    size / 3 + Math.sin(time * 2 + i) * 15,
                    0, 2 * Math.PI
                );
                ctx.stroke();
            }
            animFrame = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animFrame);
    }, []);

    return (
        <div className="stela-calibration-container">
            <canvas ref={canvasRef} className="stela-canvas" width="300" height="300"></canvas>
            <p className="stela-status-text">Calibrating Textual Matrix...</p>
        </div>
    );
};

const CallSignMenu: FC<{ onSelect: (sign: string) => void, onClose: () => void, isPlannerUnlocked: boolean }> = ({ onSelect, onClose, isPlannerUnlocked }) => {
    const callSigns = [
        { sign: '°atc', name: 'Textual Cartographer', description: 'Analyze a book from a corpus.' },
        { sign: '°els', name: 'ELS Investigator', description: 'Find equidistant letter sequences.' },
        { sign: '°awe', name: 'Astrian Signature', description: 'View/edit your personal resonance profile.' },
        { sign: '°oracular', name: 'Oracular Lens', description: 'Ask a question using search grounding.' },
        { sign: '°palm', name: 'Palmistry', description: 'Read the lines of your hand.' },
        { sign: '°voice', name: 'Voice Resonance', description: 'Analyze your vocal signature.' },
        { sign: '°entrain', name: 'Brainwave Entrainment', description: 'Select a consciousness state.' },
        { sign: '°planner', name: 'Astrian Day Planner', description: 'Requires complete Signature.', disabled: !isPlannerUnlocked },
        { sign: '°session', name: 'Session Management', description: 'View and manage session history.' },
    ];
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('.call-sign-toggle')) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={menuRef} className="call-sign-menu card">
            <h3>Call Signs</h3>
            <ul>
                {callSigns.map(cs => (
                    <li key={cs.sign} onClick={() => !cs.disabled && onSelect(cs.sign)} className={cs.disabled ? 'disabled' : ''}>
                        <strong>{cs.name}</strong> <span>({cs.sign})</span>
                        <p>{cs.description}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const ChatView: FC<{ 
    history: SessionRecord[], 
    isLoading: boolean, 
    error: string | null,
    onSendMessage: (msg: string) => void,
    onRetry: () => void,
    guidingIntent: GuidingIntent,
    onIntentChange: (intent: GuidingIntent) => void,
    isPlannerUnlocked: boolean,
    onNumberInteract: (num: number) => void
}> = ({ history, isLoading, error, onSendMessage, onRetry, guidingIntent, onIntentChange, isPlannerUnlocked, onNumberInteract }) => {
    const [query, setQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyEndRef = useRef<HTMLDivElement>(null);
    const [_, setComponentMap] = useState({}); // To force re-render for components

    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSendMessage(query.trim());
            setQuery('');
            setIsMenuOpen(false);
        }
    };
    
    const handleSelectCallSign = (sign: string) => {
        onSendMessage(sign);
        setIsMenuOpen(false);
        inputRef.current?.focus();
    };

    const intents: GuidingIntent[] = ["Neutral", "Harmony & Health", "Clarity & Focus", "Creativity & Inspiration", "Love & Connection"];
    
    // Callback to force re-render when a component inside the chat needs to update its parent
    const forceUpdate = useCallback(() => setComponentMap({}), []);
    
    // Pass forceUpdate to dynamic components so they can trigger a re-render of the chat log
    const renderComponent = (view: View, props: any) => {
        const componentProps = {...props, forceUpdate, onSendMessage}; // Add forceUpdate to props
        switch(view) {
            case 'aweForm': return <AWEForm {...componentProps} />;
            case 'atcForm': return <TextualCartographerForm {...componentProps} />;
            case 'elsInvestigator': return <ELSInvestigator {...componentProps} />;
            case 'oracularLens': return <GenericQueryForm {...componentProps} title="The Oracular Lens" prompt="Ask any question. The system will use Google Search to provide a grounded answer." inputLabel="Your Question"/>;
            case 'session': return <SessionManagementView {...componentProps}/>;
            case 'palmistry': return <PalmistryView {...componentProps} />;
            case 'voiceAnalysis': return <VoiceAnalysisView {...componentProps} />;
            case 'entrainmentSelection': return <EntrainmentSelectionView {...componentProps} />;
            case 'entrainment': return <EntrainmentView {...componentProps} />;
            default: return null;
        }
    };
    
    const renderAIMessageResult = (msg: AIMessage) => {
        if (!msg.result) return null;

        const commonProps = {
            onNumberInteract: onNumberInteract,
            onStartEntrainment: (profile: EntrainmentProfile) => onSendMessage(`°entrain ${profile.state}`),
        };

        switch(msg.analysisType) {
            case 'general': return <AstrianKeyDisplay data={msg.result} {...commonProps} />;
            case 'awe': return <AWEAnalysisDisplay data={msg.result} {...commonProps} />;
            case 'atc':
            case 'els':
            case 'hellenistic':
            case 'apocryphal':
                return <TextualCartographicMap data={msg.result} type={msg.analysisType} {...commonProps} />;
            case 'oracular': return <OracularLensDisplay data={msg.result} />;
            case 'palmistry': return <PalmistryAnalysisDisplay data={msg.result} {...commonProps} />;
            case 'voice': return <VoiceResonanceAnalysisDisplay data={msg.result} {...commonProps} />;
            case 'planner': return <AstrianDayPlannerDisplay data={msg.result} {...commonProps} />;
            default: return null;
        }
    };

    return (
        <div className="chat-view-container">
            <div className="chat-history">
                {history.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.type}`}>
                        <div className="message-bubble">
                            {msg.type === 'user' && (msg as any).text}
                            {msg.type === 'ai' && (
                                <>
                                    <p>{(msg as any).text}</p>
                                    {msg.result && renderAIMessageResult(msg)}
                                    {msg.proactiveSuggestion && <ProactiveSuggestionDisplay suggestion={msg.proactiveSuggestion}/>}
                                </>
                            )}
                             {msg.type === 'system' && (msg as any).text}
                             {msg.type === 'component' && renderComponent(msg.view, msg.props)}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="chat-message ai"><div className="message-bubble"><LoadingIndicator /></div></div>}
                {error && <ErrorMessage message={error} onRetry={onRetry} />}
                <div ref={historyEndRef} />
            </div>
            <div className="chat-input-area">
                 <div className="guiding-intent-selector-container">
                    <label htmlFor="guiding-intent">Guiding Intent</label>
                    <select 
                        id="guiding-intent"
                        className="guiding-intent-selector" 
                        value={guidingIntent} 
                        onChange={e => onIntentChange(e.target.value as GuidingIntent)}
                        disabled={isLoading}
                    >
                        {intents.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                <form className="chat-input-form" onSubmit={handleSubmit}>
                    <button type="button" className="call-sign-toggle" onClick={() => setIsMenuOpen(prev => !prev)} disabled={isLoading}>°</button>
                    <input ref={inputRef} type="text" className="chat-input" placeholder="Converse with the Astrian Key..." value={query} onChange={(e) => setQuery(e.target.value)} disabled={isLoading} maxLength={500}/>
                    <button type="submit" className="chat-submit-btn" disabled={isLoading || !query.trim()}>↵</button>
                    {isMenuOpen && <CallSignMenu onSelect={handleSelectCallSign} onClose={() => setIsMenuOpen(false)} isPlannerUnlocked={isPlannerUnlocked} />}
                </form>
            </div>
        </div>
    );
};

export const EntrainmentPrepView: FC<{ onContinue: () => void }> = ({ onContinue }) => (
    <div className="entrainment-view"><div className="entrainment-controls card"><h1>Haptic Entrainment</h1><p className="instructions">For the best experience, gently place the top edge of your device against your forehead to feel the vibrations. Close your eyes and breathe deeply.</p><button onClick={onContinue} className="action-btn deepen-btn">Begin Session</button></div></div>
);

export const EntrainmentView: FC<{ profile: EntrainmentProfile, onStop: () => void }> = ({ profile, onStop }) => {
    const visualizerRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let animationFrameId: number;
        if (!visualizerRef.current) return;
        const canvas = visualizerRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        masterGain.connect(audioContext.destination);
        const osc1 = audioContext.createOscillator(); osc1.type = 'sine'; osc1.frequency.setValueAtTime(profile.baseFrequency, audioContext.currentTime); osc1.connect(masterGain); osc1.start();
        const osc2 = audioContext.createOscillator(); osc2.type = 'sine'; osc2.frequency.setValueAtTime(profile.baseFrequency + profile.beatFrequency, audioContext.currentTime); osc2.connect(masterGain); osc2.start();
        if (navigator.vibrate) { const patternLength = 1000 / profile.beatFrequency; navigator.vibrate(Array(20).fill(patternLength / 2).map(p => Math.round(p))); }
        const analyser = audioContext.createAnalyser(); analyser.fftSize = 2048; masterGain.connect(analyser); const bufferLength = analyser.frequencyBinCount; const dataArray = new Uint8Array(bufferLength);
        const draw = () => { animationFrameId = requestAnimationFrame(draw); analyser.getByteTimeDomainData(dataArray); ctx.fillStyle = '#0c0a1d'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 2; ctx.strokeStyle = '#A7C7E7'; ctx.beginPath(); const sliceWidth = canvas.width * 1.0 / bufferLength; let x = 0; for(let i = 0; i < bufferLength; i++) { const v = dataArray[i] / 128.0; const y = v * canvas.height/2; if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); x += sliceWidth; } ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke(); };
        draw();
        return () => { audioContext.close(); navigator.vibrate(0); cancelAnimationFrame(animationFrameId); };
    }, [profile]);
    return <div className="entrainment-view"><div className="entrainment-controls card"><div className="entrainment-display"><canvas ref={visualizerRef} id="visual-entrainment" width="400" height="400"></canvas></div><p>{profile.explanation}</p><button className="action-btn secondary-action" onClick={onStop}>End Session</button></div></div>;
};

export const SessionManagementView: FC<{ history: AIMessage[], onBack: () => void, onClear?: () => void, onDownload?: () => void }> = ({ history, onBack, onClear, onDownload }) => (
    <div className="session-management-view card"><h1>Session History</h1>{history.length > 0 ? (<ul className="history-list">{history.map(record => (<li key={record.id} className="history-item" ><p className="history-query">{record.id} <span>({record.analysisType})</span></p><p className="history-timestamp">{record.timestamp.toLocaleString()}</p></li>))}</ul>) : (<p>No analysis records in this session yet.</p>)}<div className="session-actions"><button onClick={onBack} className="action-btn secondary-action">Back</button><button onClick={onDownload} disabled={history.length === 0 || !onDownload} className="action-btn">Download</button><button onClick={onClear} disabled={history.length === 0 || !onClear} className="action-btn error-action">Clear</button></div></div>
);

export const CrossReferenceModal: FC<{ value: number, history: SessionRecord[], onClose: () => void, onSynthesize: (num: number) => void, isSynthesizing: boolean, synthesisResult: string | null }> = ({ value, history, onClose, onSynthesize, isSynthesizing, synthesisResult }) => {
    const references = useMemo(() => history.filter(record => record.type === 'ai' && JSON.stringify(record.result).includes(String(value))) as AIMessage[], [value, history]);
    return <div className="cross-ref-modal-overlay" onClick={onClose}><div className="cross-ref-modal-content" onClick={e => e.stopPropagation()}><h3>Resonance Echoes for {value}</h3><button onClick={onClose} className="cross-ref-modal-close">×</button><ul className="cross-ref-results-list">{references.length > 0 ? references.map((ref, i) => <li key={i} className="history-item"><p className="history-query">{ref.id}</p><p className="history-timestamp">{ref.timestamp.toLocaleString()}</p></li>) : <li>No other echoes found in this session.</li>}</ul>{references.length > 1 && (<div className="synthesis-section">{synthesisResult ? <p>{synthesisResult}</p> : <button className="action-btn deepen-btn" onClick={() => onSynthesize(value)} disabled={isSynthesizing}>{isSynthesizing ? 'Synthesizing...' : 'Synthesize Connections'}</button>}</div>)}</div></div>;
};

export const PalmistryView: FC<{ onCapture: (base64: string) => void, onBack: () => void }> = ({ onCapture, onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

    // Check for multiple cameras on mount
    useEffect(() => {
        if (!navigator.mediaDevices?.enumerateDevices) {
            console.log("enumerateDevices() not supported.");
            return;
        }
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const videoInputs = devices.filter(device => device.kind === 'videoinput');
                if (videoInputs.length > 1) {
                    setHasMultipleCameras(true);
                }
            });
    }, []);

    // Effect to get/update the stream when facingMode changes
    useEffect(() => {
        let isMounted = true;
        
        // Stop any existing stream before getting a new one
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        navigator.mediaDevices.getUserMedia({ video: { facingMode } })
            .then(s => {
                if (isMounted) {
                    setStream(s);
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                    setError(null); // Clear previous errors on success
                } else {
                    // component was unmounted, stop new stream
                    s.getTracks().forEach(track => track.stop());
                }
            })
            .catch(err => {
                console.error("Camera error:", err);
                if (isMounted) {
                    setError(`Could not access ${facingMode} camera. Check permissions.`);
                    // Fallback to the other camera if one fails
                    if (facingMode === 'environment' && hasMultipleCameras) {
                        setFacingMode('user');
                    }
                }
            });

        // Cleanup function for when the component unmounts or facingMode changes
        return () => {
            isMounted = false;
            // This logic is duplicated at the start of the effect, but it's crucial here
            // to handle the final unmount of the component.
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode, hasMultipleCameras]);

    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                const videoWidth = videoRef.current.videoWidth;
                const videoHeight = videoRef.current.videoHeight;
                canvasRef.current.width = videoWidth;
                canvasRef.current.height = videoHeight;
                
                // If using the front camera, the preview is mirrored. We must also
                // flip the canvas context so the captured image matches what the user saw.
                if (facingMode === 'user') {
                    context.translate(videoWidth, 0);
                    context.scale(-1, 1);
                }
                
                context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                onCapture(dataUrl.split(',')[1]);
                onBack(); // Close the component after capture
            }
        }
    };

    return (
        <AnalysisForm title="Palmistry" onBack={onBack}>
            <div className="media-capture-view-container">
                <p className="section-description">Position your hand clearly in the frame and capture the image for analysis.</p>
                {error && <ErrorMessage message={error} />}
                <div className="media-capture-feed">
                    <video 
                        ref={videoRef} 
                        className="media-capture-video" 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                    />
                    <svg className="media-capture-overlay" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <path d="M 60 98 C 45 95, 30 80, 25 65 C 20 50, 20 30, 30 15 C 35 8, 45 2, 55 2 C 65 2, 70 8, 72 15 L 75 30 L 80 25 C 82 22, 88 22, 90 25 L 95 35 C 98 38, 98 42, 95 45 L 90 50 L 95 55 C 98 58, 98 62, 95 65 L 85 75 L 80 90 C 78 95, 70 98, 60 98 Z" fill="none" stroke="var(--primary-color)" strokeWidth="0.5" />
                    </svg>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="media-capture-actions">
                    {hasMultipleCameras && (
                        <button onClick={handleSwitchCamera} className="action-btn secondary-action">Switch Camera</button>
                    )}
                    <button onClick={handleCapture} className="action-btn deepen-btn" disabled={!stream}>Capture and Analyze</button>
                </div>
            </div>
        </AnalysisForm>
    );
};

export const VoiceAnalysisView: FC<{ onAnalyze: () => void, onBack: () => void }> = ({ onAnalyze, onBack }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const visualizerRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();
        streamRef.current = null;
        audioContextRef.current = null;
    }, []);

    const startRecording = useCallback(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                streamRef.current = stream;
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;
                const analyser = audioContext.createAnalyser();
                analyserRef.current = analyser;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 2048;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                setIsRecording(true);

                const canvas = visualizerRef.current;
                if (!canvas) return;
                const canvasCtx = canvas.getContext("2d");
                const draw = () => {
                    if (!canvasCtx || !analyserRef.current) return;
                    animationFrameRef.current = requestAnimationFrame(draw);
                    analyserRef.current.getByteTimeDomainData(dataArray);
                    canvasCtx.fillStyle = "rgba(12, 10, 29, 0.5)";
                    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                    canvasCtx.lineWidth = 2;
                    canvasCtx.strokeStyle = "rgb(180, 212, 255)";
                    canvasCtx.beginPath();
                    const sliceWidth = canvas.width * 1.0 / bufferLength;
                    let x = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        const v = dataArray[i] / 128.0;
                        const y = v * canvas.height / 2;
                        if (i === 0) canvasCtx.moveTo(x, y);
                        else canvasCtx.lineTo(x, y);
                        x += sliceWidth;
                    }
                    canvasCtx.lineTo(canvas.width, canvas.height / 2);
                    canvasCtx.stroke();
                };
                draw();
            })
            .catch(err => {
                console.error("Microphone error:", err);
                setError("Could not access microphone. Please check permissions.");
            });
    }, []);

    const handleAnalyze = () => {
        stopRecording();
        onAnalyze();
        onBack();
    };
    
    useEffect(() => {
        return () => stopRecording(); // Cleanup on unmount
    }, [stopRecording]);

    return (
        <AnalysisForm title="Voice Resonance" onBack={onBack}>
            <div className="media-capture-view-container">
                <p className="section-description">Record a short sample of your voice. Speak a mantra, a question, or simply your name.</p>
                {error && <ErrorMessage message={error} />}
                <div className="media-capture-feed">
                    <canvas ref={visualizerRef} className="voice-visualizer" width="400" height="200"></canvas>
                </div>
                <div className="media-capture-actions">
                    {!isRecording && <button onClick={startRecording} className="action-btn">Start Recording</button>}
                    {isRecording && <button onClick={handleAnalyze} className="action-btn deepen-btn">Analyze Voice Sample</button>}
                </div>
            </div>
        </AnalysisForm>
    );
};

export const EntrainmentSelectionView: FC<{ onSelect: (profile: EntrainmentProfile) => void, onBack: () => void }> = ({ onSelect, onBack }) => {
    const profiles = [
        { state: 'delta', baseFrequency: 120, beatFrequency: 3, description: 'Deep sleep, healing, and regeneration.' },
        { state: 'theta', baseFrequency: 140, beatFrequency: 6, description: 'Deep meditation, creativity, intuition.' },
        { state: 'alpha', baseFrequency: 160, beatFrequency: 10, description: 'Relaxed focus, stress reduction, learning.' },
        { state: 'beta', baseFrequency: 180, beatFrequency: 20, description: 'Active thinking, problem-solving, focus.' },
        { state: 'gamma', baseFrequency: 200, beatFrequency: 40, description: 'Peak awareness, insight, high-level processing.' },
    ] as const;

    const handleSelect = (profile: typeof profiles[number]) => {
        onSelect({ ...profile, explanation: `A standard ${profile.state} state entrainment profile selected for general use.` });
        onBack();
    };

    return (
        <AnalysisForm title="Select Entrainment" onBack={onBack}>
             <div className="entrainment-selection-grid">
                {profiles.map(p => (
                    <div key={p.state} className="card" style={{textAlign: 'center', cursor: 'pointer'}} onClick={() => handleSelect(p)}>
                        <h4>{p.state.charAt(0).toUpperCase() + p.state.slice(1)} ({p.beatFrequency} Hz)</h4>
                        <p>{p.description}</p>
                        <button className="action-btn secondary-action" style={{pointerEvents: 'none'}}>Select</button>
                    </div>
                ))}
             </div>
        </AnalysisForm>
    );
};