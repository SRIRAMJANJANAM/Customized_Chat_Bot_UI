import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './Builder.module.css';
import { API } from '../api'; // Import your API configuration

const EditPropertiesModal = ({
  selected,
  updateSelected,
  handleFileChange,
  paths,
  activePath,
  onSave,
  onCancel,
  onDelete,
  onClose
}) => {
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [jsonErrors, setJsonErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    headers: true,
    body: true,
    mapping: true,
    testResults: false
  });

  if (!selected) return null;

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Test email configuration function
  const testEmailConfiguration = async () => {
    if (!selected.data.emailSenderEmail || !selected.data.emailRecipients) {
      alert('Please configure sender email and recipients first');
      return;
    }

    try {
      setTestingEmail(true);
      
      const botId = activePath?.chatbot || 'current';
      
      const response = await API.post(`/chatbots/${botId}/send_test_email/`, {
        node_id: selected.id,
        test_recipient: selected.data.emailRecipients.split(',')[0].trim()
      });

      if (response.data) {
        alert('✅ Test email sent successfully!');
      } else {
        alert('❌ Failed to send test email');
      }
    } catch (error) {
      console.error('Test email error:', error);
      alert('❌ Error sending test email: ' + (error.response?.data?.error || error.message));
    } finally {
      setTestingEmail(false);
    }
  };

  // Enhanced JSON validation and formatting
  const validateAndFormatJson = (value, fieldName) => {
    const errors = { ...jsonErrors };
    
    if (!value || value.trim() === '') {
      delete errors[fieldName];
      setJsonErrors(errors);
      return { value: '', formatted: '', isValid: true };
    }

    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      delete errors[fieldName];
      setJsonErrors(errors);
      return { value: formatted, formatted, isValid: true, parsed };
    } catch (error) {
      const trimmed = value.trim();
      if ((trimmed.startsWith('{') && !trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && !trimmed.endsWith(']'))) {
        errors[fieldName] = 'Incomplete JSON';
        setJsonErrors(errors);
        return { value, formatted: value, isValid: false };
      }
      
      errors[fieldName] = 'Invalid JSON format';
      setJsonErrors(errors);
      return { value, formatted: value, isValid: false };
    }
  };

  // Handle JSON input changes
  const handleJsonChange = (fieldName, value) => {
    const result = validateAndFormatJson(value, fieldName);
    updateSelected(fieldName, result.parsed || value);
    return result;
  };

  // Enhanced API test function
  const testApiConfiguration = async (node) => {
    if (!node.data.apiUrl) {
      alert('Please configure API URL first');
      return;
    }

    // Validate JSON fields before testing
    const headersValidation = validateAndFormatJson(
      typeof node.data.apiHeaders === 'string' ? node.data.apiHeaders : JSON.stringify(node.data.apiHeaders || {}, null, 2),
      'apiHeaders'
    );
    
    const bodyValidation = validateAndFormatJson(
      typeof node.data.apiBody === 'string' ? node.data.apiBody : JSON.stringify(node.data.apiBody || {}, null, 2),
      'apiBody'
    );
    
    const mappingValidation = validateAndFormatJson(
      typeof node.data.apiResponseMapping === 'string' ? node.data.apiResponseMapping : JSON.stringify(node.data.apiResponseMapping || {}, null, 2),
      'apiResponseMapping'
    );

    if (!headersValidation.isValid || !bodyValidation.isValid || !mappingValidation.isValid) {
      alert('Please fix JSON formatting errors before testing');
      return;
    }

    try {
      setTestingApi(true);
      setApiTestResult(null);
      
      const testData = {
        url: node.data.apiUrl,
        method: node.data.apiMethod || 'GET',
        headers: headersValidation.parsed || {},
        body: bodyValidation.parsed || {},
        response_mapping: mappingValidation.parsed || {}
      };

      const response = await API.post('/test-api/', testData);
      
      if (response.data.success) {
        setApiTestResult({
          success: true,
          status: response.data.status_code,
          data: response.data.response_data,
          extracted: response.data.extracted_data,
          message: 'API test successful!'
        });
        setExpandedSections(prev => ({ ...prev, testResults: true }));
      } else {
        setApiTestResult({
          success: false,
          error: response.data.error || 'Unknown error occurred',
          message: 'API test failed!'
        });
      }
    } catch (error) {
      console.error('🔴 API test error:', error);
      
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = error.response.data.error || error.response.data.detail || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Check if backend is running.';
      }
      
      setApiTestResult({
        success: false,
        error: errorMessage,
        message: 'API test failed!'
      });
    } finally {
      setTestingApi(false);
    }
  };

  // Common header templates
  const commonHeaders = [
    { name: 'Content-Type: application/json', value: { 'Content-Type': 'application/json' } },
    { name: 'Authorization: Bearer Token', value: { 'Authorization': 'Bearer your_token_here' } },
    { name: 'API Key', value: { 'X-API-Key': 'your_api_key_here' } },
    { name: 'Custom Headers', value: { 'Custom-Header': 'value' } }
  ];

  const applyHeaderTemplate = (template) => {
    const currentHeaders = typeof selected.data.apiHeaders === 'string' 
      ? selected.data.apiHeaders 
      : JSON.stringify(selected.data.apiHeaders || {}, null, 2);
    
    let newHeaders;
    if (currentHeaders.trim() === '' || currentHeaders === '{}') {
      newHeaders = JSON.stringify(template.value, null, 2);
    } else {
      try {
        const parsed = JSON.parse(currentHeaders);
        newHeaders = JSON.stringify({ ...parsed, ...template.value }, null, 2);
      } catch {
        newHeaders = currentHeaders;
      }
    }
    
    updateSelected('apiHeaders', newHeaders);
    validateAndFormatJson(newHeaders, 'apiHeaders');
  };

  // Common variables for dynamic content
  const commonVariables = [
    'user_input', 'user_id', 'session_id', 'timestamp', 'user_name', 'user_email', 'flow_data'
  ];

  const insertVariable = (variable, field) => {
    const currentValue = selected.data[field] || '';
    const newValue = currentValue + ` {{${variable}}}`;
    updateSelected(field, newValue);
  };

  // Quick method templates
  const methodTemplates = {
    'GET': {
      headers: { 'Content-Type': 'application/json' },
      body: {}
    },
    'POST': {
      headers: { 'Content-Type': 'application/json' },
      body: { 'data': '{{user_input}}' }
    },
    'PUT': {
      headers: { 'Content-Type': 'application/json' },
      body: { 'id': '{{user_id}}', 'data': '{{user_input}}' }
    }
  };

  const applyMethodTemplate = (method) => {
    updateSelected('apiMethod', method);
    if (methodTemplates[method]) {
      updateSelected('apiHeaders', JSON.stringify(methodTemplates[method].headers, null, 2));
      updateSelected('apiBody', JSON.stringify(methodTemplates[method].body, null, 2));
    }
  };

  // Validation functions
  const validateFieldValue = (field, value) => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return { isValid: false, message: 'This field is required' };
    }

    if (!value || value.toString().trim() === '') {
      return { isValid: true };
    }

    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { isValid: false, message: 'Please enter a valid email address' };
        }
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanedValue = value.replace(/[^\d+]/g, '');
        if (!phoneRegex.test(cleanedValue)) {
          return { isValid: false, message: 'Please enter a valid phone number' };
        }
        if (field.validation?.international && !value.startsWith('+')) {
          return { isValid: false, message: 'International numbers must start with +' };
        }
        break;

      case 'number':
        const numValue = parseFloat(value);
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
        const strValue = value.toString();
        if (field.validation?.minLength && strValue.length < field.validation.minLengthValue) {
          return { isValid: false, message: `Minimum length is ${field.validation.minLengthValue} characters` };
        }
        if (field.validation?.maxLength && strValue.length > field.validation.maxLengthValue) {
          return { isValid: false, message: `Maximum length is ${field.validation.maxLengthValue} characters` };
        }
        if (field.validation?.pattern && field.validation.patternValue) {
          const regex = new RegExp(field.validation.patternValue);
          if (!regex.test(strValue)) {
            return { isValid: false, message: 'Input does not match required format' };
          }
        }
        break;

      case 'date':
        const dateValue = new Date(value);
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
    }

    return { isValid: true };
  };

  // Test validation for a specific field
  const testFieldValidation = (field) => {
    const testValues = {
      'text': 'Test input',
      'email': 'test@example.com',
      'phone': '+1234567890',
      'number': '42',
      'date': '2024-01-01'
    };

    const testValue = testValues[field.type] || 'test';
    const result = validateFieldValue(field, testValue);
    
    if (result.isValid) {
      alert(`✅ Validation passed for ${field.type} field`);
    } else {
      alert(`❌ Validation failed: ${result.message}`);
    }
  };

  // Form field management functions
  const addFormField = () => {
    const newField = {
      id: Date.now().toString(),
      label: '',
      attributeName: '',
      type: 'text',
      required: false,
      placeholder: '',
      validation: {}
    };
    const currentFields = selected.data.formFields || [];
    updateSelected('formFields', [...currentFields, newField]);
  };

  const updateFormField = (fieldId, key, value) => {
    const updatedFields = selected.data.formFields?.map(field => 
      field.id === fieldId ? { ...field, [key]: value } : field
    ) || [];
    updateSelected('formFields', updatedFields);
  };

  const removeFormField = (fieldId) => {
    const updatedFields = selected.data.formFields?.filter(field => field.id !== fieldId) || [];
    updateSelected('formFields', updatedFields);
  };

  const updateValidation = (fieldId, validationKey, value) => {
    const updatedFields = selected.data.formFields?.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          validation: {
            ...field.validation,
            [validationKey]: value
          }
        };
      }
      return field;
    }) || [];
    updateSelected('formFields', updatedFields);
  };

  const generateAttributeName = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '_');
  };

  const renderValidationOptions = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <div className={styles.validationOptions}>
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.minLength || false}
                onChange={(e) => updateValidation(field.id, 'minLength', e.target.checked ? 1 : undefined)}
              />
              Minimum Length
            </label>
            {field.validation?.minLength && (
              <input
                type="number"
                value={field.validation.minLengthValue || 1}
                onChange={(e) => updateValidation(field.id, 'minLengthValue', parseInt(e.target.value))}
                className={styles.validationInput}
                min="1"
              />
            )}
            
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.maxLength || false}
                onChange={(e) => updateValidation(field.id, 'maxLength', e.target.checked ? 100 : undefined)}
              />
              Maximum Length
            </label>
            {field.validation?.maxLength && (
              <input
                type="number"
                value={field.validation.maxLengthValue || 100}
                onChange={(e) => updateValidation(field.id, 'maxLengthValue', parseInt(e.target.value))}
                className={styles.validationInput}
                min="1"
              />
            )}
            
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.pattern || false}
                onChange={(e) => updateValidation(field.id, 'pattern', e.target.checked)}
              />
              Custom Pattern (Regex)
            </label>
            {field.validation?.pattern && (
              <input
                type="text"
                value={field.validation.patternValue || ''}
                onChange={(e) => updateValidation(field.id, 'patternValue', e.target.value)}
                className={styles.validationInput}
                placeholder="e.g., ^[A-Za-z]+$"
              />
            )}

            <button
              type="button"
              onClick={() => testFieldValidation(field)}
              className={styles.testValidationButton}
            >
              Test Validation
            </button>
          </div>
        );

      case 'email':
        return (
          <div className={styles.validationOptions}>
            <div className={styles.helpText}>Email format will be automatically validated</div>
            <button
              type="button"
              onClick={() => testFieldValidation(field)}
              className={styles.testValidationButton}
            >
              Test Email Validation
            </button>
          </div>
        );

      case 'phone':
        return (
          <div className={styles.validationOptions}>
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.international || false}
                onChange={(e) => updateValidation(field.id, 'international', e.target.checked)}
              />
              Require international format (start with +)
            </label>
            <button
              type="button"
              onClick={() => testFieldValidation(field)}
              className={styles.testValidationButton}
            >
              Test Phone Validation
            </button>
          </div>
        );

      case 'number':
        return (
          <div className={styles.validationOptions}>
            <label className={styles.subLabel}>
              Minimum Value
              <input
                type="number"
                value={field.validation?.minValue || ''}
                onChange={(e) => updateValidation(field.id, 'minValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={styles.validationInput}
              />
            </label>
            
            <label className={styles.subLabel}>
              Maximum Value
              <input
                type="number"
                value={field.validation?.maxValue || ''}
                onChange={(e) => updateValidation(field.id, 'maxValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={styles.validationInput}
              />
            </label>
            
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.integerOnly || false}
                onChange={(e) => updateValidation(field.id, 'integerOnly', e.target.checked)}
              />
              Integer only (no decimals)
            </label>
            <button
              type="button"
              onClick={() => testFieldValidation(field)}
              className={styles.testValidationButton}
            >
              Test Number Validation
            </button>
          </div>
        );

      case 'date':
        return (
          <div className={styles.validationOptions}>
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.beforeToday || false}
                onChange={(e) => updateValidation(field.id, 'beforeToday', e.target.checked)}
              />
              Must be before today
            </label>
            
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.afterToday || false}
                onChange={(e) => updateValidation(field.id, 'afterToday', e.target.checked)}
              />
              Must be after today
            </label>
            
            <label className={styles.subLabel}>
              Minimum Date
              <input
                type="date"
                value={field.validation?.minDate || ''}
                onChange={(e) => updateValidation(field.id, 'minDate', e.target.value)}
                className={styles.validationInput}
              />
            </label>
            
            <label className={styles.subLabel}>
              Maximum Date
              <input
                type="date"
                value={field.validation?.maxDate || ''}
                onChange={(e) => updateValidation(field.id, 'maxDate', e.target.value)}
                className={styles.validationInput}
              />
            </label>
            <button
              type="button"
              onClick={() => testFieldValidation(field)}
              className={styles.testValidationButton}
            >
              Test Date Validation
            </button>
          </div>
        );

      case 'location':
        return (
          <div className={styles.validationOptions}>
            <label className={styles.subLabel}>
              <input
                type="checkbox"
                checked={field.validation?.requireCoordinates || false}
                onChange={(e) => updateValidation(field.id, 'requireCoordinates', e.target.checked)}
              />
              Require exact coordinates
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  const getAvailableAttributes = () => {
    return selected.data.formFields?.map(field => ({
      name: field.attributeName,
      label: field.label
    })) || [];
  };

  const insertAttribute = (attributeName) => {
    const currentContent = selected.data.content || '';
    const newContent = currentContent + ` {{${attributeName}}}`;
    updateSelected('content', newContent);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Edit Node Properties</h3>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label className={styles.label}>Label</label>
          <input 
            value={selected.data.label} 
            onChange={(e) => updateSelected('label', e.target.value)} 
            className={styles.input} 
          />
          
          <label className={styles.label}>Content</label>
          <div className={styles.contentSection}>
            <ReactQuill 
              theme="snow" 
              value={selected.data.content} 
              onChange={(v) => updateSelected('content', v)} 
              className={styles.quillEditor} 
            />
            
            {selected.data.formFields && selected.data.formFields.length > 0 && (
              <div className={styles.availableAttributes}>
                <label className={styles.subLabel}>Available Attributes:</label>
                <div className={styles.attributeButtons}>
                  {getAvailableAttributes().map((attr, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => insertAttribute(attr.name)}
                      className={styles.attributeButton}
                      title={`Insert {{${attr.name}}} - ${attr.label}`}
                    >
                      {attr.name}
                    </button>
                  ))}
                </div>
                <div className={styles.helpText}>
                  Click on attribute names to insert them into content. They will be replaced with actual values in the flow.
                </div>
              </div>
            )}
          </div>

          {/* Google Sheet Integration*/}
          {selected._ntype === 'google_sheet' && (
            <>
              <label className={styles.label}>Google Sheet Configuration</label>
              
              <label className={styles.subLabel}>Google Sheet URL</label>
              <input
                type="url"
                value={selected.data.googleSheetUrl || ''}
                onChange={(e) => updateSelected('googleSheetUrl', e.target.value)}
                className={styles.input}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              
              <label className={styles.subLabel}>Sheet Name</label>
              <input
                type="text"
                value={selected.data.googleSheetName || ''}
                onChange={(e) => updateSelected('googleSheetName', e.target.value)}
                className={styles.input}
                placeholder="Sheet1"
              />

              {/* Form Builder Section */}
              <label className={styles.label}>Form Fields Configuration</label>
              <div className={styles.formFieldsContainer}>
                {selected.data.formFields?.map((field, index) => (
                  <div key={field.id} className={styles.formField}>
                    <div className={styles.fieldHeader}>
                      <h4 className={styles.fieldTitle}>Field {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeFormField(field.id)}
                        className={styles.removeFieldButton}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.subLabel}>Field Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            updateFormField(field.id, 'label', newLabel);
                            if (!field.attributeName) {
                              updateFormField(field.id, 'attributeName', generateAttributeName(newLabel));
                            }
                          }}
                          className={styles.input}
                          placeholder="Enter field label"
                        />
                      </div>
                      
                      <div className={styles.fieldGroup}>
                        <label className={styles.subLabel}>Attribute Name</label>
                        <input
                          type="text"
                          value={field.attributeName}
                          onChange={(e) => updateFormField(field.id, 'attributeName', e.target.value)}
                          className={styles.input}
                          placeholder="attribute_name"
                        />
                        <div className={styles.helpText}>
                          Use in content as: <code>{`{{${field.attributeName}}}`}</code>
                        </div>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.subLabel}>Field Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateFormField(field.id, 'type', e.target.value)}
                          className={styles.input}
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone Number</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="location">Location</option>
                          <option value="textarea">Text Area</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="radio">Radio Buttons</option>
                        </select>
                      </div>
                      
                      <div className={styles.fieldGroup}>
                        <label className={styles.subLabel}>Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateFormField(field.id, 'placeholder', e.target.value)}
                          className={styles.input}
                          placeholder="Placeholder text"
                        />
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.subLabel}>
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={(e) => updateFormField(field.id, 'required', e.target.checked)}
                          />
                          Required Field
                        </label>
                      </div>
                    </div>

                    {/* Options for select, radio, checkbox */}
                    {(field.type === 'select' || field.type === 'radio') && (
                      <div className={styles.fieldGroup}>
                        <label className={styles.subLabel}>Options</label>
                        <div className={styles.optionsInputContainer}>
                          {field.options?.map((option, optIndex) => (
                            <div key={optIndex} className={styles.optionInputRow}>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  updateFormField(field.id, 'options', newOptions);
                                }}
                                className={styles.optionInput}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = field.options?.filter((_, i) => i !== optIndex) || [];
                                  updateFormField(field.id, 'options', newOptions);
                                }}
                                className={styles.removeOptionButton}
                                title="Remove option"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const currentOptions = field.options || [];
                              updateFormField(field.id, 'options', [...currentOptions, '']);
                            }}
                            className={styles.addOptionButton}
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className={styles.helpText}>
                          Each option will appear as a separate choice in the {field.type === 'select' ? 'dropdown' : 'radio group'}
                        </div>
                      </div>
                    )}

                    {/* Validation Options */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.subLabel}>Validation Rules</label>
                      {renderValidationOptions(field)}
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addFormField}
                  className={styles.addFieldButton}
                >
                  + Add Form Field
                </button>
              </div>

              {/* Form Preview */}
              {selected.data.formFields && selected.data.formFields.length > 0 && (
                <div className={styles.formPreview}>
                  <label className={styles.label}>Form Preview</label>
                  <div className={styles.previewContainer}>
                    {selected.data.formFields.map((field, index) => (
                      <div key={field.id} className={styles.previewField}>
                        <label className={styles.previewLabel}>
                          {field.label || `Field ${index + 1}`}
                          {field.required && <span style={{color: 'red'}}> *</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input
                            type="text"
                            placeholder={field.placeholder || ''}
                            className={styles.previewInput}
                            disabled
                          />
                        )}
                        
                        {field.type === 'email' && (
                          <input
                            type="email"
                            placeholder={field.placeholder || 'example@email.com'}
                            className={styles.previewInput}
                            disabled
                          />
                        )}
                        
                        {field.type === 'phone' && (
                          <input
                            type="tel"
                            placeholder={field.placeholder || '+1 (555) 123-4567'}
                            className={styles.previewInput}
                            disabled
                          />
                        )}
                        
                        {field.type === 'number' && (
                          <input
                            type="number"
                            placeholder={field.placeholder || '123'}
                            className={styles.previewInput}
                            disabled
                          />
                        )}
                        
                        {field.type === 'date' && (
                          <input
                            type="date"
                            className={styles.previewInput}
                            disabled
                          />
                        )}
                        
                        {field.type === 'location' && (
                          <input
                            type="text"
                            placeholder={field.placeholder || 'Enter location'}
                            className={styles.previewInput}
                            disabled
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <textarea
                            placeholder={field.placeholder || ''}
                            className={styles.previewTextarea}
                            rows={3}
                            disabled
                          />
                        )}
                        
                        {field.type === 'select' && (
                          <select className={styles.previewInput} disabled>
                            <option value="">Select an option</option>
                            {field.options?.map((option, optIndex) => (
                              <option key={optIndex} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        
                        {field.type === 'checkbox' && (
                          <label className={styles.previewCheckbox}>
                            <input type="checkbox" disabled />
                            {field.placeholder || 'Check this option'}
                          </label>
                        )}
                        
                        {field.type === 'radio' && field.options?.map((option, optIndex) => (
                          <label key={optIndex} className={styles.previewRadio}>
                            <input type="radio" name={`preview-${field.id}`} disabled />
                            {option}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.helpText}>
                <strong>How it works:</strong> 
                <ul>
                  <li>Configure form fields that users will fill out</li>
                  <li>Each field has an attribute name that can be used in content as <code>{`{{attribute_name}}`}</code></li>
                  <li>When a user submits the form, data will be sent to your Google Sheet</li>
                  <li>Validation rules will be enforced when users input data in the chatbot</li>
                  <li>Use "Test Validation" buttons to verify your validation rules</li>
                </ul>
              </div>
            </>
          )}

          {/* Message with Options Section */}
          {selected._ntype === 'message_with_options' && (
            <>
              <label className={styles.label}>Options</label>
              <div className={styles.optionsContainer}>
                {selected.data.options && selected.data.options.map((option, index) => (
                  <div key={index} className={styles.optionItem}>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...selected.data.options];
                        newOptions[index] = e.target.value;
                        updateSelected('options', newOptions);
                      }}
                      className={styles.optionInput}
                      placeholder={`Option ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = selected.data.options.filter((_, i) => i !== index);
                        updateSelected('options', newOptions);
                      }}
                      className={styles.removeOptionButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = [...(selected.data.options || []), ''];
                    updateSelected('options', newOptions);
                  }}
                  className={styles.addOptionButton}
                >
                  + Add Option
                </button>
              </div>

              <label className={styles.label} style={{ marginTop: '10px' }}>Display Style</label>
              <select
                value={selected.data.optionsDisplayStyle || 'dropdown'}
                onChange={(e) => updateSelected('optionsDisplayStyle', e.target.value)}
                className={styles.input}
              >
                <option value="dropdown">Dropdown</option>
                <option value="horizontal-buttons">Horizontal Buttons</option>
                <option value="vertical-buttons">Vertical Buttons</option>
              </select>

              {/* Preview  options */}
              {selected.data.options && selected.data.options.filter(opt => opt.trim() !== '').length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <label className={styles.label}>Preview:</label>
                  {selected.data.optionsDisplayStyle === 'dropdown' && (
                    <select disabled style={{ padding: '5px', fontSize: '14px' }}>
                      {selected.data.options.filter(opt => opt.trim() !== '').map((option, index) => (
                        <option key={index}>{option}</option>
                      ))}
                    </select>
                  )}
                  {(selected.data.optionsDisplayStyle === 'horizontal-buttons' || selected.data.optionsDisplayStyle === 'vertical-buttons') && (
                    <div style={{
                      display: 'flex',
                      flexDirection: selected.data.optionsDisplayStyle === 'horizontal-buttons' ? 'row' : 'column',
                      gap: '5px',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px'
                    }}>
                      {selected.data.options.filter(opt => opt.trim() !== '').map((option, index) => (
                        <button
                          key={index}
                          style={{
                            padding: '5px 10px',
                            border: '1px solid #007bff',
                            borderRadius: '15px',
                            background: '#f8f9fa',
                            color: '#007bff',
                            fontSize: '12px',
                            cursor: 'default'
                          }}
                          disabled
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Trigger Path Section */}
          {selected._ntype === 'trigger_path' && (
            <>
              <label className={styles.label}>Select Path to Trigger</label>
              <select
                value={selected.data.triggeredPath?.id || ''}
                onChange={(e) => {
                  const pathId = e.target.value;
                  if (activePath && pathId == activePath.id) {
                    alert("Cannot trigger the same path (circular reference).");
                    return;
                  }
                  const path = paths.find(p => p.id == pathId);
                  updateSelected('triggeredPath', path || null);
                  const newLabel = path ? `Trigger: ${path.name}` : 'Trigger: None';
                  updateSelected('label', newLabel);
                }}
                className={styles.input}
              >
                <option value="">Select a path...</option>
                {paths
                  .filter(p => !activePath || p.id !== activePath.id)
                  .map(path => (
                    <option key={path.id} value={path.id}>{path.name}</option>
                  ))
                }
              </select>
            </>
          )}

          {/* Email Configuration Section */}
          {selected._ntype === 'send_email' && (
            <div className={styles.emailSection}>
              <h4>Email Configuration</h4>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Sender Name</label>
                <input
                  type="text"
                  value={selected.data.emailSenderName || ''}
                  onChange={(e) => updateSelected('emailSenderName', e.target.value)}
                  placeholder="Company Name"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sender Email *</label>
                <input
                  type="email"
                  value={selected.data.emailSenderEmail || ''}
                  onChange={(e) => updateSelected('emailSenderEmail', e.target.value)}
                  placeholder="noreply@company.com"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Recipients *</label>
                <input
                  type="text"
                  value={selected.data.emailRecipients || ''}
                  onChange={(e) => updateSelected('emailRecipients', e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className={styles.input}
                  required
                />
                <div className={styles.helpText}>Separate multiple emails with commas</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Subject *</label>
                <input
                  type="text"
                  value={selected.data.emailSubject || ''}
                  onChange={(e) => updateSelected('emailSubject', e.target.value)}
                  placeholder="Email Subject Line"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Body Type</label>
                <select
                  value={selected.data.emailBodyType || 'custom'}
                  onChange={(e) => updateSelected('emailBodyType', e.target.value)}
                  className={styles.input}
                >
                  <option value="custom">Custom Message</option>
                  <option value="form_data">Use Form Data</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Body *</label>
                <textarea
                  value={selected.data.emailBody || ''}
                  onChange={(e) => updateSelected('emailBody', e.target.value)}
                  placeholder="Enter your email content here. Use {{field_name}} for dynamic data."
                  rows={6}
                  className={styles.textarea}
                  required
                />
                <div className={styles.helpText}>
                  Use placeholders like &#123;&#123;user_input&#125;&#125;, &#123;&#123;session_id&#125;&#125;, 
                  &#123;&#123;timestamp&#125;&#125; for dynamic content
                </div>
              </div>

              {/* Test Email Button */}
              <div className={styles.formGroup}>
                <button
                  type="button"
                  className={styles.testEmailButton}
                  onClick={testEmailConfiguration}
                  disabled={!selected.data.emailSenderEmail || !selected.data.emailRecipients || testingEmail}
                >
                  {testingEmail ? 'Testing...' : 'Test Email Configuration'}
                </button>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          {(selected._ntype === 'image' || selected._ntype === 'file_upload') && (
            <>
              <label className={styles.label}>Upload File</label>
              <input type="file" onChange={handleFileChange} className={styles.input} />
              {selected.data.fileContent && (
                <div style={{ marginTop: 5 }}>
                  {selected._ntype === 'image' ? (
                    <img
                      src={selected.data.fileContent}
                      alt={selected.data.fileName}
                      style={{ width: selected.data.width || 200, height: selected.data.height || 150, objectFit: 'cover' }}
                    />
                  ) : (
                    <a href={selected.data.fileContent} target="_blank" rel="noopener noreferrer">{selected.data.fileName}</a>
                  )}
                </div>
              )}
            </>
          )}

          {/* Enhanced API Configuration Section */}
          {selected._ntype === 'api_call' && (
            <div className={styles.apiSection}>
              <h4>API Configuration</h4>
              
              {/* Quick Setup Section */}
              <div className={styles.quickSetup}>
                <h5>Quick Setup</h5>
                <div className={styles.methodTemplates}>
                  <label className={styles.subLabel}>Method Templates:</label>
                  <div className={styles.templateButtons}>
                    {['GET', 'POST', 'PUT'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => applyMethodTemplate(method)}
                        className={`${styles.templateButton} ${
                          selected.data.apiMethod === method ? styles.active : ''
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>API URL *</label>
                <input
                  type="url"
                  value={selected.data.apiUrl || ''}
                  onChange={(e) => updateSelected('apiUrl', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>HTTP Method</label>
                <select
                  value={selected.data.apiMethod || 'GET'}
                  onChange={(e) => updateSelected('apiMethod', e.target.value)}
                  className={styles.input}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              {/* Headers Section with Templates */}
              <div className={styles.collapsibleSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('headers')}>
                  <h5>Headers Configuration</h5>
                  <span className={styles.expandIcon}>
                    {expandedSections.headers ? '▲' : '▼'}
                  </span>
                </div>
                {expandedSections.headers && (
                  <div className={styles.sectionContent}>
                    <div className={styles.headerTemplates}>
                      <label className={styles.subLabel}>Common Headers:</label>
                      <div className={styles.templateButtons}>
                        {commonHeaders.map((template, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => applyHeaderTemplate(template)}
                            className={styles.templateButton}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <textarea
                      value={typeof selected.data.apiHeaders === 'string' 
                        ? selected.data.apiHeaders 
                        : JSON.stringify(selected.data.apiHeaders || {}, null, 2)}
                      onChange={(e) => handleJsonChange('apiHeaders', e.target.value)}
                      placeholder={'{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer {{token}}"\n}'}
                      rows={6}
                      className={`${styles.textarea} ${jsonErrors.apiHeaders ? styles.error : ''}`}
                    />
                    {jsonErrors.apiHeaders && (
                      <div className={styles.errorText}>❌ {jsonErrors.apiHeaders}</div>
                    )}
                    <div className={styles.helpText}>
                      Enter headers as JSON object. Use &#123;&#123;variable&#125;&#125; for dynamic values.
                    </div>
                  </div>
                )}
              </div>

              {/* Request Body Section */}
              <div className={styles.collapsibleSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('body')}>
                  <h5>Request Body</h5>
                  <span className={styles.expandIcon}>
                    {expandedSections.body ? '▲' : '▼'}
                  </span>
                </div>
                {expandedSections.body && (
                  <div className={styles.sectionContent}>
                    <div className={styles.variableSuggestions}>
                      <label className={styles.subLabel}>Available Variables:</label>
                      <div className={styles.variableButtons}>
                        {commonVariables.map(variable => (
                          <button
                            key={variable}
                            type="button"
                            onClick={() => insertVariable(variable, 'apiBody')}
                            className={styles.variableButton}
                          >
                            {`{{${variable}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <textarea
                      value={typeof selected.data.apiBody === 'string' 
                        ? selected.data.apiBody 
                        : JSON.stringify(selected.data.apiBody || {}, null, 2)}
                      onChange={(e) => handleJsonChange('apiBody', e.target.value)}
                      placeholder={'{\n  "user_id": "{{user_id}}",\n  "message": "{{user_input}}"\n}'}
                      rows={8}
                      className={`${styles.textarea} ${jsonErrors.apiBody ? styles.error : ''}`}
                    />
                    {jsonErrors.apiBody && (
                      <div className={styles.errorText}>❌ {jsonErrors.apiBody}</div>
                    )}
                    <div className={styles.helpText}>
                      Enter request body as JSON. Use &#123;&#123;variable&#125;&#125; placeholders for dynamic data.
                    </div>
                  </div>
                )}
              </div>

              {/* Response Mapping Section */}
              <div className={styles.collapsibleSection}>
                <div className={styles.sectionHeader} onClick={() => toggleSection('mapping')}>
                  <h5>Response Mapping</h5>
                  <span className={styles.expandIcon}>
                    {expandedSections.mapping ? '▲' : '▼'}
                  </span>
                </div>
                {expandedSections.mapping && (
                  <div className={styles.sectionContent}>
                    <textarea
                      value={typeof selected.data.apiResponseMapping === 'string' 
                        ? selected.data.apiResponseMapping 
                        : JSON.stringify(selected.data.apiResponseMapping || {}, null, 2)}
                      onChange={(e) => handleJsonChange('apiResponseMapping', e.target.value)}
                      placeholder={'{\n  "user_name": "data.user.name",\n  "status": "status"\n}'}
                      rows={6}
                      className={`${styles.textarea} ${jsonErrors.apiResponseMapping ? styles.error : ''}`}
                    />
                    {jsonErrors.apiResponseMapping && (
                      <div className={styles.errorText}>❌ {jsonErrors.apiResponseMapping}</div>
                    )}
                    <div className={styles.helpText}>
                      Map API response fields to variables. Use dot notation for nested objects.
                      Access mapped data in content as &#123;&#123;api.user_name&#125;&#125;
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Success Message</label>
                <div className={styles.variableSuggestions}>
                  <label className={styles.subLabel}>API Variables:</label>
                  <div className={styles.variableButtons}>
                    {commonVariables.map(variable => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(`api.${variable}`, 'content')}
                        className={styles.variableButton}
                      >
                        {`{{api.${variable}}}`}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={selected.data.content || ''}
                  onChange={(e) => updateSelected('content', e.target.value)}
                  placeholder={`API call successful! Retrieved user: {{api.user_name}}`}
                  rows={3}
                  className={styles.textarea}
                />
                <div className={styles.helpText}>
                  Message to show after successful API call. Use &#123;&#123;api.variable_name&#125;&#125; for mapped data.
                </div>
              </div>

              {/* Test API Button */}
              <div className={styles.formGroup}>
                <button
                  type="button"
                  className={styles.testApiButton}
                  onClick={() => testApiConfiguration(selected)}
                  disabled={!selected.data.apiUrl || testingApi}
                >
                  {testingApi ? 'Testing API...' : 'Test API Configuration'}
                </button>
                <div className={styles.helpText}>
                  Test your API configuration with current settings
                </div>
              </div>

              {/* API Test Results */}
              {apiTestResult && (
                <div className={styles.collapsibleSection}>
                  <div className={styles.sectionHeader} onClick={() => toggleSection('testResults')}>
                    <h5>API Test Results</h5>
                    <span className={styles.expandIcon}>
                      {expandedSections.testResults ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedSections.testResults && (
                    <div className={styles.sectionContent}>
                      <div className={`${styles.resultBox} ${apiTestResult.success ? styles.success : styles.error}`}>
                        <strong>{apiTestResult.message}</strong>
                        {apiTestResult.success ? (
                          <div className={styles.resultDetails}>
                            <div><strong>Status Code:</strong> {apiTestResult.status}</div>
                            {apiTestResult.extracted && Object.keys(apiTestResult.extracted).length > 0 && (
                              <div>
                                <strong>Extracted Data:</strong>
                                <pre className={styles.resultPre}>
                                  {JSON.stringify(apiTestResult.extracted, null, 2)}
                                </pre>
                              </div>
                            )}
                            {apiTestResult.data && (
                              <div>
                                <strong>Full Response:</strong>
                                <pre className={styles.resultPre}>
                                  {JSON.stringify(apiTestResult.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.resultDetails}>
                            <div><strong>Error:</strong> {apiTestResult.error}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.actionButtons}>
            <button onClick={onSave} className={`${styles.actionButton} ${styles.saveBtn}`}>Save</button>
            <button onClick={onCancel} className={`${styles.actionButton} ${styles.cancelBtn}`}>Cancel</button>
            <button
              onClick={() => {
                if (window.confirm(`Delete node "${selected.data.label}"?`)) onDelete(selected.id);
              }}
              className={`${styles.actionButton} ${styles.deleteBtn}`}
            >
              Delete
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditPropertiesModal;