import React, { useState } from 'react';

function PollCreator({ onCreatePoll, onCancel }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = () => {
    const trimmedQ = question.trim();
    const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (!trimmedQ) return;
    if (validOptions.length < 2) return;
    onCreatePoll(trimmedQ, validOptions, isAnonymous, allowMultiple);
  };

  const isValid = question.trim().length > 0 && options.filter(o => o.trim().length > 0).length >= 2;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px',
        width: '90%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'scaleIn 0.2s ease', maxHeight: '80vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> Create Poll
          </h3>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '4px'
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Question */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              transition: 'border-color 0.15s', boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            autoFocus
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
            Options
          </label>
          {options.map((opt, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', minWidth: '20px', textAlign: 'center', fontWeight: 600 }}>
                {index + 1}
              </span>
              <input
                type="text"
                value={opt}
                onChange={e => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(index)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '14px', padding: '4px'
                }}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button onClick={addOption} style={{
              background: 'none', border: '1px dashed var(--border-color)', borderRadius: '8px',
              padding: '8px 12px', width: '100%', cursor: 'pointer',
              color: 'var(--primary-color)', fontSize: '13px', fontWeight: 500,
              transition: 'all 0.15s', marginTop: '4px'
            }}>
              <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
              Add Option
            </button>
          )}
        </div>

        {/* Settings */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={e => setAllowMultiple(e.target.checked)}
              style={{ accentColor: 'var(--primary-color)' }}
            />
            <span>Allow multiple answers</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              style={{ accentColor: 'var(--primary-color)' }}
            />
            <span>Anonymous voting</span>
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border-color)',
            background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            color: 'var(--text-secondary)', transition: 'all 0.15s'
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: isValid ? 'var(--primary-color)' : 'var(--bg-tertiary)',
              cursor: isValid ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600,
              color: isValid ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s'
            }}
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
}

export default PollCreator;
