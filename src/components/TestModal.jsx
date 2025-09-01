import React, { useEffect, useState, useRef } from 'react';
import { API } from '../api';
import '../ChatModal.css';

export default function TestModal({ botId, onClose }) {
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [fileRequested, setFileRequested] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript, running]);

  useEffect(() => {
    if (transcript.length > 0) {
      const lastMessage = transcript[transcript.length - 1];
      const isFileRequest = lastMessage.from === 'bot' && 
        (lastMessage.type === 'file_request' || 
         (lastMessage.text && (
           lastMessage.text.toLowerCase().includes('requesting a file') ||
           lastMessage.text.toLowerCase().includes('attach one below') ||
           lastMessage.text.toLowerCase().includes('press send') ||
           lastMessage.text.toLowerCase().includes('upload a file') ||
           lastMessage.text.toLowerCase().includes('send a file')
         )));
      
      setFileRequested(isFileRequest);
      if (isFileRequest) {
        //  add some visual indication 
      }
    } else {
      setFileRequested(false);
    }
  }, [transcript]);

  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  useEffect(() => {
    const fetchGreeting = async () => {
      setRunning(true);
      try {
        const { data } = await API.post(`/chatbots/${botId}/run/`, {
          user_inputs: {},
          current_node_id: null,
          session_id: sessionId,
        });
        await addBotMessagesWithDelay(data?.message?.transcript || []);
        setCurrentNodeId(data?.message?.current_node_id ?? null);
      } catch {
        setTranscript((prev) => {
          const exists = prev.some(
            (m) => m.from === 'bot' && m.text === 'Welcome! How can I help you today?'
          );
          if (exists) return prev;
          return [
            ...prev,
            {
              from: 'bot',
              type: 'text',
              text: 'Welcome! How can I help you today?',
              timestamp: new Date().toISOString(),
            },
          ];
        });
      } finally {
        setRunning(false);
      }
    };
    
    if (sessionId) {
      fetchGreeting();
    }
  }, [botId, sessionId]);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const addBotMessagesWithDelay = async (messages) => {
    for (const msg of messages || []) {
      const processedMsg = { ...msg };

      // Handle images
      if (msg.type === 'image') {
        processedMsg.url =
          msg.image ||
          msg.file ||
          msg.file_content ||
          msg.file_url ||
          (msg.content?.startsWith('data:image') ? msg.content : null);

        processedMsg.width = msg.width || 200;
        processedMsg.height = msg.height || 150;

        if (!processedMsg.url) {
          processedMsg.type = 'text';
          processedMsg.text = '[Image not available]';
        }
      }

      // Handle files
      if (msg.type === 'file') {
        processedMsg.url =
          msg.file ||
          msg.file_content ||
          msg.file_url ||
          (msg.content?.startsWith('data:') ? msg.content : null);
      }

      setTranscript((prev) => {
        // Generate a unique ID for each message to avoid false duplicates
        const messageId = processedMsg.url 
          ? `media-${processedMsg.url}-${Date.now()}-${Math.random()}`
          : `text-${processedMsg.text}-${Date.now()}-${Math.random()}`;

        // Only check for very recent duplicates (last 5 messages)
        const recentMessages = prev.slice(-5);
        const exists = recentMessages.some(
          (m) => m.url === processedMsg.url && m.text === processedMsg.text
        );
        
        if (exists) return prev;
        return [
          ...prev,
          { 
            ...processedMsg, 
            id: messageId,
            timestamp: processedMsg.timestamp || new Date().toISOString() 
          },
        ];
      });

      await delay(400);
    }
  };

  const clearAttachment = () => {
    setFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
  };

  const onPickFile = (e) => {
    if (!fileRequested) return; // Don't allow file selection if not requested
    
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) setFilePreviewUrl(URL.createObjectURL(f));
    else setFilePreviewUrl(null);
  };

  const sendMessage = async () => {
    if (running || (!message.trim() && !file)) return;
    setRunning(true);

    if (message.trim())
      setTranscript((prev) => [
        ...prev,
        { 
          from: 'user', 
          type: 'text', 
          text: message, 
          timestamp: new Date().toISOString(),
          id: `user-${Date.now()}-${Math.random()}`
        },
      ]);

    if (file) {
      setTranscript((prev) => [
        ...prev,
        file.type.startsWith('image/')
          ? { 
              from: 'user', 
              type: 'image', 
              url: filePreviewUrl, 
              timestamp: new Date().toISOString(),
              id: `user-image-${Date.now()}-${Math.random()}`
            }
          : { 
              from: 'user', 
              type: 'file', 
              name: file.name, 
              size: file.size, 
              timestamp: new Date().toISOString(),
              id: `user-file-${Date.now()}-${Math.random()}`
            },
      ]);
    }

    try {
      let data;
      if (file) {
        const form = new FormData();
        form.append('user_inputs[input]', message || '');
        if (currentNodeId) form.append('current_node_id', currentNodeId);
        form.append('session_id', sessionId);
        form.append('file', file);
        
        ({ data } = await API.post(`/chatbots/${botId}/run/`, form, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        }));
      } else {
        ({ data } = await API.post(`/chatbots/${botId}/run/`, { 
          user_inputs: { input: message }, 
          current_node_id: currentNodeId,
          session_id: sessionId
        }));
      }

      // Process the response correctly - handle both response formats
      if (data?.message) {
        await addBotMessagesWithDelay(data.message.transcript || []);
        setCurrentNodeId(data.message.current_node_id ?? null);
        
        // Handle file upload success - show toast but don't add extra message
        if (data.uploaded_file || data.message.uploaded_file) {
          setUploadSuccess(true);
        }
      } else {
        // Handle case where response format is different
        await addBotMessagesWithDelay(data?.transcript || []);
        setCurrentNodeId(data?.current_node_id ?? null);
        
        // Handle file upload success for alternative response format
        if (data?.uploaded_file) {
          setUploadSuccess(true);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setTranscript((prev) => [
        ...prev,
        { 
          from: 'bot', 
          type: 'text', 
          text: 'Error occurred while processing your request', 
          timestamp: new Date().toISOString(),
          id: `error-${Date.now()}-${Math.random()}`
        },
      ]);
    } finally {
      setRunning(false);
      setMessage('');
      clearAttachment();
      
      // After sending a file, reset the file request state
      if (file) {
        setFileRequested(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (iso) => {
    const date = new Date(iso);
    return isNaN(date) ? '' : date.toLocaleString();
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="chat-modal">
          <div className="chat-header">
            <div className="chat-bot-info">
              <div className="bot-avatar">🤖</div>
              <div className="bot-details">
                <h3>Chat with Bot</h3>
                <div className={`bot-status ${running ? 'typing' : 'online'}`}>{running ? 'Typing...' : 'Online'}</div>
              </div>
            </div>
            
          </div>

          <div className="chat-body" ref={scrollRef}>
            {transcript.map((m) => (
              <div key={m.id} className={`message ${m.from === 'bot' ? 'bot-message' : m.from === 'system' ? 'system-message' : 'user-message'} ${m.className || ''}`}>
                {m.from === 'bot' && <div className="message-avatar">🤖</div>}
                {m.from === 'system' && <div className="message-avatar">⚙️</div>}
                <div className="message-content">
                  {m.type === 'image' && m.url ? (
                    <img
                      src={m.url}
                      alt="attachment"
                      className="message-image"
                      style={{
                        width: m.width || 300,
                        height: m.height || 150,
                        objectFit: 'contain',
                        cursor: 'pointer',
                      }}
                      onClick={() => setFullscreenImage(m.url)}
                    />
                  ) : m.type === 'file' && m.url ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="file-chip">📎 {m.name || 'File'}</a>
                  ) : m.type === 'file' ? (
                    <span className="file-chip">📎 {m.name || 'File'}</span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: m.text }} />
                  )}
                  <div className="message-timestamp">{formatTimestamp(m.timestamp)}</div>
                </div>
                {m.from === 'user' && <div className="message-avatar">👤</div>}
              </div>
            ))}
          </div>

          {/* Upload Success Toast Notification */}
          {uploadSuccess && (
            <div className="upload-success-toast">
              <div className="toast-content">
                <span className="toast-icon">✅</span>
                <span>File uploaded successfully!</span>
              </div>
            </div>
          )}

          {fileRequested && (
            <div className="file-request-banner">
              <div className="banner-content">
                <span className="banner-icon">📎</span>
                <span>I'm requesting a file. Attach one below and press Send.</span>
              </div>
            </div>
          )}

          <div className={`chat-input-container ${fileRequested ? 'file-requested' : ''}`}>
            <div className="input-wrapper">
              <input 
                type="text" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder={fileRequested ? "You can also add a message with your file..." : "Type a message..."} 
                disabled={running} 
                className="message-input"
              />
              <label className={`attach-button ${fileRequested ? 'enabled' : 'disabled'}`}>
                <input 
                  type="file" 
                  onChange={onPickFile} 
                  style={{display:'none'}} 
                  disabled={!fileRequested || running}
                />
                📎
              </label>
              <button onClick={sendMessage} disabled={running || (!message.trim() && !file)} className="send-button">Send</button>
            </div>

            {file && <div className="attachment-row">
              {filePreviewUrl ? <img src={filePreviewUrl} alt="preview" className="attachment-preview"/> : <span className="attachment-chip">📎 {file.name}</span>}
              <button className="attachment-remove" onClick={clearAttachment}>Remove</button>
            </div>}
          </div>
        </div>
      </div>

      {/* Fullscreen image overlay */}
      {fullscreenImage && (
        <div
          className="fullscreen-overlay"
          onClick={() => setFullscreenImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={fullscreenImage}
              alt="fullscreen"
              style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: 8 }}
              onClick={(e) => e.stopPropagation()} 
            />
            <button
              onClick={() => setFullscreenImage(null)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(10, 255, 83, 0.7)',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                fontSize: 18,
                cursor: 'pointer',
              }}
              aria-label="Close image"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}