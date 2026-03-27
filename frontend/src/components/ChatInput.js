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
  setShowEmojiPicker,
  participants = [],
  currentUser,
  priority = 'normal',
  onPriorityChange,
  mentions = [],
  onMentionsChange,
  users = []
}) {
  const editorRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [giphySearch, setGiphySearch] = useState('');
  const [giphyResults, setGiphyResults] = useState([]);
  const giphyRef = useRef(null);
  const giphyApiKey = 'dc6zaTOxFJmzC'; // Public Beta API Key
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
        case 'span':
          // @mention spans
          if (node.dataset?.mentionId) {
            return `@${childContent}`;
          }
          return childContent;
        default:
          return childContent;
      }
    };

    let result = Array.from(temp.childNodes).map(processNode).join('');
    result = result.replace(/\n+$/, '');
    return result;
  }, []);

  // Convert markdown to HTML for display in contentEditable
  const markdownToHtml = useCallback((md) => {
    if (!md) return '';
    let html = md;
    html = html.replace(/```\n?([\s\S]*?)\n?```/g, '<pre>$1</pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\s*<blockquote>/g, '\n');
    html = html.replace(/\n/g, '<br>');
    return html;
  }, []);

  // Sync external messageInput changes into the editor
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    const currentText = editor.innerText || '';
    if (messageInput !== currentText.replace(/\n$/, '')) {
      if (!messageInput) {
        editor.innerHTML = '';
      } else {
        editor.innerHTML = markdownToHtml(messageInput);
      }
    }
  }, [messageInput, markdownToHtml]);

  // Close Giphy picker on outside click
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
      if (showGiphyPicker) {
        if (giphyRef.current && !giphyRef.current.contains(event.target)) {
          setShowGiphyPicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, setShowEmojiPicker, showGiphyPicker]);

  // Handle Giphy Search
  useEffect(() => {
    if (!showGiphyPicker || !giphySearch) {
      if (showGiphyPicker && !giphySearch) {
          fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=12`)
            .then(res => res.json())
            .then(json => setGiphyResults(json.data || []));
      }
      return;
    }
    const timer = setTimeout(() => {
      fetch(`https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(giphySearch)}&limit=12`)
        .then(res => res.json())
        .then(json => setGiphyResults(json.data || []));
    }, 400);
    return () => clearTimeout(timer);
  }, [giphySearch, showGiphyPicker]);

  // Handle typing in the contentEditable div
  const handleEditorInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const md = htmlToMarkdown(editor.innerHTML);
    isInternalUpdate.current = true;
    onInputChange({ target: { value: md } });

    // Detect @ for mention popup
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const textBeforeCursor = getTextBeforeCursor(range);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);
      if (atMatch) {
        setMentionSearch(atMatch[1]);
        setShowMentionMenu(true);
        setMentionIndex(0);
      } else {
        setShowMentionMenu(false);
        setMentionSearch('');
      }
    }
  }, [htmlToMarkdown, onInputChange]);

  // Get text before cursor in the editor
  const getTextBeforeCursor = (range) => {
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editorRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString();
  };

  // Filter all users (or just participants) for mention menu
  const mentionCandidates = (users && users.length > 0 ? users : participants)
    .filter(p => p && p.id !== currentUser?.id)
    .filter(p => {
      if (!mentionSearch) return true;
      const q = mentionSearch.toLowerCase();
      const name = (p.fullName || '').toLowerCase();
      const username = (p.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    })
    .slice(0, 8);

  // Insert @mention
  const insertMention = useCallback((user) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Find and delete the @query text
    const textBeforeCursor = getTextBeforeCursor(range);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      // Delete backwards from cursor
      const deleteLength = atMatch[0].length;
      for (let i = 0; i < deleteLength; i++) {
        document.execCommand('delete', false, null);
      }
    }

    // Insert mention span
    const mentionSpan = document.createElement('span');
    mentionSpan.contentEditable = 'false';
    mentionSpan.className = 'mention-span';
    mentionSpan.dataset.mentionId = user.id;
    mentionSpan.textContent = user.fullName || user.username;

    const newRange = sel.getRangeAt(0);
    newRange.insertNode(mentionSpan);

    // Insert a space after
    const space = document.createTextNode('\u00A0');
    mentionSpan.parentNode.insertBefore(space, mentionSpan.nextSibling);

    // Move cursor after space
    const afterRange = document.createRange();
    afterRange.setStartAfter(space);
    afterRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(afterRange);

    // Update mentions list
    if (onMentionsChange) {
      const newMentions = [...(mentions || [])];
      if (!newMentions.includes(user.id)) {
        newMentions.push(user.id);
      }
      onMentionsChange(newMentions);
    }

    setShowMentionMenu(false);
    setMentionSearch('');
    handleEditorInput();
  }, [mentions, onMentionsChange, handleEditorInput]);

  // Handle Enter key
  const handleEditorKeyDown = useCallback((e) => {
    // Handle mention menu navigation
    if (showMentionMenu && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, mentionCandidates.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage, showMentionMenu, mentionCandidates, mentionIndex, insertMention]);

  // Apply formatting
  const applyFormat = (command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    setShowFormatMenu(false);
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

  const priorityOptions = [
    { value: 'normal', label: 'Normal', icon: '💬', color: 'var(--text-secondary)' },
    { value: 'important', label: 'Important', icon: '❗', color: '#f59e0b' },
    { value: 'urgent', label: 'Urgent', icon: '🔴', color: '#ef4444' },
  ];

  // Handle emoji insertion
  const handleEmojiClickInternal = (emoji) => {
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('insertText', false, emoji);
      handleEditorInput();
    }
  };

  // Handle paste
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  }, [handleEditorInput]);

  const currentPriority = priorityOptions.find(p => p.value === priority) || priorityOptions[0];

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

      {/* Priority indicator when not normal */}
      {priority && priority !== 'normal' && (
        <div style={{
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 600,
          color: currentPriority.color,
          background: priority === 'urgent' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
          marginBottom: '4px'
        }}>
          <span>{currentPriority.icon}</span>
          <span>{currentPriority.label} Message</span>
          <button onClick={() => onPriorityChange && onPriorityChange('normal')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: currentPriority.color,
            marginLeft: 'auto', padding: '0 4px', fontSize: '14px'
          }}>
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

      {/* Giphy / Sticker Picker */}
      <div style={{ position: 'relative' }} ref={giphyRef}>
        <button
          className="icon-btn"
          onClick={() => setShowGiphyPicker(!showGiphyPicker)}
          title="Send Sticker / GIF"
          style={showGiphyPicker ? { color: '#00dc6b' } : {}}
        >
          <i className="fas fa-sticky-note"></i>
        </button>

        {showGiphyPicker && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '0',
            marginBottom: '10px', background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            width: '280px', zIndex: 1001, overflow: 'hidden',
            animation: 'scaleIn 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
               <div style={{ position: 'relative', flex: 1 }}>
                 <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', opacity: 0.5 }}></i>
                 <input 
                   type="text" 
                   placeholder="Search Giphy..."
                   autoFocus
                   value={giphySearch}
                   onChange={e => setGiphySearch(e.target.value)}
                   style={{
                     width: '100%', padding: '6px 10px 6px 28px', borderRadius: '20px',
                     border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                     fontSize: '12px', color: 'var(--text-primary)', outline: 'none'
                   }}
                 />
               </div>
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {giphyResults.map(gif => (
                <div 
                  key={gif.id} 
                  onClick={() => { 
                    onSendMessage(gif.images.fixed_height.url, 'image');
                    setShowGiphyPicker(false);
                    setGiphySearch('');
                  }}
                  style={{ 
                    cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', 
                    height: '100px', background: 'var(--bg-secondary)',
                    transition: 'transform 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(0.96)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img 
                    src={gif.images.fixed_height_small.url} 
                    alt={gif.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
              {giphyResults.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                   {giphySearch ? 'No stickers found' : 'Loading trending GIFs...'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Priority / Delivery Options button */}
      <div style={{ position: 'relative' }}>
        <button
          className="icon-btn"
          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
          title="Message priority"
          style={priority !== 'normal' ? { color: currentPriority.color } : (showPriorityMenu ? { color: 'var(--primary-color)' } : {})}
        >
          <i className="fas fa-exclamation-circle"></i>
        </button>

        {showPriorityMenu && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '0',
            marginBottom: '8px', background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            minWidth: '180px', zIndex: 1000, overflow: 'hidden',
            animation: 'scaleIn 0.15s ease'
          }}>
            <div style={{ padding: '6px 12px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Delivery
            </div>
            {priorityOptions.map(opt => (
              <button key={opt.value}
                onClick={() => {
                  onPriorityChange && onPriorityChange(opt.value);
                  setShowPriorityMenu(false);
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 14px', background: priority === opt.value ? 'var(--bg-secondary)' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: '13px',
                  color: priority === opt.value ? opt.color : 'var(--text-primary)',
                  textAlign: 'left', transition: 'background 0.1s', fontWeight: priority === opt.value ? 600 : 400
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => { if (priority !== opt.value) e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                <span>{opt.label}</span>
                {priority === opt.value && <i className="fas fa-check" style={{ marginLeft: 'auto', fontSize: '11px', color: opt.color }}></i>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="message-input-wrapper" style={{ position: 'relative' }}>
        <div
          ref={editorRef}
          className="rich-text-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          data-placeholder={editingMessageId ? "Edit your message..." : "Type a message — use @ to mention"}
          role="textbox"
          aria-multiline="true"
        />

        {/* @Mention popup */}
        {showMentionMenu && mentionCandidates.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '0', right: '0',
            marginBottom: '6px', background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            maxHeight: '200px', overflowY: 'auto', zIndex: 1100,
            animation: 'scaleIn 0.12s ease'
          }}>
            <div style={{ padding: '6px 12px 2px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mention someone
            </div>
            {mentionCandidates.map((user, idx) => (
              <button key={user.id}
                onClick={() => insertMention(user)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '7px 14px', background: idx === mentionIndex ? 'var(--bg-secondary)' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: '13px',
                  color: 'var(--text-primary)', textAlign: 'left', transition: 'background 0.1s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; setMentionIndex(idx); }}
                onMouseLeave={e => { if (idx !== mentionIndex) e.currentTarget.style.background = 'none'; }}
              >
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=667eea&color=fff&size=24`}
                  alt={user.fullName}
                  style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontWeight: 500 }}>{user.fullName || user.username}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>@{user.username}</span>
              </button>
            ))}
          </div>
        )}
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
