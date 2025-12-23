import { useState, useMemo, useRef } from 'react'
import SimpleMDE from 'react-simplemde-editor'
import 'easymde/dist/easymde.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './assets/custom-simplemde.css'
import StartScreen from './components/StartScreen'
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

type AppStage = 'START' | 'OCR' | 'EDITOR'

function App() {
  const [stage, setStage] = useState<AppStage>('START')
  const [markdown, setMarkdown] = useState<string>(DEFAULT_TEMPLATE)
  const [config, setConfig] = useState<SigningConfig>({
    signerId: 'AUDITOR-001',
    algorithm: 'RSA-SHA256',
    privateKey: '',
    keyFilePath: '',
    saveLocation: ''
  })
  const [status, setStatus] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<{ value: number; message: string } | null>(null)
  const [ocrErrorDetails, setOcrErrorDetails] = useState<string | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  // Hidden file inputs
  const mdFileInputRef = useRef<HTMLInputElement>(null)
  const pdfFileInputRef = useRef<HTMLInputElement>(null)

  // Stable options object
  const mdeOptions = useMemo(() => {
    return {
      spellChecker: false,
      minHeight: '350px',
      status: false,
      autofocus: false,
    }
  }, [])

  // --- Actions ---

  const handleStartOption = (option: 'create' | 'import-md' | 'import-pdf') => {
    if (option === 'create') {
      setMarkdown(DEFAULT_TEMPLATE)
      setStage('EDITOR')
    } else if (option === 'import-md') {
      mdFileInputRef.current?.click()
    } else if (option === 'import-pdf') {
      pdfFileInputRef.current?.click()
    }
  }

  const handleMdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setMarkdown(content)
      setStage('EDITOR')
    }
    reader.readAsText(file)
    // Reset value to allow re-selecting same file
    e.target.value = ''
  }

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStage('OCR')
    setIsProcessing(true)
    setOcrProgress({ value: 0, message: 'Initializing OCR...' })

    try {
      const text = await extractTextFromPdf(file, (progress, message) => {
        setOcrProgress({ value: progress, message })
      })
      setMarkdown(text || DEFAULT_TEMPLATE)
      setStage('EDITOR')
    } catch (error) {
      console.error(error)
      const err = error as Error;
      setStatus(`OCR Failed: ${err.message || 'Unknown error'}`)
      setOcrErrorDetails(err.stack || JSON.stringify(err, null, 2))
      setMarkdown(DEFAULT_TEMPLATE) // Fallback
      setStage('EDITOR')
    } finally {
      setIsProcessing(false)
      setOcrProgress(null)
      e.target.value = ''
    }
  }

  const handleGoBack = () => {
    if (confirm('Are you sure? Unsaved changes will be lost.')) {
      setStage('START')
      setStatus('')
    }
  }

  const handleImportKey = async () => {
    try {
      // @ts-ignore
      const result = await window.api.selectKeyFile()
      if (result.filePath && result.content) {
        setConfig({
          ...config,
          keyFilePath: result.filePath,
          privateKey: result.content
        })
        setStatus(`Key imported from: ${result.filePath}`)
      }
    } catch (error) {
      console.error(error)
      setStatus('Failed to import key file')
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
        saveLocation: config.saveLocation
      }

      // @ts-ignore
      const result = await window.api.generateProofFromMarkdown(payload)
      setStatus(`Success! PDF saved to: ${result.filePath}`)
    } catch (error) {
      console.error(error)
      setStatus('Error generating PDF. Check console.')
    } finally {
      setIsProcessing(false)
    }
  }

  // --- Renderers ---

  if (stage === 'START') {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        overflow: 'auto',
        background: 'var(--color-background)'
      }}>
        <StartScreen onOptionSelect={handleStartOption} />
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
      background: 'var(--color-background)'
    }}>
      <div className="main-container">

        <div className="page-header">
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
            <i className="fas fa-arrow-left"></i> Back to Start
          </button>
        </div>

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
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
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

            <div>
              <label className="label-text">
                Signing Algorithm
              </label>
              <select
                value={config.algorithm}
                onChange={(e) => setConfig({ ...config, algorithm: e.target.value as any })}
                className="select-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="RSA-SHA256">RSA-SHA256</option>
                <option value="ECDSA-P256">ECDSA-P256</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label-text">
              Private Key
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={handleImportKey}
                className="btn btn-outline"
              >
                <i className="fas fa-folder-open"></i> Import from File
              </button>
              {config.keyFilePath && (
                <span style={{
                  padding: '10px',
                  color: 'var(--ev-c-success)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ✓ {config.keyFilePath.split('/').pop()}
                </span>
              )}
            </div>
            <textarea
              value={config.privateKey}
              onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----&#10;&#10;Or click 'Import from File' above"
              className="textarea-field"
              style={{
                minHeight: '120px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '12px',
                resize: 'vertical',
                lineHeight: '1.5'
              }}
            />
            <small style={{
              color: '#999',
              fontSize: '12px',
              display: 'block',
              marginTop: '8px'
            }}>
              If not provided, an ephemeral key will be generated (not recommended for production)
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label-text">
              Save Location
            </label>
            <button
              onClick={handleChooseSaveLocation}
              className="btn btn-outline"
            >
              <i className="fas fa-folder"></i> Choose Save Location
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
