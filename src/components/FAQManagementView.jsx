import React, { useState, useEffect } from 'react';
import { API } from '../api';
import styles from './Builder.module.css';

export default function FAQManagementView({ botId, paths }) {
  const [faqs, setFaqs] = useState([]);
  const [addFaqModalOpen, setAddFaqModalOpen] = useState(false);
  const [editFaqModalOpen, setEditFaqModalOpen] = useState(false);
  const [currentFaq, setCurrentFaq] = useState(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newResponseType, setNewResponseType] = useState('message');
  const [newResponseMessage, setNewResponseMessage] = useState('');
  const [newTriggerPath, setNewTriggerPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to get path name
  const getPathName = (pathId) => {
    if (!pathId) return 'No Path Selected';
    
    // Handle both string and number IDs
    const foundPath = paths.find(p => p.id === pathId || p.id === parseInt(pathId));
    return foundPath ? foundPath.name : 'Unknown Path';
  };

  // Filter FAQs based on search term
  const filteredFaqs = faqs.filter(faq => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const questions = faq.questions || [faq.question || ''];
    
    return questions.some(q => q.toLowerCase().includes(searchLower)) ||
           (faq.response_message && faq.response_message.toLowerCase().includes(searchLower)) ||
           (faq.response_type === 'trigger' && getPathName(faq.trigger_path_id).toLowerCase().includes(searchLower));
  });

  // Load FAQs
  const loadFaqs = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/chatbots/${botId}/manage-faqs/`);
      console.log('FAQs loaded:', response.data);
      setFaqs(response.data);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      alert('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  // Add FAQ
  const addFaq = async () => {
    const questions = newQuestion.split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (questions.length === 0) {
      alert('Please enter at least one question');
      return;
    }

    if (newResponseType === 'message' && !newResponseMessage.trim()) {
      alert('Please enter a response message');
      return;
    }

    if (newResponseType === 'trigger' && !newTriggerPath) {
      alert('Please select a path to trigger');
      return;
    }

    try {
      const faqData = {
        questions: questions,
        response_type: newResponseType,
        response_message: newResponseType === 'message' ? newResponseMessage.trim() : '',
        trigger_path_id: newResponseType === 'trigger' ? newTriggerPath : null
      };

      console.log('Adding FAQ with data:', faqData);

      await API.post(`/chatbots/${botId}/manage-faqs/`, faqData);
      await loadFaqs();
      setAddFaqModalOpen(false);
      resetFaqForm();
    } catch (error) {
      console.error('Error adding FAQ:', error);
      alert('Failed to add FAQ');
    }
  };

  // Edit FAQ
  const editFaq = async () => {
    if (!currentFaq) return;

    const questions = newQuestion.split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (questions.length === 0) {
      alert('Please enter at least one question');
      return;
    }

    if (newResponseType === 'message' && !newResponseMessage.trim()) {
      alert('Please enter a response message');
      return;
    }

    if (newResponseType === 'trigger' && !newTriggerPath) {
      alert('Please select a path to trigger');
      return;
    }

    try {
      const faqData = {
        questions: questions,
        response_type: newResponseType,
        response_message: newResponseType === 'message' ? newResponseMessage.trim() : '',
        trigger_path_id: newResponseType === 'trigger' ? newTriggerPath : null
      };

      console.log('Editing FAQ with data:', faqData);

      await API.put(`/chatbots/${botId}/manage-faqs/${currentFaq.id}/`, faqData);
      await loadFaqs();
      setEditFaqModalOpen(false);
      resetFaqForm();
    } catch (error) {
      console.error('Error editing FAQ:', error);
      alert('Failed to update FAQ');
    }
  };

  // Delete FAQ
  const deleteFaq = async (faqId) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await API.delete(`/chatbots/${botId}/manage-faqs/${faqId}/`);
        await loadFaqs();
      } catch (error) {
        console.error('Error deleting FAQ:', error);
        alert('Failed to delete FAQ');
      }
    }
  };

  // Open Add FAQ Modal
  const openAddFaqModal = () => {
    resetFaqForm();
    setAddFaqModalOpen(true);
  };

  // Open Edit FAQ Modal
  const openEditFaqModal = (faq) => {
    setCurrentFaq(faq);
    
    // Handle both single question (backward compatibility) and multiple questions
    if (faq.questions && faq.questions.length > 0) {
      setNewQuestion(faq.questions.join('\n'));
    } else {
      // Fallback for single question
      setNewQuestion(faq.question || '');
    }
    
    setNewResponseType(faq.response_type);
    setNewResponseMessage(faq.response_message || '');
    
    const triggerPathId = faq.trigger_path_id || faq.trigger_path?.id || '';
    setNewTriggerPath(triggerPathId);
    
    console.log('Editing FAQ:', faq);
    console.log('Setting trigger path to:', triggerPathId);
    
    setEditFaqModalOpen(true);
  };

  // Reset FAQ Form
  const resetFaqForm = () => {
    setNewQuestion('');
    setNewResponseType('message');
    setNewResponseMessage('');
    setNewTriggerPath('');
    setCurrentFaq(null);
  };

  // Load FAQs on component mount
  useEffect(() => {
    loadFaqs();
  }, [botId]);

  return (
    <>
      {/* FAQ Management View */}
      <div className={styles.faqManagementView}>
        <div className={styles.faqHeader}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h2>FAQ Management</h2>
              <p>Manage frequently asked questions and their responses</p>
            </div>
            <button 
              onClick={openAddFaqModal}
              className={styles.addFaqButton}
            >
              <span className={styles.plusIcon}>+</span>
              Add FAQ
            </button>
          </div>

          {/* Search Bar */}
          <div className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <span className={styles.searchIcon}>🔍</span>
            </div>
            <div className={styles.stats}>
              {filteredFaqs.length} of {faqs.length} FAQ(s)
            </div>
          </div>
        </div>

        {/* FAQ Table */}
        <div className={styles.faqTableContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading FAQs...</p>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>❓</div>
              <h3>No FAQs Found</h3>
              <p>
                {searchTerm ? 'No FAQs match your search. Try different keywords.' : 'No FAQs created yet. Click "Add FAQ" to create your first FAQ.'}
              </p>
              {!searchTerm && (
                <button 
                  onClick={openAddFaqModal}
                  className={styles.addFaqButton}
                >
                  + Add Your First FAQ
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.faqTable}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.questionsColumn}>Questions</th>
                    <th className={styles.responseColumn}>Response</th>
                    <th className={styles.typeColumn}>Type</th>
                    <th className={styles.actionsColumn}>Actions</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {filteredFaqs.map(faq => (
                    <tr key={faq.id} className={styles.tableRow}>
                      <td className={styles.questionsCell}>
                        <div className={styles.questionsContent}>
                          {faq.questions && faq.questions.length > 0 ? (
                            <div className={styles.questionsList}>
                              {faq.questions.slice(0, 2).map((question, index) => (
                                <div key={index} className={styles.questionItem}>
                                  {question}
                                </div>
                              ))}
                              {faq.questions.length > 2 && (
                                <div className={styles.moreQuestions}>
                                  +{faq.questions.length - 2} more questions
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={styles.singleQuestion}>
                              {faq.question || 'No questions'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={styles.responseCell}>
                        {faq.response_type === 'message' ? (
                          <div className={styles.messageResponse}>
                            <div className={styles.responseText}>
                              {faq.response_message || 'No message'}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.triggerResponse}>
                            <div className={styles.triggerIcon}>↗</div>
                            <div className={styles.triggerInfo}>
                              <div className={styles.triggerLabel}>Triggers Path</div>
                              <div className={styles.pathName}>
                                {getPathName(faq.trigger_path_id)}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className={styles.typeCell}>
                        <div className={styles.typeBadges}>
                          <span className={`${styles.typeBadge} ${
                            faq.response_type === 'message' ? styles.messageBadge : styles.triggerBadge
                          }`}>
                            {faq.response_type === 'message' ? 'Message' : 'Path'}
                          </span>
                          <span className={styles.countBadge}>
                            {faq.questions ? faq.questions.length : 1} Q
                          </span>
                        </div>
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtons}>
                          <button 
                            onClick={() => openEditFaqModal(faq)}
                            className={styles.editButton}
                            title="Edit FAQ"
                          >
                            <span className={styles.buttonIcon}>✏️</span>
                            <span className={styles.buttonText}>Edit</span>
                          </button>
                          <button 
                            onClick={() => deleteFaq(faq.id)}
                            className={styles.deleteButton}
                            title="Delete FAQ"
                          >
                            <span className={styles.buttonIcon}>🗑️</span>
                            <span className={styles.buttonText}>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add FAQ Modal */}
      {addFaqModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setAddFaqModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add New FAQ</h3>
              <button onClick={() => setAddFaqModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Questions (One per line)</label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className={styles.textarea}
                  placeholder="Enter questions, one per line. Example:
What are your opening hours?
When do you open?
What time do you close?"
                  rows={4}
                  autoFocus
                />
                <div className={styles.helperText}>
                  {newQuestion.split('\n').filter(q => q.trim()).length} question(s) added
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Response Type</label>
                <select
                  value={newResponseType}
                  onChange={(e) => setNewResponseType(e.target.value)}
                  className={styles.select}
                >
                  <option value="message">Send a Message</option>
                  <option value="trigger">Trigger a Path</option>
                </select>
              </div>

              {newResponseType === 'message' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Response Message</label>
                  <textarea
                    value={newResponseMessage}
                    onChange={(e) => setNewResponseMessage(e.target.value)}
                    className={styles.textarea}
                    placeholder="Enter the response message that will be sent when these questions are asked"
                    rows={3}
                  />
                </div>
              )}

              {newResponseType === 'trigger' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Path to Trigger</label>
                  <select
                    value={newTriggerPath}
                    onChange={(e) => setNewTriggerPath(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Select a path</option>
                    {paths.map(path => (
                      <option key={path.id} value={path.id}>
                        {path.name} 
                      </option>
                    ))}
                  </select>
                  {newTriggerPath && (
                    <div className={styles.selectedPath}>
                      Selected: <strong>{getPathName(newTriggerPath)}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button 
                  onClick={() => setAddFaqModalOpen(false)} 
                  className={`${styles.button} ${styles.cancelButton}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={addFaq}
                  disabled={!newQuestion.trim() || 
                    (newResponseType === 'message' && !newResponseMessage.trim()) ||
                    (newResponseType === 'trigger' && !newTriggerPath)}
                  className={`${styles.button} ${styles.saveButton}`}
                >
                  Add FAQ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit FAQ Modal */}
      {editFaqModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setEditFaqModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit FAQ</h3>
              <button onClick={() => setEditFaqModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Questions (One per line)</label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className={styles.textarea}
                  placeholder="Enter questions, one per line"
                  rows={4}
                  autoFocus
                />
                <div className={styles.helperText}>
                  {newQuestion.split('\n').filter(q => q.trim()).length} question(s) added
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Response Type</label>
                <select
                  value={newResponseType}
                  onChange={(e) => setNewResponseType(e.target.value)}
                  className={styles.select}
                >
                  <option value="message">Send a Message</option>
                  <option value="trigger">Trigger a Path</option>
                </select>
              </div>

              {newResponseType === 'message' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Response Message</label>
                  <textarea
                    value={newResponseMessage}
                    onChange={(e) => setNewResponseMessage(e.target.value)}
                    className={styles.textarea}
                    placeholder="Enter the response message"
                    rows={3}
                  />
                </div>
              )}

              {newResponseType === 'trigger' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Path to Trigger</label>
                  <select
                    value={newTriggerPath}
                    onChange={(e) => setNewTriggerPath(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Select a path</option>
                    {paths.map(path => (
                      <option key={path.id} value={path.id}>
                        {path.name} 
                      </option>
                    ))}
                  </select>
                  {newTriggerPath && (
                    <div className={styles.selectedPath}>
                      Selected: <strong>{getPathName(newTriggerPath)}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button 
                  onClick={() => setEditFaqModalOpen(false)} 
                  className={`${styles.button} ${styles.cancelButton}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={editFaq}
                  disabled={!newQuestion.trim() || 
                    (newResponseType === 'message' && !newResponseMessage.trim()) ||
                    (newResponseType === 'trigger' && !newTriggerPath)}
                  className={`${styles.button} ${styles.saveButton}`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}