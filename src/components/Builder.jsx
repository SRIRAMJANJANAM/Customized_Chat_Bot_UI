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

export default function Builder({ botId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const flowWrapperRef = useRef(null);
  
  const {
    // State
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
    
    // Methods
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

  // Filter paths when search term changes
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
  }, [paths, pathSearchTerm]);

  // Close path menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setPathMenuOpen(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Load data when component mounts or URL changes
  useEffect(() => {
    const pathIdFromUrl = searchParams.get('pathId');

    const initialize = async () => {
      await loadPaths();
      if (pathIdFromUrl) {
        await loadPathGraph(pathIdFromUrl);
      } else {
        await loadMainGraph();
        setPathNodes([]);
        setPathEdges([]);
        setActivePath(null);
      }
    };

    initialize();
  }, [botId, searchParams]);

  // Update node labels when relevant data changes
  useEffect(() => {
    if (!selected) return;
    if (selected._ntype === 'trigger_path') {
      const newLabel = selected.data.triggeredPath
        ? `Trigger: ${selected.data.triggeredPath.name}`
        : 'Trigger: None';
      if (selected.data.label !== newLabel) {
        updateSelected('label', newLabel);
      }
    }
    if (selected._ntype === 'message_with_options') {
      const newLabel = selected.data.options && selected.data.options.length > 0
        ? `Options: ${selected.data.options.join(', ')}`
        : 'Message with Options (no options set)';
      if (selected.data.label !== newLabel) {
        updateSelected('label', newLabel);
      }
    }
    if (selected._ntype === 'google_sheet') {
      const newLabel = selected.data.googleSheetUrl
        ? `Google Sheet: ${selected.data.googleSheetUrl.substring(0, 30)}...`
        : 'Send to Google Sheet';
      if (selected.data.label !== newLabel) {
        updateSelected('label', newLabel);
      }
    }
  }, [selected?.data.triggeredPath, selected?.data.options, selected?.data.googleSheetUrl]);

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
              style={{ marginTop: '10px', background: 'black', color: 'gold', padding: '4px', borderRadius: '10px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Create Path Modal */}
      {createPathModalOpen && (
        <div className={styles.overlay} onClick={() => setCreatePathModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Path</h3>
              <button onClick={() => setCreatePathModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label className={styles.label}>Path Name</label>
              <input
                value={newPathName}
                onChange={(e) => setNewPathName(e.target.value)}
                className={styles.input}
                placeholder="Enter path name"
              />
              <label className={styles.label}>Description (Optional)</label>
              <textarea
                value={newPathDescription}
                onChange={(e) => setNewPathDescription(e.target.value)}
                className={styles.input}
                placeholder="Enter path description"
                rows={3}
              />
              <div className={styles.actionButtons}>
                <button onClick={createPath} className={`${styles.actionButton} ${styles.saveBtn}`}>Create Path</button>
                <button onClick={() => setCreatePathModalOpen(false)} className={`${styles.actionButton} ${styles.cancelBtn}`}>Cancel</button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Rename Path Modal */}
      {renameModalOpen && (
        <div className={styles.overlay} onClick={() => setRenameModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Rename Path</h3>
              <button onClick={() => setRenameModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label className={styles.label}>Path Name</label>
              <input
                value={editPathName}
                onChange={(e) => setEditPathName(e.target.value)}
                className={styles.input}
                placeholder="Enter path name"
              />
              <label className={styles.label}>Description (Optional)</label>
              <textarea
                value={editPathDescription}
                onChange={(e) => setEditPathDescription(e.target.value)}
                className={styles.input}
                placeholder="Enter path description"
                rows={3}
              />
              <div className={styles.actionButtons}>
                <button onClick={() => renamePath(editingPath.id, editPathName, editPathDescription)} className={`${styles.actionButton} ${styles.saveBtn}`}>Save Changes</button>
                <button onClick={() => setRenameModalOpen(false)} className={`${styles.actionButton} ${styles.cancelBtn}`}>Cancel</button>
              </div>
            </section>
          </div>
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <div className={styles.contextMenu} style={{ top: contextMenu.top, left: contextMenu.left }}>
          <div
            className={`${styles.contextMenuItem} ${styles.deleteOption}`}
            onClick={() => {
              const label = (activePath ? pathNodes : mainNodes).find((n) => n.id === contextMenu.id)?.data.label;
              if (window.confirm(`Delete node "${label}"?`)) deleteNode(contextMenu.id);
            }}
          >
            Delete Node
          </div>
        </div>
      )}
      
      {/* Edit Properties Modal */}
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
      
      {/* Main container */}
      <div className={styles.container} ref={flowWrapperRef}>
        {/* Top controls */}
        <div className={styles.topCenterControls}>
          <button onClick={() => window.open(`/chat/${botId}`, '_blank')} className={styles.testBotButton} title="Test your chatbot in a new window">Test Bot</button>
          {activePath ? (
            <>
              <button onClick={savePathGraph} disabled={loading} className={styles.saveButton}>Save Path</button>
              <button onClick={closePathBuilder} className={styles.reloadButton}>Back to Main</button>
            </>
          ) : (
            <>
              <button onClick={saveGraph} disabled={loading} className={styles.saveButton}>Save Main Flow</button>
              <button onClick={loadMainGraph} disabled={loading} className={styles.reloadButton}>Reload</button>
            </>
          )}
          <button onClick={() => setAddNodePopupOpen(true)} className={styles.addNodeButton}>Add Node</button>
          <button onClick={() => setPathPanelOpen(!pathPanelOpen)} className={styles.pathPanelButton}>
            {pathPanelOpen ? 'Hide Paths' : 'Show Paths'}
          </button>
        </div>
        
        {/* Path Panel */}
        {pathPanelOpen && (
          <div className={styles.pathPanel}>
            <div className={styles.pathPanelHeader}>
              <h3>Paths</h3>
              <button onClick={() => setCreatePathModalOpen(true)} className={styles.addPathButton}>+</button>
            </div>
            
            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search paths by name .."
                value={pathSearchTerm}
                onChange={(e) => setPathSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {pathSearchTerm && (
                <button 
                  onClick={() => setPathSearchTerm('')}
                  className={styles.clearSearchButton}
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
                    onClick={() => openPathBuilder(path)}
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
                            setPathMenuOpen(pathMenuOpen === path.id ? null : path.id);
                          }}
                        >
                          ⋮
                        </button>
                        {pathMenuOpen === path.id && (
                          <div className={styles.menuDropdown}>
                            <div 
                              className={styles.menuItem}
                              onClick={(e) => openRenameModal(path, e)}
                            >
                              Rename
                            </div>
                            <div 
                              className={`${styles.menuItem} ${styles.deleteItem}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePath(path.id);
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
        
        {/* Canvas */}
        <main className={styles.canvasWrapper}>
          {activePath ? (
            <div className={styles.pathHeader}>
              <h3>Editing Path: {activePath.name}</h3>
              <p>{activePath.description}</p>
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
            nodesDraggable={true}
            nodesConnectable={true}
            autoPanOnNodeDrag={true}
            nodeExtent={[[0, 0], [Infinity, Infinity]]}
          >
            <Background color="#a2a2a7ff" gap={20} variant="cross" size={4.9} />
            <Controls />
          </ReactFlow>
        </main>
      </div>
    </>
  );
}