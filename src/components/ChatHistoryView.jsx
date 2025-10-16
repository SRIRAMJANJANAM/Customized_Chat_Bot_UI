import React, { useState, useEffect, useRef } from 'react';
import { API } from '../api';
import styles from './Builder.module.css';

const formatMessageText = (text) => {
  if (!text) return '';
  
  let formattedText = text
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');

  formattedText = formattedText
    .replace(/\n/g, '<br>')
    .replace(/<br>\s*<br>/g, '</p><p>');
  
  return `<p>${formattedText}</p>`;
};

const extractOptionsFromText = (text) => {
  if (!text) return null;
  
  const options = [];
  
  const optionsMatch = text.match(/Options:\s*((?:\w+(?:\s+\w+)*\s*)+)/i);
  if (optionsMatch && optionsMatch[1]) {
    options.push(...optionsMatch[1].trim().split(/\s*,\s*|\s+/).filter(opt => opt.trim()));
  }
  
  const bulletOptions = text.match(/[•\-\*]\s*([^\n]+)/gi);
  if (bulletOptions) {
    options.push(...bulletOptions.map(opt => opt.replace(/[•\-\*]\s*/i, '').trim()));
  }
  
  const numberedOptions = text.match(/\d+\.\s*([^\n]+)/gi);
  if (numberedOptions) {
    options.push(...numberedOptions.map(opt => opt.replace(/\d+\.\s*/i, '').trim()));
  }
  
  return options.length > 0 ? options : null;
};

