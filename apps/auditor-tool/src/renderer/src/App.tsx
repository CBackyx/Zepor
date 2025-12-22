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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        overflow: 'auto'
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Extracting Text from PDF...</h2>
          <div style={{
            width: '300px',
            height: '10px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '5px',
            margin: '0 auto 20px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(ocrProgress?.value || 0) * 100}%`,
              height: '100%',
              background: '#4fd1c5',
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
      overflow: 'auto',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        padding: '40px',
        maxWidth: '1100px',
        margin: '0 auto',
        backgroundColor: 'white',
        minHeight: 'calc(100vh - 80px)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        borderRadius: '12px',
        marginTop: '40px',
        marginBottom: '40px',
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
            color: '#666',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-arrow-left"></i> Back to Start
        </button>

        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '2px solid #f0f0f0',
          marginTop: '20px'
        }}>
          <h1 style={{
            color: '#667eea',
            marginBottom: '10px',
            fontSize: '32px',
            fontWeight: '700'
          }}>
            Zepor Auditor Tool
          </h1>
          <p style={{
            color: '#666',
            fontSize: '16px'
          }}>
            Create and sign professional Proof of Reserve documents
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            marginBottom: '15px',
            color: '#333',
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
            color: '#333',
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
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#555'
              }}>
                Signer ID
              </label>
              <input
                type="text"
                value={config.signerId}
                onChange={(e) => setConfig({ ...config, signerId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#555'
              }}>
                Signing Algorithm
              </label>
              <select
                value={config.algorithm}
                onChange={(e) => setConfig({ ...config, algorithm: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="RSA-SHA256">RSA-SHA256</option>
                <option value="ECDSA-P256">ECDSA-P256</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#555'
            }}>
              Private Key
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={handleImportKey}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5568d3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
              >
                📁 Import from File
              </button>
              {config.keyFilePath && (
                <span style={{
                  padding: '10px',
                  color: '#28a745',
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
              style={{
                width: '100%',
                padding: '12px',
                minHeight: '120px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '12px',
                boxSizing: 'border-box',
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
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#555'
            }}>
              Save Location
            </label>
            <button
              onClick={handleChooseSaveLocation}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              📂 Choose Save Location
            </button>
            {config.saveLocation && (
              <p style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#666',
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
          style={{
            width: '100%',
            padding: '18px',
            backgroundColor: isProcessing ? '#cccccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '20px',
            transition: 'all 0.2s',
            boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(40, 167, 69, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) e.currentTarget.style.backgroundColor = '#218838'
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) e.currentTarget.style.backgroundColor = '#28a745'
          }}
        >
          {isProcessing ? '⏳ Processing...' : '🔐 Generate & Sign PDF'}
        </button>

        {status && (
          <div style={{
            padding: '16px',
            backgroundColor: status.includes('Success') || status.includes('imported') || status.includes('location')
              ? '#d4edda' : '#f8d7da',
            color: status.includes('Success') || status.includes('imported') || status.includes('location')
              ? '#155724' : '#721c24',
            borderRadius: '8px',
            border: `1px solid ${status.includes('Success') || status.includes('imported') || status.includes('location')
              ? '#c3e6cb' : '#f5c6cb'}`,
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
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px', fontFamily: 'monospace' }}>
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
