import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { Background, Controls, addEdge, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { API } from '../api';
import NodeSidebar from './NodeSidebar';
import EditPropertiesModal from './EditPropertiesModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Builder.module.css';

let idCounter = 1;
const genId = () => String(++idCounter);

export default function Builder({ botId }) {
  const [mainNodes, setMainNodes, onMainNodesChange] = useNodesState([]);
  const [mainEdges, setMainEdges, onMainEdgesChange] = useEdgesState([]);
  const [pathNodes, setPathNodes, onPathNodesChange] = useNodesState([]);
  const [pathEdges, setPathEdges, onPathEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState(null);
  const [originalSelected, setOriginalSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [addNodePopupOpen, setAddNodePopupOpen] = useState(false);
  const [paths, setPaths] = useState([]);
  const [filteredPaths, setFilteredPaths] = useState([]);
  const [pathPanelOpen, setPathPanelOpen] = useState(true);
  const [createPathModalOpen, setCreatePathModalOpen] = useState(false);
  const [newPathName, setNewPathName] = useState('');
  const [newPathDescription, setNewPathDescription] = useState('');
  const [activePath, setActivePath] = useState(null);
  const [pathSearchTerm, setPathSearchTerm] = useState('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const flowWrapperRef = useRef(null);

  // Filter paths based on search term
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

  const convertToFlowFormat = (data, isPath = false) => {
    const nds = data.nodes.map((n) => {
      const frontendNodeType = {
        greeting: 'greeting',
        user_input: 'user_input',
        message: 'message',
        message_with_options: 'message_with_options',
        image: 'image',
        file_upload: 'file',
        branch: 'branch',
        end: 'end',
        trigger_path: 'trigger_path',
        google_sheet: 'google_sheet',
      }[n.node_type] || n.node_type;

      let label = isPath
        ? n.label || `${n.node_type} ${n.id}`
        : (n.node_type === 'trigger_path'
            ? `Trigger Path: ${n.triggered_path?.name || 'None'}`
            : n.label || `${n.node_type} ${n.id}`);

      if (n.node_type === 'message_with_options') {
        if (n.options && n.options.length > 0) {
          label = `Options: ${n.options.join(', ')}`;
        } else {
          label = 'Message with Options (no options set)';
        }
      }

      if (n.node_type === 'google_sheet') {
        label = n.google_sheet_url ? `Google Sheet: ${n.google_sheet_url.substring(0, 30)}...` : 'Send to Google Sheet';
      }

      return {
        id: String(n.id),
        position: { x: n.x, y: n.y },
        data: {
          label: label,
          content: n.content || '',
          nodeType: frontendNodeType,
          fileName: n.fileName || null,
          fileType: n.fileType || null,
          fileContent: n.fileContent || n.image || n.file || null,
          width: n.width || (frontendNodeType === 'image' ? 200 : null),
          height: n.height || (frontendNodeType === 'image' ? 150 : null),
          triggeredPath: n.triggered_path || null,
          options: n.options || [],
          optionsDisplayStyle: n.options_display_style || 'dropdown',
          googleSheetUrl: n.google_sheet_url || null,
          googleSheetName: n.google_sheet_name || null,
          googleSheetHeaders: n.google_sheet_headers || null,
          googleSheetDataMapping: n.google_sheet_data_mapping || null,
        },
        type: 'default',
        _ntype: n.node_type,
        pathId: isPath ? data.id : null,
        style: {
          backgroundColor: isPath ? '#1a1a1a' : '#0a0a0aff',
          border: isPath ? '0.1vw solid #ff0000ff' : '0.1vw solid #faf3f3ff',
          borderRadius: '0.9vw',
          width: '10%',
          height: '5%',
          textAlign: "center",
          fontSize: '1vw',
          fontFamily: "Georgia', serif",
          padding: '0.3vw',
          color: isPath ? '#ffe600ff' : '#00fa36ff',
          transition: 'transform 0.1s ease',
          willChange: 'transform',
          overflow:'hidden'
        },
      };
    });

    const eds = data.connections.map((c, idx) => ({
      id: `edge-${idx}`,
      source: String(c.from_node),
      target: String(c.to_node),
      label: c.condition_value || '+',
    }));

    return { nds, eds };
  };

  const loadMainGraph = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/chatbots/${botId}/`);
      const mainFlowData = {
        ...data,
        nodes: data.nodes.filter(node => !node.path)
      };

      const { nds, eds } = convertToFlowFormat(mainFlowData, false);
      setMainNodes(nds);
      setMainEdges(eds);

      const maxId = nds
        .map(n => parseInt(n.id, 10))
        .filter(num => !isNaN(num))
        .reduce((max, curr) => (curr > max ? curr : max), 1);
      idCounter = maxId;
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

  const loadPathGraph = async (pathId) => {
    setLoading(true);
    try {
      const { data } = await API.get(`/paths/${pathId}/graph/`);
      const { nds, eds } = convertToFlowFormat(data, true);
      setPathNodes(nds);
      setPathEdges(eds);
      const pathInfo = paths.find(p => p.id == pathId);
      if (pathInfo) {
        setActivePath(pathInfo);
      } else {
        const { data: pathData } = await API.get(`/paths/${pathId}/`);
        setActivePath(pathData);
      }
    } catch (err) {
      console.error('Error loading path graph:', err);
      alert('Error loading path: ' + (err.response?.data?.message || err.message));
      setPathNodes([]);
      setPathEdges([]);
      setSearchParams({});
    } finally {
      setLoading(false);
    }
  };

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

  const onConnect = useCallback(
    (params) => {
      const currentEdges = activePath ? pathEdges : mainEdges;
      const setCurrentEdges = activePath ? setPathEdges : setMainEdges;
      const currentNodes = activePath ? pathNodes : mainNodes;
      const targetNode = currentNodes.find(n => n.id === params.target);
      if (targetNode && targetNode._ntype === 'trigger_path') {
        if (!targetNode.data.triggeredPath || !targetNode.data.triggeredPath.id) {
          window.alert('Cannot connect to this trigger_path node until you select which path it triggers.');
          return;
        }
      }
      setCurrentEdges((eds) =>
        addEdge(
          {
            ...params,
            label: '+',
            style: { stroke: '#4f46e5' },
            markerEnd: { type: 'arrowclosed' },
          },
          eds
        )
      );
    },
    [activePath, pathEdges, mainEdges, setPathEdges, setMainEdges, pathNodes, mainNodes]
  );

  const addNode = (type) => {
    const id = genId();
    const backendNodeType = {
      greeting: 'greeting',
      user_input: 'user_input',
      message: 'message',
      message_with_options: 'message_with_options',
      image: 'image',
      file: 'file_upload',
      branch: 'branch',
      end: 'end',
      trigger_path: 'trigger_path',
      google_sheet: 'google_sheet',
    }[type] || type;

    const triggeredPath = activePath ? null : null;

    const defaultContent = {
      greeting: 'Welcome! What topic do you need help with?',
      user_input: 'Type your answer…',
      message: 'Here is some information…',
      message_with_options: 'Please select an option:',
      branch: '',
      end: 'Goodbye!',
      image: '',
      file: '',
      trigger_path: 'Select a path to trigger...',
      google_sheet: 'User input data will be sent to Google Sheet',
    }[type] || '';

    const defaultWidth = type === 'image' ? 200 : null;
    const defaultHeight = type === 'image' ? 150 : null;
    const currentNodes = activePath ? pathNodes : mainNodes;
    const isFirstNode = currentNodes.length === 0;
    const position = isFirstNode
      ? { x: window.innerWidth / 2 - 100, y: 100 }
      : { x: 120 + Math.random() * 320, y: 80 + Math.random() * 280 };

    const newNode = {
      id,
      type: 'default',
      position,
      data: {
        label: type === 'trigger_path'
          ? 'Trigger: None'
          : type === 'message_with_options'
            ? 'Message with Options'
            : type === 'google_sheet'
            ? 'Send to Google Sheet'
            : `${type} ${id}`,
        content: defaultContent,
        nodeType: type,
        fileName: null,
        fileType: null,
        fileContent: null,
        width: defaultWidth,
        height: defaultHeight,
        triggeredPath: triggeredPath,
        options: type === 'message_with_options' ? ['Option 1', 'Option 2'] : [],
        optionsDisplayStyle: type === 'message_with_options' ? 'dropdown' : null,
        googleSheetUrl: null,
        googleSheetName: null,
        googleSheetHeaders: null,
        googleSheetDataMapping: null,
      },
      _ntype: backendNodeType,
      pathId: activePath ? activePath.id : null,
      style: {
        backgroundColor: '#050505ff',
        border: '2px solid #000000',
        borderRadius: '8px',
        color: '#f4f800ff',
        transition: 'transform 0.1s ease',
        willChange: 'transform',
      },
    };
    if (activePath) {
      setPathNodes((nds) => nds.concat(newNode));
    } else {
      setMainNodes((nds) => nds.concat(newNode));
    }
  };

  const onNodeClick = (_, node) => {
    setOriginalSelected(JSON.parse(JSON.stringify(node)));
    setSelected(node);
    setEditModalOpen(true);
    if (node._ntype === 'trigger_path' && node.data.triggeredPath) {
      if (window.confirm(`Go to path "${node.data.triggeredPath.name}"?`)) {
        openPathBuilder(node.data.triggeredPath);
      }
    }
  };

  const onNodeDoubleClick = (_, node) => {
    if (window.confirm(`Delete node "${node.data.label}"?`)) deleteNode(node.id);
  };

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ id: node.id, top: event.clientY, left: event.clientX });
  }, []);

  const deleteNode = (nodeId) => {
    if (activePath) {
      setPathNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setPathEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    } else {
      setMainNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setMainEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    }
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

  const saveNodeChanges = async () => {
    if (!selected) return;
    if (activePath) {
      updateSelected('triggeredPath', null);
    }
    if (!activePath && selected._ntype === 'trigger_path' && !selected.id.startsWith('new-')) {
      try {
        await API.patch(`nodes/${selected.id}/update_triggered_path/`, {
          triggered_path_id: selected.data.triggeredPath?.id || null
        });
      } catch (err) {
        console.error('Error updating node path:', err);
        alert('Error updating node: ' + (err.response?.data?.message || err.message));
        return;
      }
    }
    if (activePath) {
      setPathNodes((nds) =>
        nds.map((n) =>
          n.id === selected.id
            ? { ...n, data: { ...selected.data } }
            : n
        )
      );
    } else {
      setMainNodes((nds) =>
        nds.map((n) =>
          n.id === selected.id
            ? { ...n, data: { ...selected.data } }
            : n
        )
      );
    }
    setSelected(null);
    setOriginalSelected(null);
    setEditModalOpen(false);
  };

  const cancelNodeChanges = () => {
    if (!originalSelected) {
      setEditModalOpen(false);
      return;
    }
    if (activePath) {
      setPathNodes((nds) =>
        nds.map((n) =>
          n.id === originalSelected.id ? { ...originalSelected } : n
        )
      );
    } else {
      setMainNodes((nds) =>
        nds.map((n) =>
          n.id === originalSelected.id ? { ...originalSelected } : n
        )
      );
    }
    setSelected(null);
    setOriginalSelected(null);
    setEditModalOpen(false);
  };

  const onEdgeDoubleClick = (_, edge) => {
    const action = prompt('Edit edge label (e.g. "yes", "no", "+")', edge.label || '');
    if (action === null) return;
    if (activePath) {
      if (action === '-') {
        setPathEdges((eds) => eds.filter((e) => e.id !== edge.id));
      } else {
        setPathEdges((eds) =>
          eds.map((e) =>
            e.id === edge.id ? { ...e, label: action || '+' } : e
          )
        );
      }
    } else {
      if (action === '-') {
        setMainEdges((eds) => eds.filter((e) => e.id !== edge.id));
      } else {
        setMainEdges((eds) =>
          eds.map((e) =>
            e.id === edge.id ? { ...e, label: action || '+' } : e
          )
        );
      }
    }
  };

  const loadPaths = async () => {
    try {
      const { data } = await API.get(`/paths/?chatbot=${botId}`);
      setPaths(data);
      setFilteredPaths(data);
    } catch (err) {
      console.error('Error loading paths:', err);
    }
  };

  const createPath = async () => {
    if (!newPathName.trim()) {
      alert('Please enter a path name');
      return;
    }
    try {
      const { data } = await API.post(`/paths/`, {
        name: newPathName,
        description: newPathDescription,
        chatbot: botId
      });
      setPaths([...paths, data]);
      setNewPathName('');
      setNewPathDescription('');
      setCreatePathModalOpen(false);
    } catch (err) {
      console.error('Error creating path:', err);
      alert('Error creating path: ' + (err.response?.data?.message || err.message));
    }
  };

  const deletePath = async (pathId) => {
    if (!window.confirm('Are you sure you want to delete this path?')) return;
    try {
      await API.delete(`/paths/${pathId}/`);
      setPaths(paths.filter(p => p.id !== pathId));
      if (activePath && activePath.id === pathId) {
        setActivePath(null);
        setPathNodes([]);
        setPathEdges([]);
        setSearchParams({});
      }
    } catch (err) {
      console.error('Error deleting path:', err);
      alert('Error deleting path: ' + (err.response?.data?.message || err.message));
    }
  };

  const setPathStartNode = async (pathId, nodeId) => {
    try {
      await API.patch(`/paths/${pathId}/`, {
        start_node: nodeId
      });
      setPaths(paths.map(p => p.id === pathId ? { ...p, start_node: nodeId } : p));
      alert('Start node set successfully!');
    } catch (err) {
      console.error('Error setting start node:', err);
      alert('Error setting start node: ' + (err.response?.data?.message || err.message));
    }
  };

  const openPathBuilder = (path) => {
    setSearchParams({ pathId: path.id, pathName: path.name });
  };

  const closePathBuilder = () => {
    setSearchParams({});
    setActivePath(null);
    setPathNodes([]);
    setPathEdges([]);
    loadMainGraph();
  };

  const savePathGraph = async () => {
    if (!activePath) return;
    setLoading(true);
    try {
      const formData = new FormData();

      const pathFlowNodes = pathNodes.filter(
        (node) => node.pathId === activePath.id
      );

      formData.append(
        'nodes',
        JSON.stringify(
          pathNodes.map((n) => ({
            id: n.id,
            _ntype: n._ntype,
            position: n.position,
            triggered_path_id: n._ntype === 'trigger_path' ? n.data.triggeredPath?.id || null : null,
            data: {
              label: n.data.label,
              content: n.data.content,
              width: n.data.width,
              height: n.data.height,
              fileName: n.data.fileName,
              fileType: n.data.fileType,
              fileContent: n.data.fileContent,
              options: n.data.options || [],
              options_display_style: n.data.optionsDisplayStyle || 'dropdown',
              google_sheet_url: n.data.googleSheetUrl || null,
              google_sheet_name: n.data.googleSheetName || null,
              google_sheet_headers: n.data.googleSheetHeaders || null,
              google_sheet_data_mapping: n.data.googleSheetDataMapping || null,
            },
          }))
        )
      );

      formData.append(
        'edges',
        JSON.stringify(
          pathEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label || '+',
          }))
        )
      );
      pathNodes.forEach((n) => {
        if (
          (n._ntype === 'image' || n._ntype === 'file_upload') &&
          n.data.fileContent?.startsWith('data:')
        ) {
          try {
            const base64Data = n.data.fileContent.split(',')[1];
            const mimeString = n.data.fileContent.split(',')[0].split(':')[1].split(';')[0];
            const byteString = atob(base64Data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mimeString });
            formData.append(n.id, blob, n.data.fileName);
          } catch (error) {
            console.error('Error processing file for node', n.id, error);
          }
        }
      });

      const response = await API.post(`/paths/${activePath.id}/save_graph/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Save response:', response.data);
      alert('Path saved successfully!');
    } catch (err) {
      console.error('Save path error:', err);
      console.error('Error response:', err.response);
      alert('Save path error: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const saveGraph = async () => {
    if (activePath) {
      await savePathGraph();
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const mainFlowNodes = mainNodes.filter(node => !node.pathId);

      formData.append(
        'nodes',
        JSON.stringify(
          mainFlowNodes.map((n) => ({
            id: n.id,
            _ntype: n._ntype,
            position: n.position,
            triggered_path_id: n._ntype === 'trigger_path' ? n.data.triggeredPath?.id || null : null,
            data: {
              label: n.data.label,
              content: n.data.content,
              width: n.data.width,
              height: n.data.height,
              fileName: n.data.fileName,
              fileType: n.data.fileType,
              fileContent: n.data.fileContent,
              options: n.data.options || [],
              options_display_style: n.data.optionsDisplayStyle || 'dropdown',
              google_sheet_url: n.data.googleSheetUrl || null,
              google_sheet_name: n.data.googleSheetName || null,
              google_sheet_headers: n.data.googleSheetHeaders || null,
              google_sheet_data_mapping: n.data.googleSheetDataMapping || null,
            },
          }))
        )
      );

      formData.append(
        'edges',
        JSON.stringify(
          mainEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label || '+',
          }))
        )
      );

      await API.post(`/chatbots/${botId}/save_graph/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Graph saved successfully!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Save error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

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
                  <div key={path.id} className={styles.pathItem}>
                    <div className={styles.pathInfo}>
                      <h4>{path.name}</h4>
                      {path.description && <p>{path.description}</p>}
                      <div className={styles.pathActions}>
                        <button
                          onClick={() => openPathBuilder(path)}
                          className={styles.editPathButton}
                        >
                          {activePath && activePath.id === path.id ? 'Editing...' : 'Edit Flow'}
                        </button>
                        <button
                          onClick={() => deletePath(path.id)}
                          className={styles.deletePathButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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