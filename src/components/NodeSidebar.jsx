import React, { useState } from 'react';

export default function NodeSidebar({ addNode }) {
  const [searchTerm, setSearchTerm] = useState('');

  const ColoredMenuIcon = (
    <svg
      width="24"
      height="24"
      viewBox="0 0 100 80"
      fill="#2196F3"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="15" rx="8"></rect>
      <rect y="30" width="100" height="15" rx="8"></rect>
      <rect y="60" width="100" height="15" rx="8"></rect>
    </svg>
  );

  const items = [
    { type: 'greeting', label: 'Greeting', icon: '👋' },
    { type: 'user_input', label: 'User Input', icon: ' ⌨️' },
    { type: 'message', label: 'Message', icon: '💬' },
    { type: 'message_with_options', label: 'Message with Options', icon: ColoredMenuIcon },
    { type: 'image', label: 'Image', icon: '📷' },
    { type: 'file', label: 'File Upload', icon: '📁' },
    { type: 'branch', label: 'Branch', icon: '🔀' },
    { type: 'end', label: 'End', icon: '⏹️' },
    { type: 'trigger_path', label: 'Trigger Path', icon: '⚡' },
  ];

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.sidebar}>
      <h3 style={styles.heading}>Nodes</h3>
      
      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            style={styles.clearButton}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div style={styles.gridContainer}>
        {filteredItems.length > 0 ? (
          filteredItems.map((n) => (
            <div
              key={n.type}
              style={styles.nodeBox}
              onClick={() => addNode(n.type)}
              title={`Add ${n.label} node`}
            >
              <div style={styles.icon}>{n.icon}</div>
              <div style={styles.label}>{n.label}</div>
            </div>
          ))
        ) : (
          <div style={styles.noResults}>
            No nodes found for "{searchTerm}"
          </div>
        )}
      </div>
      
      <p style={styles.hint}>
        📌 <strong>Hint:</strong> Select a node to edit its label or content.<br />
        🔁 Double-click an edge to set a branch condition.<br />
        🖼️ Use <strong>Image</strong> nodes to show pictures.<br />
        📂 Use <strong>File Upload</strong> nodes to request user uploads.<br />
        📋 Use <strong>Message with Options</strong> to show buttons for user selection.<br />
        🛣️ Use <strong>Trigger Path</strong> nodes to execute specific conversation paths.
      </p>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '760px',
    padding: '20px',
    background: '#230c58ff',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    borderRadius: '2vw',
  },
  heading: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffffff',
    textAlign: 'center',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 15px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease',
  },
  searchInputFocus: {
    borderColor: '#2196F3',
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#999',
    padding: '5px',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '10px',
  },
  nodeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '15px 10px',
    backgroundColor: '#ffffffff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    minHeight: '80px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  icon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#333',
    lineHeight: '1.2',
    wordWrap: 'break-word',
    maxWidth: '100%',
  },
  noResults: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '20px',
    color: '#ffffffff',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  hint: {
    fontSize: '13px',
    color: '#d9ff00ff',
    marginTop: 'auto',
    lineHeight: '1.5',
    padding: '10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
  },
};