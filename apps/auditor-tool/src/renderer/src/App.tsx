import { useState, useMemo, useRef, useEffect } from 'react'
import SimpleMDE from 'react-simplemde-editor'
import 'easymde/dist/easymde.min.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTrashAlt, faFolder } from '@fortawesome/free-solid-svg-icons'
import './assets/custom-simplemde.css'
import StartScreen from './components/StartScreen'
import IdentityScreen from './components/IdentityScreen'
import { extractTextFromPdf } from './services/ocrService'

const DEFAULT_TEMPLATE = `# Zepor Proof of Reserve Audit Report

## Auditor Information
- **Auditor ID**: [Your ID]
- **Date**: ${new Date().toISOString().split('T')[0]}

## Reserve Details
- **Asset Type**: [e.g., USD, BTC, ETH]
- **Total Amount**: [Amount]
- **Custody Location**: [Location]

## Verification Statement
We hereby certify that the above-mentioned assets are held in custody and have been verified as of the date specified.

---
*This document is cryptographically signed by the auditor.*
`

interface SigningConfig {
  signerId: string
  algorithm: 'RSA-SHA256' | 'ECDSA-P256'
  privateKey: string
  keyFilePath?: string
  saveLocation?: string
}

interface IdentityConfig {
  algorithm: 'RSA-SHA256' | 'ECDSA-P256';
  privateKey: string;
  keyFilePath?: string;
  isGenerated: boolean;
}

type AppStage = 'IDENTITY' | 'START' | 'OCR' | 'EDITOR'

