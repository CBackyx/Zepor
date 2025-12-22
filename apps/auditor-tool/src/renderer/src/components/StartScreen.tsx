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
            minHeight: '100%',
            padding: '40px'
        }}>
            <div style={{
                textAlign: 'center',
                width: '100%',
                maxWidth: '800px'
            }}>
                <h1 style={{
                    color: '#667eea',
                    fontSize: '42px',
                    marginBottom: '10px',
                    fontWeight: '800'
                }}>
                    Zepor Auditor Tool
                </h1>
                <p style={{
                    color: '#666',
                    fontSize: '18px',
                    marginBottom: '60px'
                }}>
                    Select how you would like to start your audit report
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '30px'
                }}>
                    {/* Option 1: Create New */}
                    <div
                        onClick={() => onOptionSelect('create')}
                        style={cardStyle}
                    >
                        <div style={iconStyle}>
                            <i className="fas fa-file-alt"></i>
                        </div>
                        <h3 style={titleStyle}>Create New</h3>
                        <p style={descStyle}>Start from a blank template with standard Zepor formatting.</p>
                    </div>

                    {/* Option 2: Import Markdown */}
                    <div
                        onClick={() => onOptionSelect('import-md')}
                        style={cardStyle}
                    >
                        <div style={iconStyle}>
                            <i className="fas fa-file-import"></i>
                        </div>
                        <h3 style={titleStyle}>Import Markdown</h3>
                        <p style={descStyle}>Load an existing .md file from your computer.</p>
                    </div>

                    {/* Option 3: Import PDF */}
                    <div
                        onClick={() => onOptionSelect('import-pdf')}
                        style={cardStyle}
                    >
                        <div style={iconStyle}>
                            <i className="fas fa-file-pdf"></i>
                        </div>
                        <h3 style={titleStyle}>Import PDF</h3>
                        <p style={descStyle}>Extract text from a PDF scan using local OCR.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '40px 30px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid transparent'
};

const iconStyle: React.CSSProperties = {
    fontSize: '48px',
    color: '#667eea',
    marginBottom: '20px',
    background: 'rgba(102, 126, 234, 0.1)',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#333',
    marginBottom: '10px',
    fontWeight: '700'
};

const descStyle: React.CSSProperties = {
    color: '#777',
    fontSize: '14px',
    lineHeight: '1.5'
};

export default StartScreen;
