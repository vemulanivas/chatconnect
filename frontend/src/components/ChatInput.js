import React, { useRef, useState, useCallback, useEffect } from 'react';

function ChatInput({
  messageInput,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onToggleEmojiPicker,
  onFileUpload,
  onToggleVoiceRecorder,
  showEmojiPicker,
  emojis,
  onEmojiClick,
  editingMessageId,
  onCancelEdit,
  replyingTo,
  onCancelReply,
  setShowEmojiPicker
}) {
  const editorRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const isInternalUpdate = useRef(false);

  // Convert HTML from contentEditable to markdown for sending
  const htmlToMarkdown = useCallback((html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName.toLowerCase();
      const childContent = Array.from(node.childNodes).map(processNode).join('');

      switch (tag) {
        case 'b':
        case 'strong':
          return `**${childContent}**`;
        case 'i':
        case 'em':
          return `*${childContent}*`;
        case 's':
        case 'strike':
        case 'del':
          return `~~${childContent}~~`;
        case 'code':
          return `\`${childContent}\``;
        case 'pre':
          return `\`\`\`\n${childContent}\n\`\`\``;
        case 'blockquote':
          return childContent.split('\n').map(line => `> ${line}`).join('\n');
        case 'ul': {
          const items = Array.from(node.querySelectorAll(':scope > li'));
          return items.map(li => `- ${processNode(li)}`).join('\n');
        }
        case 'li':
          return childContent;
        case 'br':
          return '\n';
        case 'div':
        case 'p':
          return childContent + '\n';
        default:
          return childContent;
      }
    };

    let result = Array.from(temp.childNodes).map(processNode).join('');
    // Clean up extra trailing newlines
    result = result.replace(/\n+$/, '');
    return result;
  }, []);

  // Convert markdown to HTML for display in contentEditable
  const markdownToHtml = useCallback((md) => {
    if (!md) return '';
    let html = md;
    // Code blocks first
    html = html.replace(/```\n?([\s\S]*?)\n?```/g, '<pre>$1</pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Bullet list items
    html = html.replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
    // Merge consecutive <ul> tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    // Blockquote
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '\n');
    // Newlines to <br> (but not inside pre/ul/blockquote)
    html = html.replace(/\n/g, '<br>');
    return html;
  }, []);

  // Sync external messageInput changes into the editor (e.g. when editing a message)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    const currentText = editor.innerText || '';
    // Only update if the external value is truly different (avoids cursor jump)
    if (messageInput !== currentText.replace(/\n$/, '')) {
      if (!messageInput) {
        editor.innerHTML = '';
      } else {
        editor.innerHTML = markdownToHtml(messageInput);
      }
    }
  }, [messageInput, markdownToHtml]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && setShowEmojiPicker) {
        if (
          emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)
        ) {
          setShowEmojiPicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, setShowEmojiPicker]);

  // Handle typing in the contentEditable div
  const handleEditorInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const md = htmlToMarkdown(editor.innerHTML);
    isInternalUpdate.current = true;
    onInputChange({ target: { value: md } });
  }, [htmlToMarkdown, onInputChange]);

  // Handle Enter key
  const handleEditorKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
    // Allow Shift+Enter for new line (browser default in contentEditable)
  }, [onSendMessage]);

  // Apply formatting using document.execCommand for live rich text
  const applyFormat = (command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    setShowFormatMenu(false);
    // Trigger input sync
    handleEditorInput();
  };

  const formatOptions = [
    { label: 'Bold', icon: 'B', style: { fontWeight: 700 }, action: () => applyFormat('bold') },
    { label: 'Italic', icon: 'I', style: { fontStyle: 'italic' }, action: () => applyFormat('italic') },
    { label: 'Strikethrough', icon: 'S', style: { textDecoration: 'line-through' }, action: () => applyFormat('strikethrough') },
    {
      label: 'Inline Code', icon: '</>', style: { fontFamily: 'monospace', fontSize: '12px' }, action: () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const code = document.createElement('code');
          code.appendChild(range.extractContents());
          range.insertNode(code);
          sel.collapseToEnd();
          handleEditorInput();
        }
        setShowFormatMenu(false);
      }
    },
    { label: 'Bullet List', icon: '•', style: {}, action: () => applyFormat('insertUnorderedList') },
    {
      label: 'Quote', icon: '❝', style: {}, action: () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const bq = document.createElement('blockquote');
          if (!sel.isCollapsed) {
            bq.appendChild(range.extractContents());
          } else {
            bq.innerHTML = '<br>';
          }
          range.insertNode(bq);
          // Move cursor inside blockquote
          const newRange = document.createRange();
          newRange.selectNodeContents(bq);
          newRange.collapse(false);
          sel.removeAllRanges();
          sel.addRange(newRange);
          handleEditorInput();
        }
        setShowFormatMenu(false);
      }
    },
  ];

  // Handle emoji insertion into contentEditable
  const handleEmojiClickInternal = (emoji) => {
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('insertText', false, emoji);
      handleEditorInput();
    }
    // Don't call onEmojiClick here - handleEditorInput already syncs to parent state
  };

  // Handle paste - strip formatting from pasted content
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  }, [handleEditorInput]);

  return (
    <footer className="chat-input-area">
      {editingMessageId && (
        <div className="editing-indicator">
          <span><i className="fas fa-edit"></i> Editing message</span>
          <button onClick={onCancelEdit} className="cancel-edit-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {replyingTo && !editingMessageId && (
        <div className="editing-indicator" style={{ background: 'rgba(110, 64, 201, 0.15)', borderLeft: '3px solid var(--primary-color)' }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85em', color: 'var(--primary-color)' }}>Replying to {replyingTo.senderName || 'message'}</span>
            <span style={{ fontSize: '0.8em', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
              {replyingTo.type === 'call' ? 'Call' : replyingTo.type === 'image' ? 'Image' : replyingTo.content}
            </span>
          </span>
          <button onClick={onCancelReply} className="cancel-edit-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <button
        className="icon-btn"
        onClick={onToggleEmojiPicker}
        title="Emoji"
        ref={emojiButtonRef}
      >
        <i className="far fa-smile"></i>
      </button>

      <button
        className="icon-btn"
        onClick={() => document.getElementById('fileInput').click()}
        title="Attach"
      >
        <i className="fas fa-paperclip"></i>
      </button>

      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={onFileUpload}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {/* Format button with dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className="icon-btn"
          onClick={() => setShowFormatMenu(!showFormatMenu)}
          title="Format text"
          style={showFormatMenu ? { color: 'var(--primary-color)' } : {}}
        >
          <i className="fas fa-font"></i>
        </button>

        {showFormatMenu && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '0',
            marginBottom: '8px', background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            minWidth: '180px', zIndex: 1000, overflow: 'hidden',
            animation: 'scaleIn 0.15s ease'
          }}>
            <div style={{ padding: '6px 12px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Format
            </div>
            {formatOptions.map(opt => (
              <button key={opt.label}
                onClick={opt.action}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                  textAlign: 'left', transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ width: '24px', textAlign: 'center', fontSize: '14px', ...opt.style }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="message-input-wrapper">
        <div
          ref={editorRef}
          className="rich-text-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          data-placeholder={editingMessageId ? "Edit your message..." : "Type a message"}
          role="textbox"
          aria-multiline="true"
        />
      </div>

      {messageInput.trim() ? (
        <button className="send-btn" onClick={onSendMessage} title="Send">
          <i className="fas fa-paper-plane"></i>
        </button>
      ) : (
        <button
          className="icon-btn"
          onClick={onToggleVoiceRecorder}
          title="Voice Message"
        >
          <i className="fas fa-microphone"></i>
        </button>
      )}

      {showEmojiPicker && (
        <div className="emoji-picker" ref={emojiPickerRef}>
          <div className="emoji-grid">
            {emojis.map((emoji, idx) => (
              <span
                key={idx}
                onClick={() => {
                  handleEmojiClickInternal(emoji);
                }}
                className="emoji-item"
                style={{ animationDelay: `${idx * 0.01}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </footer>
  );
}

export default ChatInput;
