import React, { useEffect, useState, useRef } from 'react';
import ReactFlow, { Background, Controls, ConnectionLineType } from 'reactflow';
import 'reactflow/dist/style.css';
import { useSearchParams } from 'react-router-dom';
import styles from './Builder.module.css';
import { useBuilderLogic } from './useBuilderLogic';
import AnalyticsView from './AnalyticsView';
import FAQManagementView from './FAQManagementView';
import WebsiteIntegrationView from './WebsiteIntegrationView';
import NodeSidebar from './NodeSidebar';
import EditPropertiesModal from './EditPropertiesModal';
import HomeView from './HomeView';
import ChatHistoryView from './ChatHistoryView';

let idCounter = 1;
const genId = () => String(++idCounter);

export default function Builder({ botId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const flowWrapperRef = useRef(null);
  const [reloading, setReloading] = useState(false);
  const [activeView, setActiveView] = useState('builder');

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
    saveGraph,
    testEmailConfiguration
  } = useBuilderLogic(botId, searchParams, setSearchParams, genId);

  // Helper function to get path name
  const getPathName = (pathId) => {
    if (!pathId) return 'No Path Selected';
    
    // Handle both string and number IDs
    const foundPath = paths.find(p => p.id === pathId || p.id === parseInt(pathId));
    return foundPath ? foundPath.name : 'Unknown Path';
  };

  const openChatHistory = () => {
    setActiveView('chat');
  };

  const openAnalytics = () => {
    setActiveView('analytics');
  };

  const openBuilder = () => {
    setActiveView('builder');
  };

  const openFaqManagement = () => {
    setActiveView('faq');
  };

  const openWebsiteIntegration = () => {
    setActiveView('integration');
  };

  const openHome = () => {
    setActiveView('home');
  };

  const handleNavigate = (view) => {
    setActiveView(view);
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
    else if (selected._ntype === 'send_email') {
      if (selected.data.emailSubject) {
        newLabel = `Email: ${selected.data.emailSubject.substring(0, 20)}...`;
      } else {
        newLabel = 'Send Email (not configured)';
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
          testEmailConfiguration={testEmailConfiguration}
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
            {/* Home Icon */}
           <div className={styles.tooltipContainer}>
  <button
    className={`${styles.sidebarIcon} ${activeView === 'home' ? styles.active : ''}`}
    onClick={openHome}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  </button>
  <span className={styles.tooltipText}>Home</span>
</div>

<div className={styles.tooltipContainer}>
  <button
    className={`${styles.sidebarIcon} ${activeView === 'builder' ? styles.active : ''}`}
    onClick={openBuilder}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
    </svg>
  </button>
  <span className={styles.tooltipText}>Bot Builder</span>
</div>

<div className={styles.tooltipContainer}>
  <button
    className={`${styles.sidebarIcon} ${activeView === 'chat' ? styles.active : ''}`}
    onClick={openChatHistory}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
    </svg>
  </button>
  <span className={styles.tooltipText}>Chat History</span>
</div>

<div className={styles.tooltipContainer}>
  <button
    className={`${styles.sidebarIcon} ${activeView === 'analytics' ? styles.active : ''}`}
    onClick={openAnalytics}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 22V8h4v14H3zm7 0V2h4v20h-4zm7 0v-8h4v8h-4z"/>
    </svg>
  </button>
  <span className={styles.tooltipText}>Analytics</span>
</div>

<div className={styles.tooltipContainer}>
  <button
    className={`${styles.sidebarIcon} ${activeView === 'faq' ? styles.active : ''}`}
    onClick={openFaqManagement}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  </button>
  <span className={styles.tooltipText}>FAQ Management</span>
</div>


            {/* Configuration Icon */}
            <div className={styles.tooltipContainer}>
  <button
    className={`${styles.sidebarIcon} ${activeView === 'integration' ? styles.active : ''}`}
    onClick={openWebsiteIntegration}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  </button>
  <span className={styles.tooltipText}>Website Integration</span>
</div>

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

          {activeView === 'home' && (
            <HomeView onNavigate={handleNavigate} />
          )}

          {/* FAQ Management View */}
          {activeView === 'faq' && (
            <FAQManagementView 
              botId={botId} 
              paths={paths} 
            />
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
                      {/* Three dots for non-main */}
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
                connectionLineStyle={{ 
                  stroke: '#007bff', 
                  strokeWidth: 2,
                  strokeDasharray: 'none'
                }}
                connectionLineType={ConnectionLineType.SmoothStep}
                connectionRadius={8}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  style: {
                    stroke: '#007bff',
                    strokeWidth: 2,
                  },
                  markerEnd: {
                    type: 'arrowclosed',
                    color: '#007bff',
                  },
                }}
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
            ) : activeView === 'faq' ? (
              <FAQManagementView botId={botId} paths={paths} />
            ) : activeView === 'integration' ? (
              <WebsiteIntegrationView botId={botId} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}