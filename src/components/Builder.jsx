import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { Background, Controls, addEdge, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { API } from '../api';
import NodeSidebar from './NodeSidebar';
import EditPropertiesModal from './EditPropertiesModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Builder.module.css';
import { useBuilderLogic } from './useBuilderLogic';

let idCounter = 1;
const genId = () => String(++idCounter);

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

export default function Builder({ botId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const flowWrapperRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [reloading, setReloading] = useState(false);
  const [activeView, setActiveView] = useState('builder'); 
  const [chatHistories, setChatHistories] = useState([]);
  const [selectedChatHistory, setSelectedChatHistory] = useState(null);
  const [loadingHistories, setLoadingHistories] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7); 
  const [totalHistories, setTotalHistories] = useState(0);
  
  const {
    mainNodes, setMainNodes, onMainNodesChange,
    mainEdges, setMainEdges, onMainEdgesChange,
    pathNodes, setPathNodes, onPathNodesChange,
    pathEdges, setPathEdges, onPathEdgesChange,
    selected, setSelected,
    originalSelected, setOriginalSelected,
    loading, setLoading,
    editModalOpen, setEditModalOpen,
    contextMenu, setContextMenu,
    addNodePopupOpen, setAddNodePopupOpen,
    paths, setPaths,
    filteredPaths, setFilteredPaths,
    pathPanelOpen, setPathPanelOpen,
    createPathModalOpen, setCreatePathModalOpen,
    newPathName, setNewPathName,
    newPathDescription, setNewPathDescription,
    activePath, setActivePath,
    pathSearchTerm, setPathSearchTerm,
    pathMenuOpen, setPathMenuOpen,
    renameModalOpen, setRenameModalOpen,
    editingPath, setEditingPath,
    editPathName, setEditPathName,
    editPathDescription, setEditPathDescription,
    convertToFlowFormat,
    loadMainGraph,
    loadPathGraph,
    onConnect,
    addNode,
    onNodeClick,
    onNodeDoubleClick,
    onNodeContextMenu,
    deleteNode,
    updateSelected,
    handleFileChange,
    saveNodeChanges,
    cancelNodeChanges,
    onEdgeDoubleClick,
    loadPaths,
    createPath,
    deletePath,
    renamePath,
    openRenameModal,
    setPathStartNode,
    openPathBuilder,
    closePathBuilder,
    savePathGraph,
    saveGraph
  } = useBuilderLogic(botId, searchParams, setSearchParams, genId);

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
  const openChatHistory = async () => {
    setActiveView('chat');
    setSelectedChatHistory(null);
    setLoadingChatHistory(false);
    setChatError(null);
    await fetchChatHistories(1); 
  };
  const openBuilder = () => {
    setActiveView('builder');
    setSelectedChatHistory(null);
    setLoadingChatHistory(false);
    setChatError(null);
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
    if (!pathSearchTerm.trim()) {
      setFilteredPaths(paths);
    } else {
      const searchLower = pathSearchTerm.toLowerCase();
      const filtered = paths.filter(path => 
        path.name.toLowerCase().includes(searchLower) ||
        (path.description && path.description.toLowerCase().includes(searchLower))
      );
      setFilteredPaths(filtered);
    }
  }, [paths, pathSearchTerm, setFilteredPaths]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(`.${styles.menuButton}`) && !e.target.closest(`.${styles.menuDropdown}`)) {
        setPathMenuOpen(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [setPathMenuOpen]);

  const handleReload = async () => {
    setReloading(true);
    
    try {
      const pathIdFromUrl = searchParams.get('pathId');
      
      if (pathIdFromUrl) {
        await loadPathGraph(pathIdFromUrl);
      } else {
        await loadMainGraph();
        setPathNodes([]);
        setPathEdges([]);
        setActivePath(null);
      }
    } catch (error) {
      console.error('Error reloading:', error);
      alert('Failed to reload data. Please try again.');
    } finally {
      setTimeout(() => {
        setReloading(false);
      }, 2000);
    }
  };
  
  useEffect(() => {
    const pathIdFromUrl = searchParams.get('pathId');

    const initialize = async () => {
      try {
        setLoading(true);
        await loadPaths();
        if (pathIdFromUrl) {
          await loadPathGraph(pathIdFromUrl);
        } else {
          await loadMainGraph();
          setPathNodes([]);
          setPathEdges([]);
          setActivePath(null);
        }
      } catch (error) {
        console.error('Error initializing builder:', error);
        alert('Failed to load chatbot data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [botId, searchParams]);

  useEffect(() => {
    if (!selected) return;
    
    let newLabel = selected.data.label;
    
    if (selected._ntype === 'trigger_path') {
      newLabel = selected.data.triggeredPath
        ? `Trigger: ${selected.data.triggeredPath.name}`
        : 'Trigger: None';
    } 
    else if (selected._ntype === 'message_with_options') {
      newLabel = selected.data.options && selected.data.options.length > 0
        ? `Options: ${selected.data.options.join(', ')}`
        : 'Message with Options (no options set)';
    } 
    else if (selected._ntype === 'google_sheet') {
      if (selected.data.formFields && selected.data.formFields.length > 0) {
        newLabel = `Form: ${selected.data.formFields.length} field(s)`;
      } else if (selected.data.googleSheetUrl) {
        newLabel = `Google Sheet: ${selected.data.googleSheetUrl.substring(0, 30)}...`;
      } else {
        newLabel = 'Google Sheet Form';
      }
    }
    if (selected.data.label !== newLabel) {
      updateSelected('label', newLabel);
    }
  }, [selected, updateSelected]);

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu, setContextMenu]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editModalOpen) {
        e.preventDefault();
        const label = selected.data.label || 'Node';
        if (window.confirm(`Delete node "${label}"?`)) {
          deleteNode(selected.id);
        }
      }
      if (e.key === 'Escape') {
        if (editModalOpen) setEditModalOpen(false);
        if (addNodePopupOpen) setAddNodePopupOpen(false);
        if (createPathModalOpen) setCreatePathModalOpen(false);
        if (renameModalOpen) setRenameModalOpen(false);
        setContextMenu(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activePath) {
          savePathGraph();
        } else {
          saveGraph();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selected, 
    editModalOpen, 
    addNodePopupOpen, 
    createPathModalOpen, 
    renameModalOpen,
    activePath,
    deleteNode, 
    setEditModalOpen, 
    setAddNodePopupOpen, 
    setCreatePathModalOpen, 
    setRenameModalOpen, 
    setContextMenu,
    savePathGraph,
    saveGraph
  ]);

  const [lastSaved, setLastSaved] = useState(null);

  const handleSave = async () => {
    try {
      if (activePath) {
        await savePathGraph();
      } else {
        await saveGraph();
      }
      setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Save failed:', error);
    }
  };


  return (
    <>
      {/* Add Node Popup */}
      {addNodePopupOpen && (
        <div className={styles.overlay} onClick={() => setAddNodePopupOpen(false)}>
          <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '10px' }}>Add Node</h3>
            <NodeSidebar
              addNode={(type) => {
                addNode(type);
                setAddNodePopupOpen(false);
              }}
            />
            <button
              onClick={() => setAddNodePopupOpen(false)}
              className={styles.closeButton}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Create Path */}
      {createPathModalOpen && (
        <div className={styles.overlay} onClick={() => setCreatePathModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Path</h3>
              <button onClick={() => setCreatePathModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <section className={styles.modalContent}>
              <label className={styles.label}>Path Name</label>
              <input
                value={newPathName}
                onChange={(e) => setNewPathName(e.target.value)}
                className={styles.input}
                placeholder="Enter path name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPathName.trim()) {
                    createPath();
                  }
                }}
              />
              <label className={styles.label}>Description (Optional)</label>
              <textarea
                value={newPathDescription}
                onChange={(e) => setNewPathDescription(e.target.value)}
                className={styles.textarea}
                placeholder="Enter path description"
                rows={3}
              />
              <div className={styles.actionButtons}>
                <button 
                  onClick={createPath} 
                  disabled={!newPathName.trim()}
                  className={`${styles.actionButton} ${styles.saveBtn}`}
                >
                  Create Path
                </button>
                <button 
                  onClick={() => setCreatePathModalOpen(false)} 
                  className={`${styles.actionButton} ${styles.cancelBtn}`}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Rename Path */}
      {renameModalOpen && (
        <div className={styles.overlay} onClick={() => setRenameModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Rename Path</h3>
              <button onClick={() => setRenameModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <section className={styles.modalContent}>
              <label className={styles.label}>Path Name</label>
              <input
                value={editPathName}
                onChange={(e) => setEditPathName(e.target.value)}
                className={styles.input}
                placeholder="Enter path name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editPathName.trim()) {
                    renamePath(editingPath.id, editPathName, editPathDescription);
                  }
                }}
              />
              <label className={styles.label}>Description (Optional)</label>
              <textarea
                value={editPathDescription}
                onChange={(e) => setEditPathDescription(e.target.value)}
                className={styles.textarea}
                placeholder="Enter path description"
                rows={3}
              />
              <div className={styles.actionButtons}>
                <button 
                  onClick={() => renamePath(editingPath.id, editPathName, editPathDescription)} 
                  disabled={!editPathName.trim()}
                  className={`${styles.actionButton} ${styles.saveBtn}`}
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setRenameModalOpen(false)} 
                  className={`${styles.actionButton} ${styles.cancelBtn}`}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <div 
          className={styles.contextMenu} 
          style={{ top: contextMenu.top, left: contextMenu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`${styles.contextMenuItem} ${styles.deleteOption}`}
            onClick={() => {
              const nodes = activePath ? pathNodes : mainNodes;
              const node = nodes.find((n) => n.id === contextMenu.id);
              const label = node?.data.label || 'Node';
              if (window.confirm(`Delete node "${label}"?`)) {
                deleteNode(contextMenu.id);
                setContextMenu(null);
              }
            }}
          >
            Delete Node
          </div>
        </div>
      )}
      
      {/* Edit Properties */}
      {editModalOpen && (
        <EditPropertiesModal
          selected={selected}
          updateSelected={updateSelected}
          handleFileChange={handleFileChange}
          paths={paths}
          activePath={activePath}
          onSave={saveNodeChanges}
          onCancel={cancelNodeChanges}
          onDelete={deleteNode}
          onClose={() => setEditModalOpen(false)}
        />
      )}
      
      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>Loading...</div>
        </div>
      )}
      
      {/* Reload Animation Overlay */}
      {reloading && (
        <div className={styles.reloadOverlay}>
          <div className={styles.reloadAnimation}>
            <div className={styles.spinner}></div>
          </div>
        </div>
      )}
      
      {/* Main container */}
      <div className={styles.container} ref={flowWrapperRef}>
        {/* Mini Sidebar */}
        <div className={styles.miniSidebar}>
          <div className={styles.sidebarIcons}>
            <button 
              className={`${styles.sidebarIcon} ${activeView === 'builder' ? styles.active : ''}`}
              onClick={openBuilder}
              title="Bot Builder"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
              </svg>
            </button>
            
            <button 
              className={`${styles.sidebarIcon} ${activeView === 'chat' ? styles.active : ''}`}
              onClick={openChatHistory}
              title="Chat History"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {/* Top controls - Only show in builder view */}
          {activeView === 'builder' && (
            <div className={styles.topCenterControls}>
              <button 
                onClick={() => window.open(`/chat/${botId}`, '_blank')} 
                className={styles.testBotButton} 
                title="Test your chatbot in a new window"
              >
                Test Bot
              </button>
              {activePath ? (
                <>
                  <button onClick={handleSave} disabled={loading || reloading} className={styles.saveButton}>
                    {loading ? 'Saving...' : 'Save Path'}
                  </button>
                  <button onClick={closePathBuilder} className={styles.reloadButton}>Back to Main</button>
                </>
              ) : (
                <>
                  <button onClick={handleSave} disabled={loading || reloading} className={styles.saveButton}>
                    {loading ? 'Saving...' : 'Save Main Flow'}
                  </button>
                  <button 
                    onClick={handleReload} 
                    disabled={reloading} 
                    className={styles.reloadButton}
                  >
                    {reloading ? 'Reloading...' : 'Reload'}
                  </button>
                </>
              )}
              <button onClick={() => setAddNodePopupOpen(true)} disabled={reloading} className={styles.addNodeButton}>Add Node</button>
              <button onClick={() => setPathPanelOpen(!pathPanelOpen)} disabled={reloading} className={styles.pathPanelButton}>
                {pathPanelOpen ? 'Hide Paths' : 'Show Paths'}
              </button>
            </div>
          )}
          
          {/* Path Panel - Only show in builder view */}
          {activeView === 'builder' && pathPanelOpen && (
            <div className={styles.pathPanel}>
              <div className={styles.pathPanelHeader}>
                <h3>Paths</h3>
                <button 
                  onClick={() => setCreatePathModalOpen(true)} 
                  className={styles.addPathButton}
                  title="Create new path"
                  disabled={reloading}
                >
                  +
                </button>
              </div>
              
              {/* Search Bar */}
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search paths by name .."
                  value={pathSearchTerm}
                  onChange={(e) => setPathSearchTerm(e.target.value)}
                  className={styles.searchInput}
                  disabled={reloading}
                />
                {pathSearchTerm && (
                  <button 
                    onClick={() => setPathSearchTerm('')}
                    className={styles.clearSearchButton}
                    disabled={reloading}
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className={styles.pathList}>
                {filteredPaths.length === 0 ? (
                  <div className={styles.noPaths}>
                    {pathSearchTerm ? (
                      <p>No paths found matching "{pathSearchTerm}"</p>
                    ) : (
                      <p>No paths created yet</p>
                    )}
                  </div>
                ) : (
                  filteredPaths.map(path => (
                    <div 
                      key={path.id} 
                      className={`${styles.pathItem} ${activePath && activePath.id === path.id ? styles.activePath : ''}`}
                      onClick={() => !reloading && openPathBuilder(path)}
                    >
                      <div className={styles.pathInfo}>
                        <h4>
                          {path.name}
                          {path.is_main && <span className={styles.mainBadge}>Main</span>}
                        </h4>
                        {path.description && <p>{path.description}</p>}
                      </div>
                      {/* Three dots menu for non-main paths */}
                      {!path.is_main && (
                        <div className={styles.pathMenu}>
                          <button 
                            className={styles.menuButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!reloading) {
                                setPathMenuOpen(pathMenuOpen === path.id ? null : path.id);
                              }
                            }}
                            title="Path options"
                            disabled={reloading}
                          >
                            ⋮
                          </button>
                          {pathMenuOpen === path.id && (
                            <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
                              <div 
                                className={styles.menuItem}
                                onClick={(e) => !reloading && openRenameModal(path, e)}
                              >
                                Rename
                              </div>
                              <div 
                                className={`${styles.menuItem} ${styles.deleteItem}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!reloading && window.confirm(`Are you sure you want to delete path "${path.name}"?`)) {
                                    deletePath(path.id);
                                  }
                                  setPathMenuOpen(null);
                                }}
                              >
                                Delete
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Content Area */}
          <div className={styles.contentArea}>
            {activeView === 'builder' ? (
              /* Builder View */
              <div className={styles.canvasWrapper}>
                {activePath ? (
                  <div className={styles.pathHeader}>
                    <h3>Editing Path: {activePath.name}</h3>
                    {activePath.description && <p>{activePath.description}</p>}
                    <button onClick={closePathBuilder} className={styles.exitPathButton}>
                      Exit Path Editing
                    </button>
                  </div>
                ) : (
                  <div className={styles.mainHeader}>
                    <h3>Main Chatbot Flow</h3>
                  </div>
                )}
                
                <ReactFlow
                  nodes={activePath ? pathNodes : mainNodes}
                  edges={activePath ? pathEdges : mainEdges}
                  onNodesChange={activePath ? onPathNodesChange : onMainNodesChange}
                  onEdgesChange={activePath ? onPathEdgesChange : onMainEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onNodeContextMenu={onNodeContextMenu}
                  onEdgeDoubleClick={onEdgeDoubleClick}
                  connectionLineStyle={{ stroke: '#f70404ff', strokeWidth: 2 }}
                  connectionLineType="smoothstep"
                  fitView
                  style={{ width: '100%', height: '100%' }}
                  nodesDraggable={!reloading}
                  nodesConnectable={!reloading}
                  autoPanOnNodeDrag={true}
                  nodeExtent={[[0, 0], [Infinity, Infinity]]}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#a2a2a7ff" gap={20} variant="cross" size={4.9} />
                  <Controls />
                </ReactFlow>
              </div>
            ) : (
              /* Chat History View - Clean without builder controls */
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
                    // Show list of chat histories with pagination
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}