import React, { useEffect, useState, useRef } from 'react';
import { API } from '../api';
import '../ChatModal.css';

export default function TestModal({ botId, onClose }) {
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [activePathId, setActivePathId] = useState(null);
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [fileRequested, setFileRequested] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [currentFormNodeId, setCurrentFormNodeId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript, running, showForm]);

  useEffect(() => {
    if (transcript.length > 0) {
      const lastMessage = transcript[transcript.length - 1];
      
      // Check for file request
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
      
      // Check for message with options
      const isMessageWithOptions = lastMessage.from === 'bot' && 
        lastMessage.type === 'message_with_options';
      
      if (isMessageWithOptions) {
        setSelectedOption(null);
      }

      // **FIXED: Enhanced form detection logic**
      const hasFormFields = lastMessage.form_fields && lastMessage.form_fields.length > 0;
      const isFormNode = lastMessage.node_type === 'google_sheet' || lastMessage.type === 'form';
      const hasFormInContent = lastMessage.content && lastMessage.content.form_fields;
      
      console.log('Form detection:', { 
        hasFormFields, 
        isFormNode, 
        hasFormInContent,
        lastMessage 
      });

      if (hasFormFields || isFormNode || hasFormInContent) {
        const fields = lastMessage.form_fields || 
                     lastMessage.content?.form_fields || 
                     [];
        
        setFormFields(fields);
        setShowForm(true);
        setCurrentFormNodeId(lastMessage.node_id || currentNodeId);
        
        // Initialize form data
        const initialFormData = {};
        fields.forEach(field => {
          initialFormData[field.attributeName || field.attribute_name || field.name] = '';
        });
        setFormData(initialFormData);
        
        console.log('Form initialized:', { fields, initialFormData });
      } else {
        setShowForm(false);
        setFormFields([]);
        setFormData({});
      }
    } else {
      setFileRequested(false);
      setSelectedOption(null);
      setShowForm(false);
      setFormFields([]);
      setFormData({});
    }
  }, [transcript, currentNodeId]);

  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        setUploadSuccess(false);
      }, 500);
      
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
          active_path_id: null,
          session_id: sessionId,
        });
        await addBotMessagesWithDelay(data?.message?.transcript || []);
        setCurrentNodeId(data?.message?.current_node_id ?? null);
        setActivePathId(data?.active_path_id ?? null);
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
      
      // Process image messages
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
      
      // Process file messages
      if (msg.type === 'file') {
        processedMsg.url =
          msg.file ||
          msg.file_content ||
          msg.file_url ||
          (msg.content?.startsWith('data:') ? msg.content : null);
      }
      
      // Process message with options
      if (msg.type === 'message_with_options') {
        processedMsg.options = msg.options || 
                              msg.choices || 
                              msg.buttons || 
                              (msg.content && typeof msg.content === 'object' ? msg.content.options : []) || 
                              [];
        
        if (!Array.isArray(processedMsg.options)) {
          processedMsg.options = [processedMsg.options];
        }
        
        processedMsg.optionsDisplayStyle = msg.options_display_style || 
                                          msg.optionsDisplayStyle || 
                                          msg.display_style || 
                                          'vertical-buttons';
        
        if (!processedMsg.text && msg.content && typeof msg.content === 'object') {
          processedMsg.text = msg.content.text || msg.content.message || 'Please choose an option:';
        } else if (!processedMsg.text) {
          processedMsg.text = 'Please choose an option:';
        }
      }

      // **FIXED: Enhanced form message processing**
      if (msg.node_type === 'google_sheet' || msg.type === 'form' || msg.form_fields) {
        processedMsg.form_fields = msg.form_fields || 
                                  msg.content?.form_fields || 
                                  msg.data?.form_fields || 
                                  [];
        processedMsg.node_id = msg.node_id || currentNodeId;
        processedMsg.type = 'form'; // Force type to form for consistent handling
        
        console.log('Processed form message:', processedMsg);
      }

      setTranscript((prev) => {
        const messageId = processedMsg.url 
          ? `media-${processedMsg.url}-${Date.now()}-${Math.random()}`
          : `text-${processedMsg.text}-${Date.now()}-${Math.random()}`;
        
        const recentMessages = prev.slice(-10);
        const exists = recentMessages.some((m) => {
          if (processedMsg.type === 'image') {
            return m.type === 'image' && m.url === processedMsg.url;
          }
          if (processedMsg.type === 'file') {
            return m.type === 'file' && m.url === processedMsg.url;
          }
          if (processedMsg.type === 'message_with_options') {
            return (
              m.type === 'message_with_options' &&
              m.text === processedMsg.text &&
              JSON.stringify(m.options) === JSON.stringify(processedMsg.options)
            );
          }
          if (processedMsg.type === 'form') {
            return (
              m.type === 'form' &&
              JSON.stringify(m.form_fields) === JSON.stringify(processedMsg.form_fields)
            );
          }
          return m.type === processedMsg.type && m.text === processedMsg.text;
        });

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

  const handleOptionSelect = async (option) => {
    if (running) return;
    
    setSelectedOption(option);
    setRunning(true);
    setTranscript((prev) => [
      ...prev,
      { 
        from: 'user', 
        type: 'text', 
        text: option, 
        timestamp: new Date().toISOString(),
        id: `user-option-${Date.now()}-${Math.random()}`
      },
    ]);

    try {
      const { data } = await API.post(`/chatbots/${botId}/run/`, { 
        user_inputs: { input: option }, 
        current_node_id: currentNodeId,
        active_path_id: activePathId,
        session_id: sessionId
      });
      if (data?.message) {
        await addBotMessagesWithDelay(data.message.transcript || []);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
        
        if (data.uploaded_file || data.message.uploaded_file) {
          setUploadSuccess(true);
        }
      } else if (data?.transcript) {
        await addBotMessagesWithDelay(data.transcript);
        setCurrentNodeId(data.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
        
        if (data.uploaded_file) {
          setUploadSuccess(true);
        }
      } else {
        console.warn('Unexpected response format:', data);
      }
    } catch (error) {
      console.error('Error sending option:', error);
      setTranscript((prev) => [
        ...prev,
        { 
          from: 'bot', 
          type: 'text', 
          text: 'Error occurred while processing your selection', 
          timestamp: new Date().toISOString(),
          id: `error-${Date.now()}-${Math.random()}`
        },
      ]);
    } finally {
      setRunning(false);
      setSelectedOption(null);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (running) return;

    setRunning(true);

    try {
      // **FIXED: Better form data processing**
      let processedMessage = message;
      Object.keys(formData).forEach(attribute => {
        const value = formData[attribute];
        // Handle both {{attribute}} and [attribute] formats
        const placeholders = [`{{${attribute}}}`, `[${attribute}]`];
        placeholders.forEach(placeholder => {
          processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value);
        });
      });

      // Add user message with form data
      setTranscript((prev) => [
        ...prev,
        { 
          from: 'user', 
          type: 'text', 
          text: processedMessage || "Form submitted", 
          timestamp: new Date().toISOString(),
          id: `user-form-${Date.now()}-${Math.random()}`,
          form_data: formData
        },
      ]);

      // **FIXED: Send form data in proper format**
      const payload = {
        user_inputs: { 
          input: processedMessage || "Form submitted",
          form_data: formData 
        }, 
        current_node_id: currentFormNodeId || currentNodeId,
        active_path_id: activePathId,
        session_id: sessionId
      };

      console.log('Sending form data:', payload);

      const { data } = await API.post(`/chatbots/${botId}/run/`, payload);

      if (data?.message) {
        await addBotMessagesWithDelay(data.message.transcript || []);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      } else if (data?.transcript) {
        await addBotMessagesWithDelay(data.transcript);
        setCurrentNodeId(data.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      }

      // Reset form
      setShowForm(false);
      setFormFields([]);
      setFormData({});
      setMessage('');

    } catch (error) {
      console.error('Error submitting form:', error);
      setTranscript((prev) => [
        ...prev,
        { 
          from: 'bot', 
          type: 'text', 
          text: 'Error occurred while processing your form', 
          timestamp: new Date().toISOString(),
          id: `error-${Date.now()}-${Math.random()}`
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const handleFormInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const clearAttachment = () => {
    setFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
  };

  const onPickFile = (e) => {
    if (!fileRequested) return; 
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
        if (activePathId) form.append('active_path_id', activePathId);
        form.append('session_id', sessionId);
        form.append('file', file);
        
        ({ data } = await API.post(`/chatbots/${botId}/run/`, form, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        }));
      } else {
        ({ data } = await API.post(`/chatbots/${botId}/run/`, { 
          user_inputs: { input: message }, 
          current_node_id: currentNodeId,
          active_path_id: activePathId,
          session_id: sessionId
        }));
      }

      if (data?.message) {
        await addBotMessagesWithDelay(data.message.transcript || []);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
        
        if (data.uploaded_file || data.message.uploaded_file) {
          setUploadSuccess(true);
        }
      } else if (data?.transcript) {
        await addBotMessagesWithDelay(data.transcript);
        setCurrentNodeId(data.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
        
        if (data.uploaded_file) {
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

  const isShowingOptions = () => {
    if (transcript.length === 0) return false;
    const lastMessage = transcript[transcript.length - 1];
    return lastMessage.from === 'bot' && lastMessage.type === 'message_with_options';
  };

  const renderOptions = (message) => {
    if (!message.options || message.options.length === 0) {
      return <div className="no-options">No options available</div>;
    }

    const displayStyle = message.optionsDisplayStyle || 'vertical-buttons';
    
    switch (displayStyle) {
      case 'dropdown':
        return (
          <select 
            onChange={(e) => handleOptionSelect(e.target.value)}
            disabled={running || selectedOption !== null}
            className="options-dropdown"
            value=""
          >
            <option value="">Select an option...</option>
            {message.options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'horizontal-buttons':
        return (
          <div className="options-container horizontal">
            {message.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                disabled={running || selectedOption !== null}
                className={`option-button ${selectedOption === option ? 'selected' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        );
      
      case 'vertical-buttons':
      default:
        return (
          <div className="options-container vertical">
            {message.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                disabled={running || selectedOption !== null}
                className={`option-button ${selectedOption === option ? 'selected' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        );
    }
  };

  const renderFormField = (field) => {
    const fieldKey = field.attributeName || field.attribute_name || field.name || field.id;
    const commonProps = {
      value: formData[fieldKey] || '',
      onChange: (e) => handleFormInputChange(fieldKey, e.target.value),
      placeholder: field.placeholder || '',
      required: field.required || false,
      disabled: running,
      className: 'form-field-input'
    };

    switch (field.type) {
      case 'textarea':
        return <textarea {...commonProps} rows={3} />;
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={formData[fieldKey] || false}
              onChange={(e) => handleFormInputChange(fieldKey, e.target.checked)}
              disabled={running}
            />
            <span>{field.placeholder || field.label}</span>
          </label>
        );
      
      case 'radio':
        return (
          <div className="radio-group">
            {field.options?.map((option, index) => (
              <label key={index} className="radio-option">
                <input
                  type="radio"
                  name={fieldKey}
                  value={option}
                  checked={formData[fieldKey] === option}
                  onChange={(e) => handleFormInputChange(fieldKey, e.target.value)}
                  disabled={running}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'email':
        return <input type="email" {...commonProps} />;
      
      case 'number':
        return <input type="number" {...commonProps} />;
      
      case 'date':
        return <input type="date" {...commonProps} />;
      
      case 'tel':
        return <input type="tel" {...commonProps} />;
      
      default:
        return <input type="text" {...commonProps} />;
    }
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
                <div className={`bot-status ${running ? 'typing' : 'online'}`}>
                  {running ? 'Typing...' : 'Online'}
                </div>
              </div>
            </div>
          </div>

          <div className="chat-body" ref={scrollRef}>
            {transcript
              .filter((m) => m.type !== 'path_trigger')
              .map((m) => (
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
                  ) : m.type === 'message_with_options' ? (
                    <div className="message-with-options">
                      <div className="options-message-text" dangerouslySetInnerHTML={{ __html: m.text }} />
                      {renderOptions(m)}
                    </div>
                  ) : m.type === 'form' ? (
                    <div className="form-message">
                      <div className="form-message-text" dangerouslySetInnerHTML={{ __html: m.text }} />
                    </div>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: m.text }} />
                  )}
                  <div className="message-timestamp">{formatTimestamp(m.timestamp)}</div>
                </div>
                {m.from === 'user' && <div className="message-avatar">👤</div>}
              </div>
            ))}
          </div>

          {/* **FIXED: Enhanced Google Sheet Form */}
          {showForm && formFields.length > 0 && (
            <div className="form-container">
              <form onSubmit={handleFormSubmit} className="chat-form">
                <div className="form-header">
                  <h4>📋 Please fill out the form:</h4>
                  
                </div>
                <div className="form-fields">
                  {formFields.map((field, index) => {
                    const fieldKey = field.attributeName || field.attribute_name || field.name || field.id;
                    return (
                      <div key={fieldKey || index} className="form-field">
                        <label className="form-field-label">
                          {field.label || field.name || 'Field'}
                          {field.required && <span className="required-asterisk">*</span>}
                        </label>
                        {renderFormField(field)}
                        {field.description && (
                          <div className="field-description">{field.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="form-actions">
                  
                  <button 
                    type="submit" 
                    disabled={running}
                    className="form-submit-button"
                  >
                    {running ? 'Submitting...' : 'Submit Form'}
                  </button>
                </div>
              </form>
            </div>
          )}

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
                <span>Bot requesting a file. Attach one below and press Send.</span>
              </div>
            </div>
          )}

          {/* Show options banner when options are available */}
          {isShowingOptions() && (
            <div className="options-banner">
              <div className="banner-content">
                <span className="banner-icon">📋</span>
                <span>Please select an option from above</span>
              </div>
            </div>
          )}

          {/* Show input area only when no form is active */}
          {!showForm && (
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
                <button onClick={sendMessage} disabled={running || (!message.trim() && !file)} className="send-button">
                  Send
                </button>
              </div>

              {file && <div className="attachment-row">
                {filePreviewUrl ? <img src={filePreviewUrl} alt="preview" className="attachment-preview"/> : <span className="attachment-chip">📎 {file.name}</span>}
                <button className="attachment-remove" onClick={clearAttachment}>Remove</button>
              </div>}
            </div>
          )}
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