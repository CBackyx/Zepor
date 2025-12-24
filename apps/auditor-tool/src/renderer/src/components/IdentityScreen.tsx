import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faUpload, faCircleCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons'

interface IdentityConfig {
    algorithm: 'RSA-SHA256' | 'ECDSA-P256';
    privateKey: string;
    keyFilePath?: string;
    isGenerated: boolean;
}

interface IdentityScreenProps {
    onComplete: (config: IdentityConfig) => void;
    initialConfig?: IdentityConfig | null;
}

const IdentityScreen: React.FC<IdentityScreenProps> = ({ onComplete, initialConfig }) => {
    const [algorithm, setAlgorithm] = useState<'RSA-SHA256' | 'ECDSA-P256'>('RSA-SHA256');
    const [privateKey, setPrivateKey] = useState<string>('');
    const [keyFilePath, setKeyFilePath] = useState<string>('');
    const [isGenerated, setIsGenerated] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error'>('success');

    // Load initial config if provided (from local storage)
    useEffect(() => {
        if (initialConfig) {
            setAlgorithm(initialConfig.algorithm);
            setPrivateKey(initialConfig.privateKey);
            setKeyFilePath(initialConfig.keyFilePath || '');
            setIsGenerated(initialConfig.isGenerated);
            setStatus('Loaded saved identity.');
            setStatusType('success');
        }
    }, [initialConfig]);

    const handleGenerateKey = async () => {
        setStatus('Generating new key pair...');
        setStatusType('success');

        try {
            // @ts-ignore
            const result = await window.api.generateKeyPair(algorithm);
            setPrivateKey(result.privateKey);
            setIsGenerated(true);
            setKeyFilePath(''); // Reset path until saved

            // Prompt to save immediately
            try {
                // @ts-ignore
                const saveResult = await window.api.saveKeyFile({
                    content: result.privateKey,
                    defaultName: `auditor-key-${algorithm.toLowerCase()}.pem`
                });

                if (saveResult.filePath) {
                    setKeyFilePath(saveResult.filePath);
                    setIsGenerated(false); // It's no longer just "generated in memory", it's saved.
                    setStatus(`New ${algorithm} key generated and saved.`);
                } else {
                    setStatus(`New ${algorithm} key generated (not saved).`);
                }
            } catch (saveError) {
                console.error('Failed to save key:', saveError);
                setStatus(`New ${algorithm} key generated but save failed.`);
            }
            setStatusType('success');
        } catch (error) {
            console.error(error);
            setStatus('Failed to generate key pair.');
            setStatusType('error');
        }
    };

    const handleImportKey = async () => {
        try {
            // @ts-ignore
            const result = await window.api.selectKeyFile();
            if (result.filePath && result.content) {
                // Basic verification
                if (!result.content.includes('PRIVATE KEY')) {
                    throw new Error('Invalid key format. Expected PEM format.');
                }

                setKeyFilePath(result.filePath);
                setPrivateKey(result.content);
                setIsGenerated(false);
                setStatus(`Key imported from: ${result.filePath}`);
                setStatusType('success');
            }
        } catch (error) {
            console.error(error);
            setStatus(`Failed to import key: ${(error as Error).message}`);
            setStatusType('error');
        }
    };

    const handleContinue = () => {
        if (!privateKey) {
            setStatus('Please generate or import a key to continue.');
            setStatusType('error');
            return;
        }
        onComplete({
            algorithm,
            privateKey,
            keyFilePath,
            isGenerated
        });
    };

    const handleClear = () => {
        setAlgorithm('RSA-SHA256');
        setPrivateKey('');
        setKeyFilePath('');
        setIsGenerated(false);
        setStatus('Cleared.');
        setStatusType('success');
    };

    const isValid = !!privateKey;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: '40px',
            width: '100%',
            background: 'var(--color-background)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '600px',
                padding: '40px',
                textAlign: 'left',
                cursor: 'default'
            }}>
                <h1 style={{
                    color: 'var(--ev-c-text-1)',
                    fontSize: '32px',
                    marginBottom: '10px',
                    fontWeight: '700',
                    textAlign: 'center'
                }}>
                    Auditor Identity
                </h1>
                <p style={{
                    color: 'var(--ev-c-text-2)',
                    fontSize: '16px',
                    marginBottom: '30px',
                    textAlign: 'center'
                }}>
                    Setup your signing identity to proceed.
                </p>

                <div style={{ marginBottom: '25px' }}>
                    <label className="label-text">Signing Algorithm</label>
                    <select
                        value={algorithm}
                        onChange={(e) => setAlgorithm(e.target.value as any)}
                        className="select-field"
                        style={{ width: '100%' }}
                    >
                        <option value="RSA-SHA256">RSA-SHA256</option>
                        <option value="ECDSA-P256">ECDSA-P256</option>
                    </select>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    marginBottom: '25px'
                }}>
                    <button
                        onClick={handleGenerateKey}
                        className="btn btn-primary"
                        style={{ background: 'var(--ev-c-accent)', fontSize: '14px' }}
                    >
                        <FontAwesomeIcon icon={faKey} style={{ marginRight: '8px' }} />
                        Generate New Key
                    </button>
                    <button
                        onClick={handleImportKey}
                        className="btn btn-outline"
                        style={{ fontSize: '14px' }}
                    >
                        <FontAwesomeIcon icon={faUpload} style={{ marginRight: '8px' }} />
                        Import Key File
                    </button>
                </div>

                {/* Key Status Display */}
                <div style={{
                    background: 'var(--ev-c-black-mute)',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '25px',
                    border: '1px solid #333',
                    minHeight: '80px'
                }}>
                    <label className="label-text" style={{ marginBottom: '5px', fontSize: '12px' }}>Current Identity Status</label>
                    {privateKey ? (
                        <div>
                            <div style={{ color: 'var(--ev-c-success)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                <FontAwesomeIcon icon={faCircleCheck} /> Private Key Loaded
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--ev-c-text-2)' }}>
                                {isGenerated ? (
                                    <span>Generated Session Key (Not Saved)</span>
                                ) : (
                                    <div style={{ wordBreak: 'break-all' }}>
                                        <strong>Location:</strong> {keyFilePath}<br />
                                        <strong>Name:</strong> {keyFilePath.split(/[/\\]/).pop()}
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: '5px', fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>
                                {privateKey.substring(0, 30)}...
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--ev-c-text-2)', fontStyle: 'italic', fontSize: '14px' }}>
                            No identity loaded. Please generate or import a key.
                        </div>
                    )}
                </div>

                {status && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '10px',
                        borderRadius: '6px',
                        background: statusType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: statusType === 'success' ? '#34d399' : '#f87171',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {status}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        onClick={handleClear}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleContinue}
                        disabled={!isValid}
                        className="btn btn-primary"
                        style={{
                            flex: 2,
                            opacity: isValid ? 1 : 0.5,
                            cursor: isValid ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Continue <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '8px' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IdentityScreen;
