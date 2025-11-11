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
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const validateFieldValue = (field, value) => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return { isValid: false, message: `${field.label || 'This field'} is required` };
    }

    if (!value || value.toString().trim() === '') {
      return { isValid: true }; // Empty optional field is valid
    }

    const stringValue = value.toString().trim();

    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(stringValue)) {
          return { isValid: false, message: 'Please enter a valid email address' };
        }
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanedValue = stringValue.replace(/[^\d+]/g, '');
        if (!phoneRegex.test(cleanedValue)) {
          return { isValid: false, message: 'Please enter a valid phone number' };
        }
        if (field.validation?.international && !stringValue.startsWith('+')) {
          return { isValid: false, message: 'International numbers must start with +' };
        }
        break;

      case 'number':
        const numValue = parseFloat(stringValue);
        if (isNaN(numValue)) {
          return { isValid: false, message: 'Please enter a valid number' };
        }
        if (field.validation?.integerOnly && !Number.isInteger(numValue)) {
          return { isValid: false, message: 'Only whole numbers are allowed' };
        }
        if (field.validation?.minValue !== undefined && numValue < field.validation.minValue) {
          return { isValid: false, message: `Value must be at least ${field.validation.minValue}` };
        }
        if (field.validation?.maxValue !== undefined && numValue > field.validation.maxValue) {
          return { isValid: false, message: `Value must be at most ${field.validation.maxValue}` };
        }
        break;

      case 'text':
        if (field.validation?.minLength && stringValue.length < (field.validation.minLengthValue || 1)) {
          return { isValid: false, message: `Minimum length is ${field.validation.minLengthValue} characters` };
        }
        if (field.validation?.maxLength && stringValue.length > (field.validation.maxLengthValue || 100)) {
          return { isValid: false, message: `Maximum length is ${field.validation.maxLengthValue} characters` };
        }
        if (field.validation?.pattern && field.validation.patternValue) {
          try {
            const regex = new RegExp(field.validation.patternValue);
            if (!regex.test(stringValue)) {
              return { isValid: false, message: 'Input does not match required format' };
            }
          } catch (error) {
            console.error('Invalid regex pattern:', error);
          }
        }
        break;

      case 'date':
        const dateValue = new Date(stringValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (field.validation?.beforeToday && dateValue >= today) {
          return { isValid: false, message: 'Date must be before today' };
        }
        if (field.validation?.afterToday && dateValue <= today) {
          return { isValid: false, message: 'Date must be after today' };
        }
        if (field.validation?.minDate && dateValue < new Date(field.validation.minDate)) {
          return { isValid: false, message: `Date must be after ${field.validation.minDate}` };
        }
        if (field.validation?.maxDate && dateValue > new Date(field.validation.maxDate)) {
          return { isValid: false, message: `Date must be before ${field.validation.maxDate}` };
        }
        break;

      default:
        break;
    }

    return { isValid: true };
  };

  // Initialize session ID
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      
      setIsAtBottom(isNearBottom);
      
      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setShowScrollToBottom(false);
      }
    }
  }, [transcript, running, showForm]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setIsAtBottom(isNearBottom);
      setShowScrollToBottom(!isNearBottom && scrollHeight > clientHeight);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollToBottom(false);
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    if (!showForm && !running && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showForm, running, transcript]);

  useEffect(() => {
    if (transcript.length === 0) {
      setFileRequested(false);
      setSelectedOption(null);
      setShowForm(false);
      setFormFields([]);
      setFormData({});
      setFieldErrors({});
      setTouchedFields({});
      return;
    }

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

    const hasFormFields = lastMessage.form_fields && lastMessage.form_fields.length > 0;
    const isFormNode = lastMessage.node_type === 'google_sheet' || lastMessage.type === 'form';
    const hasFormInContent = lastMessage.content && lastMessage.content.form_fields;

    if (hasFormFields || isFormNode || hasFormInContent) {
      const fields = lastMessage.form_fields || 
                   lastMessage.content?.form_fields || 
                   [];
      
      if (fields.length > 0) {
        setFormFields(fields);
        setShowForm(true);
        setCurrentFormNodeId(lastMessage.node_id || currentNodeId);
        setFieldErrors({});
        setTouchedFields({});

        const initialFormData = {};
        fields.forEach(field => {
          const fieldKey = field.attributeName || field.attribute_name || field.name;
          initialFormData[fieldKey] = formData[fieldKey] || '';
        });
        setFormData(initialFormData);
      }
    } else {
      if (!lastMessage.form_fields && !lastMessage.content?.form_fields) {
        setShowForm(false);
        setFieldErrors({});
        setTouchedFields({});
      }
    }
  }, [transcript, currentNodeId, formData]);

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
      if (!sessionId) return;
      
      setRunning(true);
      try {
        const { data } = await API.post(`/chatbots/${botId}/run/`, {
          user_inputs: {},
          current_node_id: null,
          active_path_id: null,
          session_id: sessionId,
        });
        
        if (data?.message) {
          await processAndAddMessages(data.message.transcript || []);
          setCurrentNodeId(data.message.current_node_id ?? null);
          setActivePathId(data.active_path_id ?? null);
        } else if (data?.transcript) {
          await processAndAddMessages(data.transcript);
          setCurrentNodeId(data.current_node_id ?? null);
          setActivePathId(data.active_path_id ?? null);
        }
      } catch (error) {
        console.error('Error fetching greeting:', error);
        setTranscript(prev => {
          const exists = prev.some(m => m.from === 'bot' && m.text.includes('Welcome'));
          if (exists) return prev;
          return [...prev, {
            from: 'bot',
            type: 'text',
            text: 'Welcome! How can I help you today?',
            timestamp: new Date().toISOString(),
            id: `welcome-${Date.now()}`
          }];
        });
      } finally {
        setRunning(false);
      }
    };

    fetchGreeting();
  }, [botId, sessionId]);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const processMessage = (msg) => {
    if (!msg || typeof msg !== 'object') return null;

    const processedMsg = { 
      ...msg,
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: msg.timestamp || new Date().toISOString()
    };
    if (msg.is_faq) {
      processedMsg.className = 'faq-response';
    }

    if (msg.text && (
        msg.text.includes("I'm sorry") || 
        msg.text.includes("I didn't understand") ||
        msg.text.includes("I don't understand") ||
        msg.text.includes("I'm not sure") ||
        msg.text.includes("I apologize") ||
        msg.text.includes("I'm still learning") ||
        msg.text.includes("I didn't catch that")
    )) {
      processedMsg.className = processedMsg.className ? `${processedMsg.className} fallback-response` : 'fallback-response';
    }

    switch (msg.type) {
      case 'image':
        processedMsg.url = msg.image || msg.file || msg.file_content || msg.file_url || 
                          (msg.content?.startsWith('data:image') ? msg.content : null);
        processedMsg.width = msg.width || 200;
        processedMsg.height = msg.height || 150;
        
        if (!processedMsg.url) {
          processedMsg.type = 'text';
          processedMsg.text = '[Image not available]';
        }
        break;

      case 'file':
        processedMsg.url = msg.file || msg.file_content || msg.file_url || 
                          (msg.content?.startsWith('data:') ? msg.content : null);
        processedMsg.name = msg.name || 'File';
        break;

      case 'message_with_options':
        processedMsg.options = Array.isArray(msg.options) ? msg.options : 
                              Array.isArray(msg.choices) ? msg.choices :
                              Array.isArray(msg.buttons) ? msg.buttons :
                              Array.isArray(msg.content?.options) ? msg.content.options : [];
        
        processedMsg.optionsDisplayStyle = msg.options_display_style || 
                                          msg.optionsDisplayStyle || 
                                          msg.display_style || 
                                          'vertical-buttons';
        
        if (!processedMsg.text) {
          processedMsg.text = msg.content?.text || msg.content?.message || 'Please choose an option:';
        }
        break;

      default:
        if (msg.node_type === 'google_sheet' || msg.type === 'form' || msg.form_fields) {
          processedMsg.form_fields = msg.form_fields || msg.content?.form_fields || [];
          processedMsg.type = 'form';
          if (!processedMsg.text) {
            processedMsg.text = 'Please fill out the form below:';
          }
        }
        break;
    }

    if (!processedMsg.text && processedMsg.content && typeof processedMsg.content === 'string') {
      processedMsg.text = processedMsg.content;
    }

    return processedMsg;
  };

  const processAndAddMessages = async (messages) => {
    if (!messages || !Array.isArray(messages)) return;

    for (const msg of messages) {
      const processedMsg = processMessage(msg);
      if (!processedMsg) continue;

      setTranscript(prev => {
        const recentMessages = prev.slice(-2);
        const exists = recentMessages.some(existing => 
          existing.id === processedMsg.id || 
          (
            existing.text === processedMsg.text && 
            existing.from === processedMsg.from &&
            Date.now() - new Date(existing.timestamp).getTime() < 1000 //5 seconds
          )
        );
        
        if (exists) {
          console.log('Duplicate message filtered:', processedMsg.text);
          return prev;
        }
        
        console.log('Adding new message:', processedMsg.text);
        return [...prev, processedMsg];
      });

      await delay(400);
    }
  };

  const handleOptionSelect = async (option) => {
    if (running) return;
    
    setSelectedOption(option);
    setRunning(true);
    setTranscript(prev => [...prev, {
      from: 'user',
      type: 'text',
      text: option,
      timestamp: new Date().toISOString(),
      id: `user-option-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    }]);

    try {
      const { data } = await API.post(`/chatbots/${botId}/run/`, {
        user_inputs: { input: option },
        current_node_id: currentNodeId,
        active_path_id: activePathId,
        session_id: sessionId
      });
      if (data?.message?.transcript) {
        await processAndAddMessages(data.message.transcript);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      } else if (data?.transcript) {
        await processAndAddMessages(data.transcript);
        setCurrentNodeId(data.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      } else if (data?.message) {
        await processAndAddMessages([data.message]);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      }

      if (data?.uploaded_file || data?.message?.uploaded_file) {
        setUploadSuccess(true);
      }
    } catch (error) {
      console.error('Error sending option:', error);
      setTranscript(prev => [...prev, {
        from: 'bot',
        type: 'text',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }]);
    } finally {
      setRunning(false);
      setSelectedOption(null);
    }
  };

  const handleFormInputChange = (fieldName, value, field) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };
  const handleFieldBlur = (field) => {
    const fieldKey = field.attributeName || field.attribute_name || field.name;
    setTouchedFields(prev => ({
      ...prev,
      [fieldKey]: true
    }));

    const value = formData[fieldKey];
    const validation = validateFieldValue(field, value);
    
    if (!validation.isValid) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldKey]: validation.message
      }));
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (running) return;
    const allTouched = {};
    const errors = {};
    let hasErrors = false;

    formFields.forEach(field => {
      const fieldKey = field.attributeName || field.attribute_name || field.name;
      allTouched[fieldKey] = true;
      const value = formData[fieldKey];
      const validation = validateFieldValue(field, value);
      
      if (!validation.isValid) {
        errors[fieldKey] = validation.message;
        hasErrors = true;
      }
    });

    setTouchedFields(allTouched);
    setFieldErrors(errors);

    if (hasErrors) {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const errorCount = Object.keys(errors).length;
      alert(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before submitting the form.`);
      return;
    }

    setRunning(true);

    try {
      const payload = {
        user_inputs: { 
          input: '',
          form_data: formData 
        },
        current_node_id: currentFormNodeId || currentNodeId,
        active_path_id: activePathId,
        session_id: sessionId
      };

      const { data } = await API.post(`/chatbots/${botId}/run/`, payload);
      const processPlaceholders = (messages) => {
        return messages.map(msg => {
          if (msg.text && typeof msg.text === 'string') {
            let processedText = msg.text;
            Object.keys(formData).forEach(attribute => {
              const placeholder = `{{${attribute}}}`;
              const value = formData[attribute];
              if (value) {
                processedText = processedText.replace(new RegExp(placeholder, 'g'), value);
              }
            });
            return { ...msg, text: processedText };
          }
          return msg;
        });
      };

      if (data?.message?.transcript) {
        const processedTranscript = processPlaceholders(data.message.transcript);
        await processAndAddMessages(processedTranscript);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      } else if (data?.transcript) {
        const processedTranscript = processPlaceholders(data.transcript);
        await processAndAddMessages(processedTranscript);
        setCurrentNodeId(data.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      }
      setShowForm(false);
      setFormFields([]);
      setFormData({});
      setFieldErrors({});
      setTouchedFields({});
      setMessage('');

    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setRunning(false);
    }
  };
  const sendMessage = async () => {
    if (running || (!message.trim() && !file)) return;
    
    setRunning(true);
    if (message.trim()) {
      setTranscript(prev => [...prev, {
        from: 'user',
        type: 'text',
        text: message,
        timestamp: new Date().toISOString(),
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }]);
    }
    if (file) {
      setTranscript(prev => [...prev, file.type.startsWith('image/') ? {
        from: 'user',
        type: 'image',
        url: filePreviewUrl,
        timestamp: new Date().toISOString(),
        id: `user-image-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      } : {
        from: 'user',
        type: 'file',
        name: file.name,
        size: file.size,
        timestamp: new Date().toISOString(),
        id: `user-file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }]);
    }

    try {
      let response;
      
      if (file) {
        const formData = new FormData();
        formData.append('user_inputs[input]', message || '');
        if (currentNodeId) formData.append('current_node_id', currentNodeId);
        if (activePathId) formData.append('active_path_id', activePathId);
        formData.append('session_id', sessionId);
        formData.append('file', file);
        
        response = await API.post(`/chatbots/${botId}/run/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await API.post(`/chatbots/${botId}/run/`, {
          user_inputs: { input: message },
          current_node_id: currentNodeId,
          active_path_id: activePathId,
          session_id: sessionId
        });
      }

      const { data } = response;

      if (data?.message?.transcript) {
        await processAndAddMessages(data.message.transcript);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      } else if (data?.transcript) {
        await processAndAddMessages(data.transcript);
        setCurrentNodeId(data.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      } else if (data?.message) {
        await processAndAddMessages([data.message]);
        setCurrentNodeId(data.message.current_node_id ?? null);
        setActivePathId(data.active_path_id ?? null);
      }

      if (data?.uploaded_file || data?.message?.uploaded_file) {
        setUploadSuccess(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setTranscript(prev => [...prev, {
        from: 'bot',
        type: 'text',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }]);
    } finally {
      setRunning(false);
      setMessage('');
      clearAttachment();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearAttachment = () => {
    setFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
  };

  const onPickFile = (e) => {
    if (!fileRequested || running) return;
    
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
    } catch {
      return '';
    }
  };

  const isShowingOptions = () => {
    if (transcript.length === 0) return false;
    const lastMessage = transcript[transcript.length - 1];
    return lastMessage.from === 'bot' && lastMessage.type === 'message_with_options' && lastMessage.options?.length > 0;
  };

  const renderOptions = (message) => {
    if (!message.options || message.options.length === 0) {
      return null;
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
    const fieldKey = field.attributeName || field.attribute_name || field.name;
    const error = fieldErrors[fieldKey];
    const touched = touchedFields[fieldKey];
    const showError = touched && error;
    
    const commonProps = {
      value: formData[fieldKey] || '',
      onChange: (e) => handleFormInputChange(fieldKey, e.target.value, field),
      onBlur: () => handleFieldBlur(field),
      placeholder: field.placeholder || '',
      required: field.required || false,
      disabled: running,
      className: `form-field-input ${showError ? 'error' : ''}`,
      'data-field': fieldKey
    };

    const fieldElement = (() => {
      switch (field.type) {
        case 'textarea':
          return <textarea {...commonProps} rows={4} />;
        
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
            <label className={`checkbox-field ${showError ? 'error' : ''}`}>
              <input
                type="checkbox"
                checked={!!formData[fieldKey]}
                onChange={(e) => handleFormInputChange(fieldKey, e.target.checked, field)}
                onBlur={() => handleFieldBlur(field)}
                disabled={running}
                data-field={fieldKey}
              />
              <span>{field.placeholder || field.label}</span>
            </label>
          );
        
        case 'radio':
          return (
            <div className={`radio-group ${showError ? 'error' : ''}`}>
              {field.options?.map((option, index) => (
                <label key={index} className="radio-option">
                  <input
                    type="radio"
                    name={fieldKey}
                    value={option}
                    checked={formData[fieldKey] === option}
                    onChange={(e) => handleFormInputChange(fieldKey, e.target.value, field)}
                    onBlur={() => handleFieldBlur(field)}
                    disabled={running}
                    data-field={fieldKey}
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
        
        case 'phone':
          return <input type="tel" {...commonProps} />;
        
        default:
          return <input type="text" {...commonProps} />;
      }
    })();

    return (
      <div className="form-field-wrapper">
        {fieldElement}
        {showError && <div className="field-error">{error}</div>}
      </div>
    );
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
            {/* <button className="close-button" onClick={onClose}>×</button> */}
          </div>

          <div className="chat-body" ref={scrollRef} onScroll={handleScroll}>
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
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="file-chip">
                        📎 {m.name || 'File'}
                      </a>
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
            
            {/* Scroll to bottom indicator */}
            {showScrollToBottom && (
              <div className="scroll-to-bottom-indicator" onClick={scrollToBottom}>
                <div className="scroll-indicator-content">
                  <span className="scroll-indicator-text">New messages</span>
                  <span className="scroll-indicator-arrow">↓</span>
                </div>
              </div>
            )}
              
            {running && (
              <div className="message bot-message">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Container */}
          {showForm && formFields.length > 0 && (
            <div className="form-container">
              <form onSubmit={handleFormSubmit} className="chat-form">
                <div className="form-header">
                  <h4>📋 Please fill out the form:</h4>
                </div>
                <div className="form-fields">
                  {formFields.map((field, index) => {
                    const fieldKey = field.attributeName || field.attribute_name || field.name;
                    return (
                      <div key={fieldKey || index} className="form-field" data-field={fieldKey}>
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

          {/* Upload Success notfi */}
          {uploadSuccess && (
            <div className="upload-success-toast">
              <div className="toast-content">
                <span className="toast-icon">✅</span>
                <span>File uploaded successfully!</span>
              </div>
            </div>
          )}

          {/* File Request */}
          {fileRequested && (
            <div className="file-request-banner">
              <div className="banner-content">
                <span className="banner-icon">📎</span>
                <span>Bot is requesting a file. Attach one below and press Send.</span>
              </div>
            </div>
          )}

          {/* Options Banner */}
          {isShowingOptions() && (
            <div className="options-banner">
              <div className="banner-content">
                <span className="banner-icon">📋</span>
                <span>Please select an option from above</span>
              </div>
            </div>
          )}

          {/* Chat Input */}
          {!showForm && (
            <div className={`chat-input-container ${fileRequested ? 'file-requested' : ''}`}>
              <div className="input-wrapper">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  onKeyDown={handleKeyDown} 
                  placeholder={fileRequested ? "You can also add a message with your file..." : "Type a message..."} 
                  disabled={running} 
                  className="message-input"
                  autoFocus
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
                <button 
                  onClick={sendMessage} 
                  disabled={running || (!message.trim() && !file)} 
                  className="send-button"
                >
                  {running ? 'Sending...' : 'Send'}
                </button>
              </div>

              {file && (
                <div className="attachment-row">
                  {filePreviewUrl ? (
                    <img src={filePreviewUrl} alt="preview" className="attachment-preview"/>
                  ) : (
                    <span className="attachment-chip">📎 {file.name}</span>
                  )}
                  <button className="attachment-remove" onClick={clearAttachment}>Remove</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <img src={fullscreenImage} alt="fullscreen" className="fullscreen-image"/>
            <button className="close-fullscreen" onClick={() => setFullscreenImage(null)}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}