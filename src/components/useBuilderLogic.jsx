import { useCallback, useState } from 'react';
import { addEdge, useEdgesState, useNodesState } from 'reactflow';
import { API } from '../api';

export const useBuilderLogic = (botId, searchParams, setSearchParams, genId) => {
  // State management
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
  const [pathMenuOpen, setPathMenuOpen] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editingPath, setEditingPath] = useState(null);
  const [editPathName, setEditPathName] = useState('');
  const [editPathDescription, setEditPathDescription] = useState('');

  // Data conversion
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
          height: 'auto',
          textAlign: "center",
          fontSize: '1vw',
          fontFamily: "Georgia', serif",
          padding: '0.3vw',
          color: isPath ? '#ffe600ff' : '#00fa36ff',
          transition: 'transform 0.1s ease',
          willChange: 'transform',
          overflow:'visible'
        },
      };
    });

    const eds = data.connections.map((c, idx) => ({
      id: `edge-${idx}`,
      source: String(c.from_node),
      target: String(c.to_node),
      label: c.condition_value || '+',
      style: {
        stroke: '#bbff4dff',   
        strokeWidth: 2,       
      },  
      markerEnd: { type: 'arrowclosed', color: '#ff0000ff',width:'20',height:'20  ' }
    }));

    return { nds, eds };
  };

  // Data loading
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
      window.idCounter = maxId;
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

      const maxId = nds
      .map(n => parseInt(n.id, 10))
      .filter(num => !isNaN(num))
      .reduce((max, curr) => (curr > max ? curr : max), window.idCounter);
      window.idCounter = maxId;
      
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

  const loadPaths = async () => {
    try {
      const { data } = await API.get(`/paths/?chatbot=${botId}`);
      const mainPath = {
        id: 'main',
        name: 'Main Flow',
        is_main: true
      };
      setPaths([mainPath, ...data]);
      setFilteredPaths([mainPath, ...data]);
    } catch (err) {
      console.error('Error loading paths:', err);
    }
  };

  // Node operations
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
            style: { stroke: '#fffb00ff' },
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

  // Path operations
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

  const renamePath = async (pathId, newName, newDescription) => {
    if (!newName.trim()) {
      alert('Please enter a path name');
      return;
    }
    try {
      await API.patch(`/paths/${pathId}/`, {
        name: newName,
        description: newDescription
      });
      setPaths(paths.map(p => p.id === pathId ? { ...p, name: newName, description: newDescription } : p));
      if (activePath && activePath.id === pathId) {
        setActivePath({ ...activePath, name: newName, description: newDescription });
      }
      setRenameModalOpen(false);
      setEditingPath(null);
      setEditPathName('');
      setEditPathDescription('');
    } catch (err) {
      console.error('Error renaming path:', err);
      alert('Error renaming path: ' + (err.response?.data?.message || err.message));
    }
  };

  const openRenameModal = (path, e) => {
    e.stopPropagation();
    setEditingPath(path);
    setEditPathName(path.name);
    setEditPathDescription(path.description || '');
    setRenameModalOpen(true);
    setPathMenuOpen(null);
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
    if (path.is_main) {
      closePathBuilder();
    } else {
      setSearchParams({ pathId: path.id, pathName: path.name });
    }
  };

  const closePathBuilder = () => {
    setSearchParams({});
    setActivePath(null);
    setPathNodes([]);
    setPathEdges([]);
    loadMainGraph();
  };

  // Save operations
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

  // Return all state and methods
  return {
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
  };
};