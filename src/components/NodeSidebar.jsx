import React from 'react';

export default function NodeSidebar({ addNode }) {
  const items = [
    { type: 'greeting', label: 'Greeting' },
    { type: 'user_input', label: 'User Input' },
    { type: 'message', label: 'Message' },
    { type: 'image', label: 'Image' },
    { type: 'file', label: 'File Upload' },
    { type: 'branch', label: 'Branch' },
    { type: 'end', label: 'End' },
  ];

  return (
    <div style={styles.sidebar}>
      <h3 style={styles.heading}>Nodes</h3>
      <div style={styles.buttonContainer}>
        {items.map((n) => (
          <button
            key={n.type}
            onClick={() => addNode(n.type)}
            style={styles.nodeButton}
            title={`Add ${n.label} node`}
          >
            ➕ {n.label}
          </button>
        ))}
      </div>
      <p style={styles.hint}>
        📌 <strong>Hint:</strong> Select a node to edit its label or content.<br />
        🔁 Double-click an edge to set a branch condition.<br />
        🖼️ Use <strong>Image</strong> nodes to show pictures.<br />
        📂 Use <strong>File Upload</strong> nodes to request user uploads.
      </p>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    padding: '20px',
    background: '#0004eeff',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
  },
  heading: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  nodeButton: {
    padding: '10px',
    backgroundColor: '#ffffffff',
    border: '1px solid #ccc',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    transition: 'all 0.2s',
    fontWeight: 'bolder',
    color:'black',
  },
  hint: {
    fontSize: '13px',
    color: '#d9ff00ff',
    marginTop: 'auto',
    lineHeight: '1.5',
  },
};
