import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // In production, you'd send this to an error tracking service
        console.error('[ErrorBoundary] Caught:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
                    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                    padding: '20px',
                }}>
                    <div style={{
                        maxWidth: '480px',
                        width: '100%',
                        textAlign: 'center',
                        animation: 'fadeIn 0.5s ease',
                    }}>
                        {/* Error Icon */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto 24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
                            border: '2px solid rgba(239,68,68,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                        }}>
                            ⚠️
                        </div>

                        <h1 style={{
                            color: '#fff',
                            fontSize: '24px',
                            fontWeight: 700,
                            margin: '0 0 8px',
                            letterSpacing: '-0.5px',
                        }}>
                            Something went wrong
                        </h1>

                        <p style={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '15px',
                            lineHeight: 1.6,
                            margin: '0 0 32px',
                        }}>
                            An unexpected error occurred. Don't worry — your data is safe.
                            Try reloading the page or going back to the home screen.
                        </p>

                        {/* Error details (collapsed) */}
                        {this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                marginBottom: '24px',
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                            }}>
                                <summary style={{
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Technical Details
                                </summary>
                                <pre style={{
                                    color: '#fca5a5',
                                    fontSize: '12px',
                                    marginTop: '8px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: '120px',
                                    overflow: 'auto',
                                }}>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102,126,234,0.4)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <i className="fas fa-redo-alt" style={{ fontSize: '12px' }}></i>
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
