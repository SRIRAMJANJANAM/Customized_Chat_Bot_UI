import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { Background, Controls, addEdge, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { API } from '../api';
import NodeSidebar from './NodeSidebar';
import EditPropertiesModal from './EditPropertiesModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Builder.module.css';
import { useBuilderLogic } from './useBuilderLogic';
import ChatHistoryView from './ChatHistoryView';
import AnalyticsView from './AnalyticsView';

let idCounter = 1;
const genId = () => String(++idCounter);

export default function Builder({ botId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const flowWrapperRef = useRef(null);
  const [reloading, setReloading] = useState(false);
  const [activeView, setActiveView] = useState('builder'); 
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('chat'); // Default icon
  
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

  const openChatHistory = () => {
    setActiveView('chat');
  };

  const openAnalytics = () => {
    setActiveView('analytics');
  };

  const openBuilder = () => {
    setActiveView('builder');
  };

  const openWebsiteIntegration = () => {
    setActiveView('integration');
  };

  const getIconSvg = (iconType) => {
    switch(iconType) {
      case 'robot':
        return '🤖';
      case 'message':
        return '💭';
      case 'support':
        return '🛟';
      case 'help':
        return '❓';
      default:
        return '💬';
    }
  };

  const getIconName = (iconType) => {
    switch(iconType) {
      case 'robot':
        return 'AI Assistant';
      case 'message':
        return 'Chat Bubble';
      case 'support':
        return 'Customer Support';
      case 'help':
        return 'Help Desk';
      default:
        return 'Chat';
    }
  };

  const generateScriptTag = () => {
    const currentDomain = window.location.origin;
    const selectedIconSvg = getIconSvg(selectedIcon);
    const scriptContent = `<script>
document.addEventListener('DOMContentLoaded', function() {
    var chatIcon = document.createElement('div');
    chatIcon.innerHTML = '${selectedIconSvg}';
    chatIcon.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#4a6ee0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;font-size:24px;color:white;';
    
    var chatWindow = document.createElement('iframe');
    chatWindow.src = '${currentDomain}/chat/${botId}';
    chatWindow.style.cssText = 'position:fixed;bottom:80px;right:20px;width:350px;height:450px;border:none;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:999;display:none;';
    
    document.body.appendChild(chatIcon);
    document.body.appendChild(chatWindow);
    
    chatIcon.onclick = function() {
        chatWindow.style.display = chatWindow.style.display === 'none' ? 'block' : 'none';
    };
});
</script>`;
    
    return scriptContent;
  };

  const copyToClipboard = () => {
    const scriptText = generateScriptTag();
    navigator.clipboard.writeText(scriptText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy script. Please try again.');
    });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
            <div className={styles.modalContent}>
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
            </div>
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
            <div className={styles.modalContent}>
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
            </div>
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

            {/* Analytics Icon */}
            <button 
              className={`${styles.sidebarIcon} ${activeView === 'analytics' ? styles.active : ''}`}
              onClick={openAnalytics}
              title="Analytics"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 22V8h4v14H3zm7 0V2h4v20h-4zm7 0v-8h4v8h-4z"/>
              </svg>
            </button>

            {/* Configuration Icon */}
            <button 
              className={`${styles.sidebarIcon} ${activeView === 'integration' ? styles.active : ''}`}
              onClick={openWebsiteIntegration}
              title="Website Integration"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
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
                      {/* Three dots  for non-main  */}
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
            ) : activeView === 'chat' ? (
              <ChatHistoryView botId={botId} />
            ) : activeView === 'analytics' ? (
              <AnalyticsView botId={botId} />
            ) : activeView === 'integration' ? (
              /* Website Integration View */
              <div className={styles.integrationView}>
                <div className={styles.integrationContainer}>
                  <div className={styles.integrationHeader}>
                    <h2>Website Integration</h2>
                    <p>Add this chatbot to your website with a simple script</p>
                  </div>
                  
                  <div className={styles.contentScroll}>
                    {/* Quick Navigation */}
                    <div className={styles.quickNav}>
                      <button onClick={() => scrollToSection('icon-section')}>
                        🎨 Icon Style
                      </button>
                      <button onClick={() => scrollToSection('script-section')}>
                        📋 Script
                      </button>
                      <button onClick={() => scrollToSection('instructions-section')}>
                        🚀 Instructions
                      </button>
                      <button onClick={() => scrollToSection('preview-section')}>
                        👁️ Preview
                      </button>
                    </div>

                    {/* Icon Selection Section */}
                    <div id="icon-section" className={styles.iconSection}>
                      <h3>Choose Your Chat Icon</h3>
                      <p>Select an icon that matches your website's style</p>
                      <div className={styles.iconGrid}>
                        <div 
                          className={`${styles.iconOption} ${selectedIcon === 'robot' ? styles.selected : ''}`}
                          onClick={() => setSelectedIcon('robot')}
                        >
                          <div className={styles.iconPreview}>🤖</div>
                          <span>AI Assistant</span>
                        </div>
                        <div 
                          className={`${styles.iconOption} ${selectedIcon === 'message' ? styles.selected : ''}`}
                          onClick={() => setSelectedIcon('message')}
                        >
                          <div className={styles.iconPreview}>💭</div>
                          <span>Chat Bubble</span>
                        </div>
                        <div 
                          className={`${styles.iconOption} ${selectedIcon === 'support' ? styles.selected : ''}`}
                          onClick={() => setSelectedIcon('support')}
                        >
                          <div className={styles.iconPreview}>🛟</div>
                          <span>Customer Support</span>
                        </div>
                        <div 
                          className={`${styles.iconOption} ${selectedIcon === 'help' ? styles.selected : ''}`}
                          onClick={() => setSelectedIcon('help')}
                        >
                          <div className={styles.iconPreview}>❓</div>
                          <span>Help Desk</span>
                        </div>
                      </div>
                    </div>

                    {/* Script Section */}
                    <div id="script-section" className={styles.scriptSection}>
                      <div className={styles.scriptHeader}>
                        <h3>Integration Script</h3>
                        <button 
                          onClick={copyToClipboard}
                          className={styles.copyButton}
                          title="Copy script to clipboard"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                          </svg>
                          Copy Script
                        </button>
                      </div>
                      
                      <div className={styles.scriptContainer}>
                        <pre className={styles.scriptCode}>
                          {generateScriptTag()}
                        </pre>
                      </div>
                    </div>

                    {/* Instructions Section */}
                    <div id="instructions-section" className={styles.instructions}>
                      <h3>How to Install</h3>
                      <div className={styles.instructionSteps}>
                        <div className={styles.instructionStep}>
                          <div className={styles.stepNumber}>1</div>
                          <div className={styles.stepContent}>
                            <h4>Choose Your Icon</h4>
                            <p>Select an icon style that matches your website's design from the options above</p>
                          </div>
                        </div>
                        <div className={styles.instructionStep}>
                          <div className={styles.stepNumber}>2</div>
                          <div className={styles.stepContent}>
                            <h4>Copy the Script</h4>
                            <p>Click the "Copy Script" button to copy the integration code with your selected icon</p>
                          </div>
                        </div>
                        <div className={styles.instructionStep}>
                          <div className={styles.stepNumber}>3</div>
                          <div className={styles.stepContent}>
                            <h4>Paste in Your Website</h4>
                            <p>Paste the script just before the closing &lt;/body&gt; tag in your website HTML code</p>
                          </div>
                        </div>
                        <div className={styles.instructionStep}>
                          <div className={styles.stepNumber}>4</div>
                          <div className={styles.stepContent}>
                            <h4>Publish Your Website</h4>
                            <p>Save your changes and publish your website. The chat widget will appear automatically.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview Section */}
                    <div id="preview-section" className={styles.preview}>
                      <h3>Live Preview</h3>
                      <p>Here's how the chat widget will appear on your website with the <strong>{getIconName(selectedIcon)}</strong> icon</p>
                      <div className={styles.previewDemo}>
                        <div className={styles.chatIconDemo}>{getIconSvg(selectedIcon)}</div>
                        <div className={styles.chatWindowDemo}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                {copySuccess && (
                  <div className={styles.copySuccess}>
                    Script copied to clipboard!
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}