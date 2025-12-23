import React from 'react';

interface StartScreenProps {
    onOptionSelect: (option: 'create' | 'import-md' | 'import-pdf') => void;
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
                maxWidth: '900px'
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '30px'
                }}>
                    {/* Option 1: Create New */}
                    <div
                        onClick={() => onOptionSelect('create')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <i className="fas fa-file-alt"></i>
                        </div>
                        <h3>Create New</h3>
                        <p>Start from a blank template with standard Zepor formatting.</p>
                    </div>

                    {/* Option 2: Import Markdown */}
                    <div
                        onClick={() => onOptionSelect('import-md')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <i className="fas fa-file-import"></i>
                        </div>
                        <h3>Import Markdown</h3>
                        <p>Load an existing .md file from your computer.</p>
                    </div>

                    {/* Option 3: Import PDF */}
                    <div
                        onClick={() => onOptionSelect('import-pdf')}
                        className="card"
                    >
                        <div style={iconStyle}>
                            <i className="fas fa-file-pdf"></i>
                        </div>
                        <h3>Import PDF</h3>
                        <p>Extract text from a PDF scan using local OCR.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Kept iconStyle inline for now as it's specific, but updated colors would be handled by CSS if needed.
// However, let's update it to use the variable for consistency.
const iconStyle: React.CSSProperties = {
    fontSize: '48px',
    color: 'var(--ev-c-accent)',
    marginBottom: '20px',
    background: 'rgba(102, 126, 234, 0.1)',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

export default StartScreen;
