import React from 'react';
import '../index.css';

const IncomingCallModal = ({ callerName, callType, onAccept, onReject }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s'
        }}>
            <div style={{
                background: 'var(--bg-primary)',
                width: 320,
                borderRadius: 24,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: 'var(--shadow-xl)',
                animation: 'scaleIn 0.3s'
            }}>
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    color: '#fff',
                    marginBottom: 20,
                    animation: 'pulse 2s infinite'
                }}>
                    {callerName ? callerName.charAt(0).toUpperCase() : '?'}
                </div>

                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: 20 }}>{callerName}</h3>
                <p style={{ margin: '0 0 32px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                    Incoming {callType} call...
                </p>

                <div style={{ display: 'flex', gap: 24, width: '100%', justifyContent: 'center' }}>
                    <button
                        onClick={onReject}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: 'none',
                            background: '#da3633',
                            color: 'white',
                            fontSize: 24,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s',
                            boxShadow: '0 4px 12px rgba(218, 54, 51, 0.4)'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <i className="fas fa-phone-slash"></i>
                    </button>

                    <button
                        onClick={onAccept}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: 'none',
                            background: '#3fb950',
                            color: 'white',
                            fontSize: 24,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s',
                            boxShadow: '0 4px 12px rgba(63, 185, 80, 0.4)'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <i className={`fas fa-${callType === 'video' ? 'video' : 'phone'}`}></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
