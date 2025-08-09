import React, { FC, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useAstrianSystem } from './hooks';
import { Toast } from './types';
import {
    ChatView,
    StelaCalibrationView, KaleidoscopicBackground,
    CrossReferenceModal, SubliminalGlyph, ToastContainer
} from './components';

// =================================================================================================
// --- MAIN APP COMPONENT ---
// =================================================================================================

const App: FC = () => {
    const {
        sessionHistory, isLoading, error, isModalOpen, crossRefValue,
        guidingIntent, subliminalSeedValue, isSynthesizing, synthesisResult, isCorporaInitialized,
        isPlannerUnlocked, toasts,
        handleSendMessage, handleRetry, setIsModalOpen, setGuidingIntent, handleSynthesizeConnections, dismissToast,
        handleNumberInteract
    } = useAstrianSystem();

    return (
        <div className="app-content-wrapper">
            <KaleidoscopicBackground />
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {!isCorporaInitialized ? (
                <StelaCalibrationView />
            ) : (
                <>
                    <main>
                       <ChatView
                           history={sessionHistory}
                           isLoading={isLoading}
                           error={error}
                           onSendMessage={handleSendMessage}
                           onRetry={handleRetry}
                           guidingIntent={guidingIntent}
                           onIntentChange={setGuidingIntent}
                           isPlannerUnlocked={isPlannerUnlocked}
                           onNumberInteract={handleNumberInteract}
                       />
                    </main>
                    {isModalOpen && crossRefValue !== null && (
                        <CrossReferenceModal 
                            value={crossRefValue} 
                            history={sessionHistory} 
                            onClose={() => setIsModalOpen(false)}
                            onSynthesize={handleSynthesizeConnections}
                            isSynthesizing={isSynthesizing}
                            synthesisResult={synthesisResult}
                        />
                    )}
                    <SubliminalGlyph seed={subliminalSeedValue} />
                </>
            )}
        </div>
    );
};

// =================================================================================================
// --- APP INITIALIZATION ---
// =================================================================================================

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);