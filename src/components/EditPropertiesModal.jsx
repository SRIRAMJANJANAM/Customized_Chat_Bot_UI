import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './Builder.module.css';

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
  if (!selected) return null;
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
            {field.validation?.pattern && (
              <input
                type="text"
                value={field.validation.patternValue || ''}
                onChange={(e) => updateValidation(field.id, 'patternValue', e.target.value)}
                className={styles.validationInput}
                placeholder="e.g., ^[A-Za-z]+$"
              />
            )}
          </div>
        );

      case 'email':
        return (
          <div className={styles.validationOptions}>
            <div className={styles.helpText}>Email format will be automatically validated</div>
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
              Accept international numbers
            </label>
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
            
            {/* Available Attributes */}
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
                  <li>Make sure the Google Sheet is set to public or you have proper authentication</li>
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

              {/* Preview of options */}
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