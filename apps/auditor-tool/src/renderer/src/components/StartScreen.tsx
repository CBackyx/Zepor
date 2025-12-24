import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faFileUpload, faDesktop, faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons'

interface StartScreenProps {
    onOptionSelect: (option: 'create' | 'import-md' | 'import-pdf-local' | 'import-pdf-remote') => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onOptionSelect }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: '40px',
            width: '100%'
        }}>
            <div style={{
                textAlign: 'center',
                width: '100%',
                maxWidth: '1000px'
            }}>
                <h1 style={{
                    color: 'var(--ev-c-text-1)',
                    fontSize: '42px',
                    marginBottom: '10px',
                    fontWeight: '800'
                }}>
                    Zepor Auditor Tool
                </h1>
                <p style={{
                    color: 'var(--ev-c-text-2)',
                    fontSize: '18px',
                    marginBottom: '60px'
                }}>
                    Select how you would like to start your audit report
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px'
                }}>
                    {/* Option 1: Create New */}
                    <div
                        onClick={() => onOptionSelect('create')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: '28px' }} />
                        </div>
                        <h3>Create New</h3>
                        <p>Start from a blank template.</p>
                    </div>

                    {/* Option 2: Import Markdown */}
                    <div
                        onClick={() => onOptionSelect('import-md')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <FontAwesomeIcon icon={faFileUpload} style={{ fontSize: '28px' }} />
                        </div>
                        <h3>Import Markdown</h3>
                        <p>Load an existing .md file.</p>
                    </div>

                    {/* Option 3: Import PDF (Local) */}
                    <div
                        onClick={() => onOptionSelect('import-pdf-local')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <FontAwesomeIcon icon={faDesktop} style={{ fontSize: '28px' }} />
                        </div>
                        <h3>Local OCR</h3>
                        <p>Extract text using built-in Tesseract (Offline).</p>
                    </div>

                    {/* Option 4: Import PDF (Remote) */}
                    <div
                        onClick={() => onOptionSelect('import-pdf-remote')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: '28px' }} />
                        </div>
                        <h3>Remote OCR</h3>
                        <p>High-quality extraction via Remote API.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Kept iconStyle inline for now as it's specific, but updated colors would be handled by CSS if needed.
// However, let's update it to use the variable for consistency.
const iconStyle: React.CSSProperties = {
    fontSize: '36px',
    color: 'var(--ev-c-accent)',
    marginBottom: '20px',
    background: 'rgba(102, 126, 234, 0.1)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

export default StartScreen;