function App() {
  // Navigation State
  const [stage, setStage] = useState<AppStage>('IDENTITY')

  // Data State (Cached)
  const [markdown, setMarkdown] = useState<string>(DEFAULT_TEMPLATE)
  const [config, setConfig] = useState<SigningConfig>({
    signerId: 'AUDITOR-001',
    algorithm: 'RSA-SHA256',
    privateKey: '',
    keyFilePath: '',
    saveLocation: ''
  })
  const [identityConfig, setIdentityConfig] = useState<IdentityConfig | null>(null)

  // UI State
  const [status, setStatus] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<{ value: number; message: string } | null>(null)
  const [ocrErrorDetails, setOcrErrorDetails] = useState<string | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [sourceHash, setSourceHash] = useState<string | null>(null)

  // Remote OCR Config State
  const [showRemoteConfig, setShowRemoteConfig] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState('')

  // Hidden file inputs
  const mdFileInputRef = useRef<HTMLInputElement>(null)
  const pdfFileInputRef = useRef<HTMLInputElement>(null)
  const pdfRemoteFileInputRef = useRef<HTMLInputElement>(null)

  // Load saved identity on mount
  useEffect(() => {
    const saved = localStorage.getItem('auditor_identity');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.privateKey) {
          setIdentityConfig(parsed);
          // Pre-fill config
          setConfig(prev => ({
            ...prev,
            algorithm: parsed.algorithm,
            privateKey: parsed.privateKey,
            keyFilePath: parsed.keyFilePath
          }));
        }
      } catch (e) {
        console.error('Failed to load saved identity', e);
      }
    }
  }, []);

  // Stable options object
  const mdeOptions = useMemo(() => {
    // Reuse a lightweight LaTeX text-command replacer so editor preview matches PDF output
    return {
      spellChecker: false,
      minHeight: '350px',
      status: false,
      autofocus: false,
      previewRender: (plainText) => {
        // Pre-process latex-like text commands so preview matches PDF renderer
        // Manual replacement removed in favor of KaTeX
        const processed = plainText;
        // Basic Markdown render
        const preview = SimpleMDE.prototype.markdown(processed);
        // We will perform a post-render on the preview URL in a real DOM, 
        // but SimpleMDE expects a string return. 
        // For simple math support without complex parsing, we can check if window.renderMathInElement exists.

        setTimeout(() => {
          try {
            // @ts-ignore
            if (window.renderMathInElement) {
              const previewEl = document.getElementsByClassName('editor-preview')[0];
              if (previewEl) {
                // @ts-ignore
                window.renderMathInElement(previewEl, {
                  delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                  ]
                });
              }
            }
          } catch (e) {
            // If math rendering fails, attempt a safe fallback: directly set innerHTML of preview
            try {
              const previewEl = document.getElementsByClassName('editor-preview')[0];
              if (previewEl && typeof preview === 'string') {
                // @ts-ignore
                previewEl.innerHTML = preview;
              }
            } catch (err) {
              console.error('Fallback preview render failed', err);
            }
            console.error('Math render error', e);
          }
        }, 0);

        return preview;
      }
    }
  }, [])

  // --- Actions ---
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)

  const handleTogglePdfPreview = async () => {
    if (showPdfPreview) {
      setShowPdfPreview(false)
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
        setPdfPreviewUrl(null)
      }
      return
    }

    try {
      setStatus('Generating preview PDF...')
      // @ts-ignore
      const base64: string = await window.api.generatePreviewPdf({ markdown })
      // Convert base64 to Uint8Array without relying on Node Buffer in renderer
      const binary = atob(base64)
      const len = binary.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setShowPdfPreview(true)
      setStatus('')
    } catch (e) {
      console.error('Preview generation failed', e)
      setStatus('Preview generation failed')
    }
  }

  const handleIdentityComplete = (idConfig: IdentityConfig) => {
    setIdentityConfig(idConfig);
    setConfig(prev => ({
      ...prev,
      algorithm: idConfig.algorithm,
      privateKey: idConfig.privateKey,
      keyFilePath: idConfig.keyFilePath
    }));
    // Save to local storage
    localStorage.setItem('auditor_identity', JSON.stringify(idConfig));
    setStage('START');
  };

  const handleStartOption = (option: 'create' | 'import-md' | 'import-pdf-local' | 'import-pdf-remote') => {
    if (option === 'create') {
      setStage('EDITOR')
      setSourceHash(null)
    } else if (option === 'import-md') {
      mdFileInputRef.current?.click()
    } else if (option === 'import-pdf-local') {
      pdfFileInputRef.current?.click()
    } else if (option === 'import-pdf-remote') {
      // Show config modal first
      setShowRemoteConfig(true)
    }
  }

  const handleRemoteConfigSubmit = () => {
    setShowRemoteConfig(false)
    pdfRemoteFileInputRef.current?.click()
  }

  const handleMdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setMarkdown(content)
      setStage('EDITOR')
      setSourceHash(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStage('OCR')
    setIsProcessing(true)
    setOcrProgress({ value: 0, message: 'Initializing OCR...' })

    try {
      // Calculate Hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setSourceHash(hashHex);

      const text = await extractTextFromPdf(file, (progress, message) => {
        setOcrProgress({ value: progress, message })
      })

      const header = `# Zepor Proof of Reserve Audit Report

## Auditor Information
- **Auditor ID**: ${config.signerId}
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Document Hash**: ${hashHex}

`;
      setMarkdown(header + (text || ''))
      setStage('EDITOR')
    } catch (error) {
      console.error(error)
      const err = error as Error;
      setStatus(`OCR Failed: ${err.message || 'Unknown error'}`)
      setOcrErrorDetails(err.stack || JSON.stringify(err, null, 2))
      // setMarkdown(DEFAULT_TEMPLATE) // Don't wipe if we want to show error on previous screen?
      // Actually fail back to Editor so they can see error and maybe try again or manual entry
      setStage('EDITOR')
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
      e.target.value = ''
    }
  }

  const handlePdfRemoteFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStage('OCR')
    setIsProcessing(true)
    setOcrProgress({ value: 0, message: 'Uploading to Remote OCR...' })

    try {
      // Calculate Hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setSourceHash(hashHex);

      const { uploadPdfToRemote } = await import('./services/remoteOcrService');
      // Pass the configured URL if set, otherwise undefined (to use default)
      const urlToUse = remoteUrl.trim() || undefined;

      const text = await uploadPdfToRemote(file, urlToUse, (message) => {
        // Fake progress for indeterminate state or use message
        setOcrProgress({ value: 0.5, message });
      });

      const header = `# Zepor Proof of Reserve Audit Report

## Auditor Information
- **Auditor ID**: ${config.signerId}
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Document Hash**: ${hashHex}

`;
      setMarkdown(header + (text || ''))
      setStage('EDITOR')
    } catch (error) {
      console.error(error)
      const err = error as Error;
      setStatus(`Remote OCR Failed: ${err.message || 'Unknown error'}`)
      setOcrErrorDetails(err.stack || JSON.stringify(err, null, 2))
      setStage('EDITOR')
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
      e.target.value = ''
    }
  }

  const handleGoBack = () => {
    // Graceful back logic
    if (stage === 'EDITOR') {
      setStage('START');
    } else if (stage === 'START') {
      setStage('IDENTITY');
    }
    setStatus('');
  }

  const handleClearContent = () => {
    if (confirm('Are you sure you want to clear the editor content?')) {
      setMarkdown(DEFAULT_TEMPLATE);
      setSourceHash(null);
    }
  }



  const handleChooseSaveLocation = async () => {
    try {
      // @ts-ignore
      const result = await window.api.chooseSaveLocation(config.signerId)
      if (result.filePath) {
        setConfig({ ...config, saveLocation: result.filePath })
        setStatus(`Save location: ${result.filePath}`)
      }
    } catch (error) {
      console.error(error)
      setStatus('Failed to choose save location')
    }
  }

  const handleGenerate = async () => {
    setIsProcessing(true)
    setStatus('Generating PDF from Markdown...')

    try {
      const payload = {
        markdown,
        signerId: config.signerId,
        algorithm: config.algorithm,
        privateKey: config.privateKey || 'DEFAULT_KEY',
        saveLocation: config.saveLocation,
        sourceDocumentHash: sourceHash || undefined
      }

      // @ts-ignore
      const result = await window.api.generateProofFromMarkdown(payload)
      setStatus(`Success! PDF saved to: ${result.filePath}`)
    } catch (error) {
      console.error(error)
      const err = error as Error;
      setStatus(`Error generating PDF: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // --- Renderers ---

  if (stage === 'IDENTITY') {
    return (
      <IdentityScreen
        onComplete={handleIdentityComplete}
        initialConfig={identityConfig}
      />
    );
  }

  if (stage === 'START') {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        overflow: 'auto',
        background: 'var(--color-background)',
        position: 'relative'
      }}>

        <button
          onClick={handleGoBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--ev-c-text-2)',
            cursor: 'pointer',
            fontWeight: 600,
            zIndex: 10
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '8px' }} /> Change Identity
        </button>

        {showRemoteConfig && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100
          }}>
            <div style={{
              background: 'var(--color-background)',
              padding: '30px',
              borderRadius: '8px',
              width: '400px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: 'var(--ev-c-text-1)', marginBottom: '15px' }}>Remote OCR Configuration</h3>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--ev-c-text-2)', fontSize: '14px' }}>
                API URL (Server)
              </label>
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="http://localhost:8000/file_parse"
                className="input-field"
                style={{ marginBottom: '10px' }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                Default: http://localhost:8000/file_parse<br />
                Timeout: 1 Hour (for large files)
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => setShowRemoteConfig(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoteConfigSubmit}
                  className="btn btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: showPdfPreview ? 1 : '1 1 100%' }}>
            <StartScreen onOptionSelect={handleStartOption} />
          </div>
          {showPdfPreview && pdfPreviewUrl && (
            <div style={{ width: '50%', borderLeft: '1px solid var(--ev-c-black-mute)', paddingLeft: '12px' }}>
              <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100vh', border: 'none' }} />
            </div>
          )}
        </div>
        <input
          type="file"
          accept=".md,.markdown,.txt"
          ref={mdFileInputRef}
          style={{ display: 'none' }}
          onChange={handleMdFileChange}
        />
        <input
          type="file"
          accept=".pdf"
          ref={pdfFileInputRef}
          style={{ display: 'none' }}
          onChange={handlePdfFileChange}
        />
        <input
          type="file"
          accept=".pdf"
          ref={pdfRemoteFileInputRef}
          style={{ display: 'none' }}
          onChange={handlePdfRemoteFileChange}
        />
      </div>
    )
  }

  if (stage === 'OCR') {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        background: 'var(--color-background)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'var(--ev-c-text-1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Extracting Text from PDF...</h2>
          <div style={{
            width: '300px',
            height: '10px',
            background: 'var(--ev-c-black-mute)',
            borderRadius: '5px',
            margin: '0 auto 20px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(ocrProgress?.value || 0) * 100}%`,
              height: '100%',
              background: 'var(--ev-c-accent)',
              transition: 'width 0.3s'
            }} />
          </div>
          <p>{ocrProgress?.message || 'Processing...'}</p>
        </div>
      </div>
    )
  }

  // EDITOR Stage
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      overflow: 'auto',
      background: 'var(--color-background)',
      position: 'relative'
    }}>
      <div className="main-container">

        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleGoBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ev-c-text-2)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '8px' }} /> Back to Start
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleTogglePdfPreview} style={{ background: showPdfPreview ? 'var(--ev-c-accent)' : 'transparent', color: showPdfPreview ? 'white' : 'var(--ev-c-text-2)', border: '1px solid var(--ev-c-text-2)', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer' }}>
              {showPdfPreview ? 'Hide PDF Preview' : 'Show PDF Preview'}
            </button>
          </div>
          <button
            onClick={handleClearContent}
            style={{
              background: 'transparent',
              border: '1px solid var(--ev-c-text-2)',
              borderRadius: '4px',
              color: 'var(--ev-c-text-2)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 8px'
            }}
          >
            <FontAwesomeIcon icon={faTrashAlt} style={{ marginRight: '8px' }} /> Clear Content
          </button>
        </div>

        {showPdfPreview && pdfPreviewUrl && (
          <div style={{ position: 'absolute', top: '56px', right: 0, bottom: 0, width: '42%', borderLeft: '1px solid var(--ev-c-black-mute)', background: 'white', zIndex: 8 }}>
            <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
        )}

        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--ev-c-black-mute)',
          marginTop: '10px'
        }}>
          <h1 style={{
            color: 'var(--ev-c-text-1)',
            marginBottom: '10px',
            fontSize: '28px',
            fontWeight: '700'
          }}>
            Zepor Auditor Tool
          </h1>
          <p style={{
            color: 'var(--ev-c-text-2)',
            fontSize: '16px'
          }}>
            Create and sign professional Proof of Reserve documents
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            marginBottom: '15px',
            color: 'var(--ev-c-text-1)',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Markdown Content
          </h3>
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <SimpleMDE
              value={markdown}
              onChange={setMarkdown}
              id="audit-report-editor"
              options={mdeOptions}
            />
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            marginBottom: '20px',
            color: 'var(--ev-c-text-1)',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Signing Configuration
          </h3>

          <div style={{
            background: 'var(--ev-c-black-mute)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Active Identity</span>
              <button onClick={() => setStage('IDENTITY')} style={{ fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--ev-c-accent)', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
            </div>
            <div style={{ fontSize: '13px', marginTop: '5px', color: 'var(--ev-c-text-2)' }}>
              Algorithm: {config.algorithm} <br />
              Key Source: {config.keyFilePath ? 'Imported File' : 'Generated Session Key'}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label className="label-text">
                Signer ID
              </label>
              <input
                type="text"
                value={config.signerId}
                onChange={(e) => setConfig({ ...config, signerId: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label-text">
              Save Location
            </label>
            <button
              onClick={handleChooseSaveLocation}
              className="btn btn-outline"
            >
              <FontAwesomeIcon icon={faFolder} style={{ marginRight: '8px' }} /> Choose Save Location
            </button>
            {config.saveLocation && (
              <p style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: 'var(--ev-c-black-mute)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--ev-c-text-2)',
                wordBreak: 'break-all'
              }}>
                Will save to: <strong>{config.saveLocation}</strong>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '20px',
            boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          {isProcessing ? '⏳ Processing...' : '🔐 Generate & Sign PDF'}
        </button>

        {status && (
          <div style={{
            padding: '16px',
            backgroundColor: status.includes('Success') || status.includes('imported') || status.includes('location')
              ? 'rgba(16, 185, 129, 0.1)' // Success (Green)
              : 'rgba(239, 68, 68, 0.1)', // Error (Red)
            color: status.includes('Success') || status.includes('imported') || status.includes('location')
              ? '#34d399'
              : '#f87171',
            borderRadius: '8px',
            border: `1px solid ${status.includes('Success') || status.includes('imported') || status.includes('location')
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(239, 68, 68, 0.2)'}`,
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{status}</span>
              {ocrErrorDetails && !status.includes('Success') && (
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  style={{
                    background: 'transparent',
                    border: '1px solid currentColor',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'inherit'
                  }}
                >
                  {showErrorDetails ? 'Hide Details' : 'Show Details'}
                </button>
              )}
            </div>
            {showErrorDetails && ocrErrorDetails && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px', fontFamily: 'monospace', color: 'var(--ev-c-text-2)' }}>
                  {ocrErrorDetails}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
