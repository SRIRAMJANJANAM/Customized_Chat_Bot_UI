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
          <ReactQuill 
            theme="snow" 
            value={selected.data.content} 
            onChange={(v) => updateSelected('content', v)} 
            className={styles.quillEditor} 
          />

          {/* Google Sheet Integration Section */}
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
              
              <label className={styles.subLabel}>Headers (comma-separated)</label>
              <input
                type="text"
                value={selected.data.googleSheetHeaders || ''}
                onChange={(e) => updateSelected('googleSheetHeaders', e.target.value)}
                className={styles.input}
                placeholder="Name,Email,Phone,Message"
              />
              
              <label className={styles.subLabel}>Data Mapping (JSON format)</label>
              <textarea
                value={selected.data.googleSheetDataMapping || ''}
                onChange={(e) => updateSelected('googleSheetDataMapping', e.target.value)}
                className={styles.textarea}
                placeholder='{"name": "user_name", "email": "user_email"}'
                rows={4}
              />
              
              <div className={styles.helpText}>
                <strong>How it works:</strong> When a user types a response in this node, the data will be automatically sent to your Google Sheet. Make sure the Google Sheet is set to public or you have proper authentication.
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