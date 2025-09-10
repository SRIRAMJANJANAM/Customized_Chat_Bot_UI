import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { API } from '../api';
import NodeSidebar from './NodeSidebar';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './Builder.module.css';

let idCounter = 1;
const genId = () => String(++idCounter);

export default function Builder({ botId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState(null);
  const [originalSelected, setOriginalSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const navigate = useNavigate();
  const flowWrapperRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, don't automatically open the sidebar
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            label: '+',
            style: { stroke: '#4f46e5' },
            markerEnd: { type: 'arrowclosed' },
          },
          eds
        )
      ),
    [setEdges]
  );

  const addNode = (type) => {
    const id = genId();
    const backendNodeType = {
      greeting: 'greeting',
      user_input: 'user_input',
      message: 'message',
      image: 'image',
      file: 'file_upload',
      branch: 'branch',
      end: 'end',
    }[type] || type;

    const defaultContent = {
      greeting: 'Welcome! What topic do you need help with?',
      user_input: 'Type your answer…',
      message: 'Here is some information…',
      branch: '',
      end: 'Goodbye!',
      image: '',
      file: '',
    }[type] || '';

    const defaultWidth = type === 'image' ? 200 : null;
    const defaultHeight = type === 'image' ? 150 : null;

    // If this is the first node, position it in the center
    const isFirstNode = nodes.length === 0;
    const position = isFirstNode 
      ? { x: window.innerWidth / 2 - 100, y: 100 } 
      : { x: 120 + Math.random() * 320, y: 80 + Math.random() * 280 };

    setNodes((nds) =>
      nds.concat({
        id,
        type: 'default',
        position,
        data: {
          label: `${type} ${id}`,
          content: defaultContent,
          nodeType: type,
          fileName: null,
          fileType: null,
          fileContent: null,
          width: defaultWidth,
          height: defaultHeight,
        },
        _ntype: backendNodeType,

        style: {
      backgroundColor: '#050505ff',   // Yellow background
      border: '2px solid #000000',  // Black border
      borderRadius: '8px',
      color: '#f4f800ff',             // Text color
    },
      })
    );
  };

  const onNodeClick = (_, node) => {
    setOriginalSelected(JSON.parse(JSON.stringify(node)));
    setSelected(node);
    setEditModalOpen(true);
  };

  const onNodeDoubleClick = (_, node) => {
    if (window.confirm(`Delete node "${node.data.label}"?`)) deleteNode(node.id);
  };

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ id: node.id, top: event.clientY, left: event.clientX, type: 'node' });
  }, []);

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selected?.id === nodeId) {
      setSelected(null);
      setOriginalSelected(null);
      setEditModalOpen(false);
    }
    setContextMenu(null);
  };

  const updateSelected = (field, value) => {
    if (!selected) return;
    setSelected((s) => ({ 
      ...s, 
      data: { 
        ...s.data, 
        [field]: value 
      } 
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !selected) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateSelected('fileName', file.name);
      updateSelected('fileType', file.type);
      updateSelected('fileContent', reader.result);

      if (selected._ntype === 'image') {
        const img = new Image();
        img.onload = () => {
          updateSelected('width', img.width);
          updateSelected('height', img.height);
        };
        img.src = reader.result;
      }
      setEditModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const saveNodeChanges = () => {
    if (!selected) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selected.id ? { ...n, data: { ...selected.data } } : n
      )
    );
    setSelected(null);
    setOriginalSelected(null);
    setEditModalOpen(false);
  };

  const cancelNodeChanges = () => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === originalSelected.id ? { ...originalSelected } : n
      )
    );
    setSelected(null);
    setOriginalSelected(null);
    setEditModalOpen(false);
  };

  const onEdgeDoubleClick = (_, edge) => {
    const action = prompt('Edit edge label (e.g. "yes", "no", "+")', edge.label || '');
    if (action === null) return;
    if (action === '-') setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    else setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, label: action || '+' } : e)));
  };

  const saveGraph = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(
        'nodes',
        JSON.stringify(
          nodes.map((n) => ({
            id: n.id,
            _ntype: n._ntype,
            position: n.position,
            data: {
              label: n.data.label,
              content: n.data.content,
              width: n.data.width,
              height: n.data.height,
              fileName: n.data.fileName,
              fileType: n.data.fileType,
              fileContent: n.data.fileContent,
            },
          }))
        )
      );

      formData.append(
        'edges',
        JSON.stringify(
          edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label || '+',
          }))
        )
      );

      // Add files as blobs
      nodes.forEach((n) => {
        if (
          (n._ntype === 'image' || n._ntype === 'file_upload') &&
          n.data.fileContent?.startsWith('data:')
        ) {
          const base64Data = n.data.fileContent.split(',')[1];
          const mimeString = n.data.fileContent.split(',')[0].split(':')[1].split(';')[0];
          const byteString = atob(base64Data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: mimeString });
          formData.append(n.id, blob, n.data.fileName);
        }
      });

      await API.post(`/chatbots/${botId}/save_graph/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Graph saved successfully!');
      loadGraph();
    } catch (err) {
      console.error('Save error:', err);
      alert('Save error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadGraph = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/chatbots/${botId}/`);

      const nds = data.nodes.map((n) => {
        const frontendNodeType = {
          greeting: 'greeting',
          user_input: 'user_input',
          message: 'message',
          image: 'image',
          file_upload: 'file',
          branch: 'branch',
          end: 'end',
        }[n.node_type] || n.node_type;

        const fileContent = n.image || n.file || null;

        return {
          id: String(n.id),
          position: { x: n.x, y: n.y },
          data: {
            label: n.label || `${n.node_type} ${n.id}`,
            content: n.content || '',
            nodeType: frontendNodeType,
            fileName: n.file_name || null,
            fileType: n.file_type || null,
            fileContent,
            width: n.width || (frontendNodeType === 'image' ? 200 : null),
            height: n.height || (frontendNodeType === 'image' ? 150 : null),
          },
          type: 'default',
          _ntype: n.node_type,
          style: {
      backgroundColor: '#0a0a0aff',
      border: '1px solid #faf3f3ff',
      borderRadius: '9px',
      color: '#fae100ff',
    },
        };
      });

      const eds = data.connections.map((c, idx) => ({
        id: `edge-${idx}`,
        source: String(c.from_node),
        target: String(c.to_node),
        label: c.condition_value || '+',
      }));

      setNodes(nds);
      setEdges(eds);
      idCounter = Math.max(1, ...nds.map((n) => Number(n.id)));
      setSelected(null);
      setOriginalSelected(null);
      setEditModalOpen(false);
    } catch (err) {
      console.error('Load error:', err);
      alert('Load error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const runBot = () => window.open(`/chat/${botId}`, '_blank');

  useEffect(() => {
    loadGraph();
  }, [botId]);

  return (
    <>
      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <div className={styles.contextMenu} style={{ top: contextMenu.top, left: contextMenu.left }}>
          <div className={`${styles.contextMenuItem} ${styles.deleteOption}`} onClick={() => {
            if (window.confirm(`Delete node "${nodes.find((n) => n.id === contextMenu.id)?.data.label}"?`)) deleteNode(contextMenu.id);
          }}>Delete Node</div>
        </div>
      )}
      
      {/* Edit modal */}
      {editModalOpen && selected && (
        <div className={styles.overlay} onClick={() => setEditModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Node Properties</h3>
              <button onClick={() => setEditModalOpen(false)} className={styles.closeButton}>✕</button>
            </div>
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label className={styles.label}>Label</label>
              <input value={selected.data.label} onChange={(e) => updateSelected('label', e.target.value)} className={styles.input} />
              <label className={styles.label}>Content</label>
              <ReactQuill theme="snow" value={selected.data.content} onChange={(v) => updateSelected('content', v)} className={styles.quillEditor} />

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
                <button onClick={saveNodeChanges} className={`${styles.actionButton} ${styles.saveBtn}`}>Save</button>
                <button onClick={cancelNodeChanges} className={`${styles.actionButton} ${styles.cancelBtn}`}>Cancel</button>
                <button onClick={() => { if (window.confirm(`Delete node "${selected.data.label}"?`)) deleteNode(selected.id); }} className={`${styles.actionButton} ${styles.deleteBtn}`}>Delete</button>
              </div>
            </section>
          </div>
        </div>
      )}
      
      {/* Main container */}
      <div className={styles.container} ref={flowWrapperRef}>
        {/* Test Bot button at top center */}
        <div className={styles.topCenterControls}>
          <button 
            onClick={runBot} 
            className={styles.testBotButton}
            title="Test your chatbot in a new window"
          >
            Test Bot
          </button>
          <button onClick={saveGraph} disabled={loading} className={styles.saveButton}>Save</button>
          <button onClick={loadGraph} disabled={loading} className={styles.reloadButton}>Reload</button>
        </div>
        
        {/* Toggle buttons */}
        <div className={styles.toggleButtons} style={{ left: !isMobile && sidebarOpen ? 280 : 10 }}>
          <button className={styles.toggleSidebarButton} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? (isMobile ? '✕' : '◀') : (isMobile ? '☰' : '▶')}
          </button>
        </div>
        
        {/* Sidebar */}
        <aside className={styles.sidebar} style={{ width: sidebarOpen ? 280 : 0 }}>
          <h2 className={styles.sidebarTitle}>Chatbot Builder</h2>
          <NodeSidebar addNode={addNode} />
         
        </aside>
        
        {/* Canvas */}
        <main className={styles.canvasWrapper} style={{ marginLeft: !isMobile && sidebarOpen ? 10 : 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeDoubleClick={onEdgeDoubleClick}
            connectionLineStyle={{ stroke: '#f70404ff', strokeWidth: 2 }}
            connectionLineType="smoothstep"
            fitView
            style={{ width: '100%', height: '100%' }}
          >
            <Background color="#031bf1ff" gap={20} variant="dots" size={2.5} />
            <Controls />
          </ReactFlow>
        </main>
      </div>
    </>
  );
}