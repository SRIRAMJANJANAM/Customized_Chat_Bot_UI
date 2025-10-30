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
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/---/g, '<hr>');

  formattedText = formattedText
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '</p><p>';
      if (line.startsWith('<')) return line;
      return line + '<br>';
    })
    .join('');

  if (!formattedText.startsWith('<p>')) {
    formattedText = '<p>' + formattedText;
  }
  if (!formattedText.endsWith('</p>')) {
    formattedText = formattedText + '</p>';
  }

  formattedText = formattedText
    .replace(/<p><\/p>/g, '')
    .replace(/<p><br><\/p>/g, '')
    .replace(/<p><p>/g, '<p>')
    .replace(/<\/p><\/p>/g, '</p>');

  return formattedText;
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
  const isFAQ = message?.is_faq || false;
  const matchedQuestion = message?.matched_question || '';
  const formFields = message?.form_fields || [];
  const fileContent = message?.file_content || '';
  
  const formattedText = formatMessageText(messageText);
  const extractedOptions = extractOptionsFromText(messageText);
  const hasOptions = (messageOptions && messageOptions.length > 0) || 
                    (messageType === 'message_with_options') || 
                    (extractedOptions && extractedOptions.length > 0);
  
  const optionsToDisplay = messageOptions || extractedOptions || [];

  // Enhanced image URL handling
  const getImageUrl = (url) => {
    if (!url) return '';
    
    console.log('🔍 Original image URL:', url);
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative path starting with /media/, construct full URL
    if (url.startsWith('/media/')) {
      const fullUrl = `${window.location.origin}${url}`;
      console.log('🔍 Constructed media URL:', fullUrl);
      return fullUrl;
    }
    
    // If it's just a filename or relative path without /media/
    if (url.startsWith('/')) {
      const fullUrl = `${window.location.origin}${url}`;
      console.log('🔍 Constructed absolute URL:', fullUrl);
      return fullUrl;
    }
    
    // Default case - assume it's in media folder
    const fullUrl = `${window.location.origin}/media/${url}`;
    console.log('🔍 Constructed default media URL:', fullUrl);
    return fullUrl;
  };

  // Check if file_content is a valid base64 image (should be long enough and contain data:image/)
  const isValidBase64Image = (content) => {
    if (!content) return false;
    
    // Check if it's a proper base64 image (starts with data:image/ and is reasonably long)
    const isProperBase64 = content.startsWith('data:image/') && content.length > 100;
    
    console.log('🔍 Base64 validation:', {
      contentLength: content.length,
      startsWithDataImage: content.startsWith('data:image/'),
      isValid: isProperBase64,
      contentPreview: content.substring(0, 100) + '...'
    });
    
    return isProperBase64;
  };

  // Handle image source - only use file_content if it's valid
  const getImageSource = () => {
    // First priority: valid file_content (base64)
    if (isValidBase64Image(fileContent)) {
      console.log('🔍 Using valid base64 file_content');
      return fileContent;
    } else if (fileContent) {
      console.log('🔍 File content exists but is invalid:', {
        length: fileContent.length,
        preview: fileContent
      });
    }
    
    // Second priority: URL
    if (messageUrl) {
      const url = getImageUrl(messageUrl);
      console.log('🔍 Using URL:', url);
      return url;
    }
    
    return '';
  };

  const imageSource = getImageSource();
  const hasValidImageSource = !!imageSource;

  return (
    <div className={`${styles.messageContent} ${isFAQ ? styles.faqMessage : ''}`}>
      {/* Only render formatted text for text messages */}
      {messageType === 'text' && messageText && (
        <div 
          className={styles.messageText}
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      )}
      
      {/* Handle image messages */}
      {messageType === 'image' && (
        <div className={styles.imageContainer}>
          {hasValidImageSource ? (
            <img 
              src={imageSource} 
              alt="Chat attachment" 
              className={styles.chatImage}
              onError={(e) => {
                console.error('❌ Image failed to load:', {
                  originalUrl: messageUrl,
                  finalUrl: imageSource,
                  fileContent: !!fileContent,
                  fileContentLength: fileContent?.length || 0,
                  fileContentValid: isValidBase64Image(fileContent),
                  error: e
                });
                e.target.style.display = 'none';
                
                // Show fallback
                const container = e.target.parentNode;
                const existingFallback = container.querySelector('.imageError');
                if (!existingFallback) {
                  const fallback = document.createElement('div');
                  fallback.className = styles.imageError;
                  fallback.textContent = '📷 Image not available';
                  container.appendChild(fallback);
                }
              }}
              onLoad={(e) => {
                console.log('✅ Image loaded successfully:', {
                  source: isValidBase64Image(fileContent) ? 'base64' : 'URL',
                  url: messageUrl,
                  fileContentLength: fileContent?.length || 0
                });
              }}
            />
          ) : (
            <div className={styles.imageError}>
              📷 Image not available
              <div className={styles.imageErrorDetails}>
                {fileContent ? `Invalid file content (${fileContent.length} chars)` : 'No image source'}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Handle text messages that might have separate image URLs */}
      {messageType === 'text' && messageUrl && !fileContent && (
        <div className={styles.imageContainer}>
          <img 
            src={getImageUrl(messageUrl)} 
            alt="Chat attachment" 
            className={styles.chatImage}
            onError={(e) => {
              console.log('Image failed to load in text message:', messageUrl);
              e.target.style.display = 'none';
            }}
            onLoad={(e) => {
              console.log('Image loaded successfully in text message:', messageUrl);
            }}
          />
        </div>
      )}
      
      {messageType === 'file_request' && (
        <div className={styles.fileRequest}>
          📎 File Request
        </div>
      )}
      
      {messageType === 'form' && formFields.length > 0 && (
        <div className={styles.formContainer}>
          <div className={styles.formLabel}>Form:</div>
          <div className={styles.formFields}>
            {formFields.map((field, index) => (
              <div key={index} className={styles.formField}>
                <label>{field.label || field.name}:</label>
                <input 
                  type={field.type || 'text'}
                  placeholder={field.placeholder || ''}
                  disabled
                  className={styles.formInput}
                />
              </div>
            ))}
          </div>
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
      console.log('🔍 RAW CHAT HISTORY DATA:', data);
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      // Log message details for debugging
      if (data.messages && Array.isArray(data.messages)) {
        console.log('📝 ALL MESSAGES:', data.messages);
        
        data.messages.forEach((msg, index) => {
          console.log(`Message ${index}:`, {
            from: msg.from,
            type: msg.type,
            text: msg.text,
            textLength: msg.text?.length,
            hasText: !!msg.text,
            is_faq: msg.is_faq,
            url: msg.url,
            file_content: msg.file_content ? `Yes (${msg.file_content.length} chars)` : 'No',
            file_content_preview: msg.file_content ? msg.file_content.substring(0, 50) + '...' : 'None'
          });
        });
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
                  <span>
                    {selectedChatHistory.messages?.filter(msg => msg.is_faq).length || 0} FAQ responses
                  </span>
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
                      } ${message.is_faq ? styles.faqResponse : ''}`}
                    >
                      <div className={styles.messageHeader}>
                        <div className={styles.messageSender}>
                          {message.from === 'user' ? '👤 User' : '🤖 Bot'}

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
                    
                    // Count FAQ responses in this history
                    const faqCount = history.messages?.filter(msg => msg.is_faq).length || 0;
                    
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
                            {faqCount > 0 && ` • ${faqCount} FAQ`}
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
                
                {/* Pagination  */}
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