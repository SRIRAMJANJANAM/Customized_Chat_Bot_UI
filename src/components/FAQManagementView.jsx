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

  // Helper function to get path name
  const getPathName = (pathId) => {
    if (!pathId) return 'No Path Selected';
    
    // Handle both string and number IDs
    const foundPath = paths.find(p => p.id === pathId || p.id === parseInt(pathId));
    return foundPath ? foundPath.name : 'Unknown Path';
  };

  // Load FAQs
  const loadFaqs = async () => {
    try {
      const response = await API.get(`/chatbots/${botId}/manage-faqs/`);
      console.log('FAQs loaded:', response.data);
      setFaqs(response.data);
    } catch (error) {
      console.error('Error loading FAQs:', error);
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
          <h2>FAQ Management</h2>
          <p>Manage frequently asked questions and their responses</p>
          <button 
            onClick={openAddFaqModal}
            className={styles.addFaqButton}
          >
            + Add FAQ
          </button>
        </div>

        <div className={styles.faqList}>
          {faqs.length === 0 ? (
            <div className={styles.noFaqs}>
              <p>No FAQs created yet. Click "Add FAQ" to create your first FAQ.</p>
            </div>
          ) : (
            faqs.map(faq => (
              <div key={faq.id} className={styles.faqItem}>
                <div className={styles.faqContent}>
                  <div className={styles.faqQuestions}>
                    <strong>Questions:</strong>
                    {faq.questions && faq.questions.length > 0 ? (
                      <ul className={styles.questionList}>
                        {faq.questions.map((question, index) => (
                          <li key={index} className={styles.questionItem}>
                            {question}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      // Fallback for single question (backward compatibility)
                      <div className={styles.singleQuestion}>
                        Q: {faq.question || 'No questions'}
                      </div>
                    )}
                  </div>
                  <div className={styles.faqResponse}>
                    <strong>Response: </strong>
                    {faq.response_type === 'message' ? (
                      <span>{faq.response_message}</span>
                    ) : (
                      <span className={styles.triggerResponse}>
                        Triggers Path: {getPathName(faq.trigger_path_id)}
                      </span>
                    )}
                  </div>
                  <div className={styles.faqType}>
                    <span className={`${styles.typeBadge} ${
                      faq.response_type === 'message' ? styles.messageBadge : styles.triggerBadge
                    }`}>
                      {faq.response_type === 'message' ? 'Message' : 'Trigger Path'}
                    </span>
                    <span className={styles.questionCountBadge}>
                      {faq.questions ? faq.questions.length : 1} question(s)
                    </span>
                  </div>
                </div>
                <div className={styles.faqActions}>
                  <button 
                    onClick={() => openEditFaqModal(faq)}
                    className={styles.editButton}
                    title="Edit FAQ"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteFaq(faq.id)}
                    className={styles.deleteButton}
                    title="Delete FAQ"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add FAQ Modal */}
      {addFaqModalOpen && (
        <div className={styles.overlay} onClick={() => setAddFaqModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add FAQ</h3>
              <button onClick={() => setAddFaqModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.modalContent}>
              <label className={styles.label}>Questions (One per line)</label>
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className={styles.textarea}
                placeholder="Enter questions, one per line"
                rows={4}
                autoFocus
              />
              <div className={styles.questionCount}>
                {newQuestion.split('\n').filter(q => q.trim()).length} question(s) added
              </div>
              
              <label className={styles.label}>Response Type</label>
              <select
                value={newResponseType}
                onChange={(e) => setNewResponseType(e.target.value)}
                className={styles.input}
              >
                <option value="message">Message</option>
                <option value="trigger">Trigger Path</option>
              </select>

              {newResponseType === 'message' && (
                <>
                  <label className={styles.label}>Response Message</label>
                  <textarea
                    value={newResponseMessage}
                    onChange={(e) => setNewResponseMessage(e.target.value)}
                    className={styles.textarea}
                    placeholder="Enter the response message"
                    rows={3}
                  />
                </>
              )}

              {newResponseType === 'trigger' && (
                <>
                  <label className={styles.label}>Path to Trigger</label>
                  <select
                    value={newTriggerPath}
                    onChange={(e) => setNewTriggerPath(e.target.value)}
                    className={styles.input}
                  >
                    <option value="">Select a path</option>
                    {paths.map(path => (
                      <option key={path.id} value={path.id}>
                        {path.name} 
                      </option>
                    ))}
                  </select>
                  {newTriggerPath && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Selected: {getPathName(newTriggerPath)}
                    </div>
                  )}
                </>
              )}

              <div className={styles.actionButtons}>
                <button 
                  onClick={addFaq}
                  disabled={!newQuestion.trim() || 
                    (newResponseType === 'message' && !newResponseMessage.trim()) ||
                    (newResponseType === 'trigger' && !newTriggerPath)}
                  className={`${styles.actionButton} ${styles.saveBtn}`}
                >
                  Add FAQ
                </button>
                <button 
                  onClick={() => setAddFaqModalOpen(false)} 
                  className={`${styles.actionButton} ${styles.cancelBtn}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit FAQ Modal */}
      {editFaqModalOpen && (
        <div className={styles.overlay} onClick={() => setEditFaqModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit FAQ</h3>
              <button onClick={() => setEditFaqModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.modalContent}>
              <label className={styles.label}>Questions (One per line)</label>
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className={styles.textarea}
                placeholder="Enter questions, one per line"
                rows={4}
                autoFocus
              />
              <div className={styles.questionCount}>
                {newQuestion.split('\n').filter(q => q.trim()).length} question(s) added
              </div>
              
              <label className={styles.label}>Response Type</label>
              <select
                value={newResponseType}
                onChange={(e) => setNewResponseType(e.target.value)}
                className={styles.input}
              >
                <option value="message">Message</option>
                <option value="trigger">Trigger Path</option>
              </select>

              {newResponseType === 'message' && (
                <>
                  <label className={styles.label}>Response Message</label>
                  <textarea
                    value={newResponseMessage}
                    onChange={(e) => setNewResponseMessage(e.target.value)}
                    className={styles.textarea}
                    placeholder="Enter the response message"
                    rows={3}
                  />
                </>
              )}

              {newResponseType === 'trigger' && (
                <>
                  <label className={styles.label}>Path to Trigger</label>
                  <select
                    value={newTriggerPath}
                    onChange={(e) => setNewTriggerPath(e.target.value)}
                    className={styles.input}
                  >
                    <option value="">Select a path</option>
                    {paths.map(path => (
                      <option key={path.id} value={path.id}>
                        {path.name} 
                      </option>
                    ))}
                  </select>
                  {newTriggerPath && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Selected: {getPathName(newTriggerPath)}
                    </div>
                  )}
                </>
              )}

              <div className={styles.actionButtons}>
                <button 
                  onClick={editFaq}
                  disabled={!newQuestion.trim() || 
                    (newResponseType === 'message' && !newResponseMessage.trim()) ||
                    (newResponseType === 'trigger' && !newTriggerPath)}
                  className={`${styles.actionButton} ${styles.saveBtn}`}
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setEditFaqModalOpen(false)} 
                  className={`${styles.actionButton} ${styles.cancelBtn}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}