const FormattedMessage = ({ message }) => {
  const messageText = message?.text || '';
  const messageType = message?.type || 'text';
  const messageUrl = message?.url || '';
  const messageOptions = message?.options || [];
  const pathTriggered = message?.path_triggered || '';
  const timestamp = message?.timestamp || '';
  
  const formattedText = formatMessageText(messageText);
  const extractedOptions = extractOptionsFromText(messageText);
  const hasOptions = (messageOptions && messageOptions.length > 0) || 
                    (messageType === 'message_with_options') || 
                    (extractedOptions && extractedOptions.length > 0);
  
  const optionsToDisplay = messageOptions || extractedOptions || [];

  return (
    <div className={styles.messageContent}>
      <div 
        className={styles.messageText}
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />
      
      {messageType === 'image' && messageUrl && (
        <img 
          src={messageUrl} 
          alt="Chat attachment" 
          className={styles.chatImage}
          onError={(e) => {
            console.log('Image failed to load:', messageUrl);
            e.target.style.display = 'none';
          }}
          onLoad={(e) => {
            console.log('Image loaded successfully:', messageUrl);
          }}
        />
      )}
      
      {messageType === 'file_request' && (
        <div className={styles.fileRequest}>
          📎 File Request
        </div>
      )}
      
      {hasOptions && optionsToDisplay.length > 0 && (
        <div className={styles.optionsContainer}>
          <div className={styles.optionsLabel}>Select an option:</div>
          <div className={styles.optionsGrid}>
            {optionsToDisplay.map((option, optIndex) => (
              <button 
                key={optIndex}
                className={styles.optionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`Option selected: ${option}`);
                }}
                disabled 
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {pathTriggered && (
        <div className={styles.pathTrigger}>
          <strong>Path triggered:</strong> {pathTriggered}
        </div>
      )}
      
      {timestamp && (
        <div className={styles.messageMeta}>
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(totalPages - 1, currentPage + 2);
      
      if (currentPage <= 3) {
        endPage = 5;
      }
      
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 4;
      }
      
      if (startPage > 2) {
        pages.push('...');
      }
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={styles.pagination}>
      <button
        className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ← Previous
      </button>
      
      <div className={styles.pageNumbers}>
        {pageNumbers.map((page, index) => (
          <button
            key={index}
            className={`${styles.pageButton} ${
              page === currentPage ? styles.active : ''
            } ${page === '...' ? styles.ellipsis : ''}`}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}
      </div>
      
      <button
        className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next →
      </button>
    </div>
  );
};

const ChatHistoryView = ({ botId }) => {
  const [chatHistories, setChatHistories] = useState([]);
  const [selectedChatHistory, setSelectedChatHistory] = useState(null);
  const [loadingHistories, setLoadingHistories] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const [totalHistories, setTotalHistories] = useState(0);
  const messagesContainerRef = useRef(null);

  const fetchChatHistories = async (page = 1) => {
    setChatError(null);
    setLoadingHistories(true);
    try {
      console.log('Fetching chat histories for bot:', botId, 'page:', page);
      let response;
      try {
        response = await API.get(`/chatbots/${botId}/chat_histories/`, {
          params: {
            page: page,
            page_size: itemsPerPage
          }
        });
      } catch (err) {
        console.log('Paginated API failed, trying non-paginated...');
        response = await API.get(`/chatbots/${botId}/chat_histories/`);
      }
      
      const data = response.data;
      console.log('Chat histories received:', data);
      
      let histories = [];
      let total = 0;
      if (data && Array.isArray(data.results)) {
        histories = data.results;
        total = data.count || data.total || data.results.length;
      } else if (Array.isArray(data)) {
        histories = data;
        total = data.length;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        histories = data.slice(startIndex, endIndex);
      } else {
        histories = Array.isArray(data) ? data : [];
        total = histories.length;
      }
      
      setChatHistories(histories);
      setTotalHistories(total);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error fetching chat histories:', err);
      setChatError('Failed to load chat histories');
      setChatHistories([]);
      setTotalHistories(0);
    } finally {
      setLoadingHistories(false);
    }
  };

  const fetchChatHistory = async (sessionId) => {
    setChatError(null);
    setLoadingChatHistory(true);
    try {
      console.log('Fetching chat history for session:', sessionId);
      setSelectedChatHistory(null);
      
      const { data } = await API.get(`/chatbots/${botId}/chat_history/?session_id=${sessionId}`);
      console.log('Chat history received:', data);
      if (!data) {
        throw new Error('No data received from server');
      }
      const validatedData = {
        ...data,
        messages: Array.isArray(data.messages) ? data.messages : [],
        user_identifier: data.user_identifier || 'Unknown User',
        started_at: data.started_at || new Date().toISOString(),
        last_activity: data.last_activity || new Date().toISOString()
      };
      
      setSelectedChatHistory(validatedData);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setChatError(`Failed to load chat history: ${err.message}`);
      setSelectedChatHistory(null);
    } finally {
      setLoadingChatHistory(false);
    }
  };

  const clearChatHistories = async () => {
    if (window.confirm('Are you sure you want to clear all chat histories? This cannot be undone.')) {
      try {
        await API.delete(`/chatbots/${botId}/clear_chat_histories/`);
        setChatHistories([]);
        setSelectedChatHistory(null);
        setChatError(null);
        setTotalHistories(0);
        setCurrentPage(1);
        alert('All chat histories cleared successfully!');
      } catch (err) {
        console.error('Error clearing chat histories:', err);
        setChatError('Error clearing chat histories: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchChatHistories(newPage);
    }
  };

  const formatUserIdentifier = (userIdentifier) => {
    if (!userIdentifier) return 'Anonymous User';

    if (userIdentifier.startsWith('orai_RAM_')) {
      return userIdentifier;
    }
    if (userIdentifier.startsWith('user_')) {
      const sessionPart = userIdentifier.replace('user_', '');
      const randomNum = sessionPart.substring(0, 4); 
      return `orai_RAM_${randomNum}`;
    }
    
    return userIdentifier;
  };

  const totalPages = Math.ceil(totalHistories / itemsPerPage);

  useEffect(() => {
    if (messagesContainerRef.current && selectedChatHistory) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }, 100);
    }
  }, [selectedChatHistory]);

  useEffect(() => {
    fetchChatHistories(1);
  }, [botId]);

  return (
    <div className={styles.chatHistoryView}>
      <div className={styles.chatHistoryHeader}>
        <h2>Chat History</h2>
        <div className={styles.chatHistoryActions}>
          <button 
            onClick={() => fetchChatHistories(1)} 
            disabled={loadingHistories}
            className={styles.refreshButton}
            title="Refresh"
          >
            🔄 Refresh
          </button>
          <button 
            onClick={clearChatHistories}
            className={styles.clearButton}
            title="Clear All Histories"
          >
            🗑️ Delete All
          </button>
        </div>
      </div>
      
      <div className={styles.chatHistoryContent}>
        {chatError && (
          <div className={styles.errorMessage}>
            <strong>Error:</strong> {chatError}
            <button 
              onClick={() => setChatError(null)} 
              className={styles.dismissError}
            >
              ✕
            </button>
          </div>
        )}
        
        {selectedChatHistory ? (
          // Show specific chat conversation
          <div className={styles.chatConversation}>
            <div className={styles.conversationHeader}>
              <button 
                onClick={() => {
                  setSelectedChatHistory(null);
                  setLoadingChatHistory(false);
                  setChatError(null);
                }}
                className={styles.backButton}
              >
                ← Back to List
              </button>
              <div className={styles.conversationInfo}>
                <h4>{formatUserIdentifier(selectedChatHistory.user_identifier)}</h4>
                <div className={styles.conversationMeta}>
                  <span>Started: {new Date(selectedChatHistory.started_at).toLocaleString()}</span>
                  <span>Last active: {new Date(selectedChatHistory.last_activity).toLocaleString()}</span>
                  <span>{selectedChatHistory.messages?.length || 0} messages</span>
                </div>
              </div>
            </div>
            
            {loadingChatHistory ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading conversation...</p>
              </div>
            ) : (
              <div 
                className={styles.messagesContainer}
                ref={messagesContainerRef}
              >
                {selectedChatHistory.messages && selectedChatHistory.messages.length > 0 ? (
                  selectedChatHistory.messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`${styles.message} ${
                        message.from === 'user' ? styles.userMessage : styles.botMessage
                      }`}
                    >
                      <div className={styles.messageHeader}>
                        <div className={styles.messageSender}>
                          {message.from === 'user' ? '👤 User' : '🤖 Bot'}
                        </div>
                        <div className={styles.messageTime}>
                          {message.timestamp ? 
                            new Date(message.timestamp).toLocaleTimeString() : 
                            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        </div>
                      </div>
                      <FormattedMessage message={message} />
                    </div>
                  ))
                ) : (
                  <div className={styles.noMessages}>
                    <p>No messages found in this conversation</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.chatHistoryList}>
            <div className={styles.listHeader}>
              <h3>Recent Conversations</h3>
              <span className={styles.historyCount}>
                {totalHistories} conversation{totalHistories !== 1 ? 's' : ''}
                {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
              </span>
            </div>
            
            {loadingHistories ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading conversations...</p>
              </div>
            ) : chatHistories.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💬</div>
                <h4>No chat histories yet</h4>
                <p>Chat histories will appear here when users interact with your bot</p>
              </div>
            ) : (
              <>
                <div className={styles.historyItems}>
                  {chatHistories.map(history => {
                    const lastMessage = history.messages && history.messages.length > 0 ? 
                      history.messages[history.messages.length - 1]?.text || 'No message text' : 
                      'No messages';
                    
                    const formattedLastMessage = lastMessage
                      .replace(/<[^>]*>/g, '') 
                      .substring(0, 80);
                    
                    return (
                      <div 
                        key={history.id}
                        className={styles.historyItem}
                        onClick={() => fetchChatHistory(history.session_id)}
                      >
                        <div className={styles.itemHeader}>
                          <strong className={styles.userName}>
                            {formatUserIdentifier(history.user_identifier)}
                          </strong>
                          <span className={styles.messageCount}>
                            {history.messages?.length || 0} message{(history.messages?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className={styles.itemPreview}>
                          <span className={styles.lastMessage}>
                            {formattedLastMessage}
                            {lastMessage.length > 80 ? '...' : ''}
                          </span>
                        </div>
                        <div className={styles.itemFooter}>
                          <span className={styles.chatTime}>
                            {new Date(history.last_activity).toLocaleDateString()} at {' '}
                            {new Date(history.last_activity).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryView;