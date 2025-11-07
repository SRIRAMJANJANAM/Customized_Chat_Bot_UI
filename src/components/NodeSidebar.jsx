import React, { useState } from 'react';

export default function NodeSidebar({ addNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

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

  const nodeCategories = [
    {
      name: 'Display & Information',
      description: 'Nodes that show content to users',
      color: '#4CAF50',
      items: [
        { type: 'greeting', label: 'Greeting', icon: '👋', description: 'Welcome message' },
        { type: 'message', label: 'Message', icon: '💬', description: 'Send text message' },
        { type: 'image', label: 'Image', icon: '📷', description: 'Display image' },
        { type: 'end', label: 'End', icon: '⏹️', description: 'End conversation' },
      ]
    },
    {
      name: 'User Input & Interaction',
      description: 'Nodes that collect user input',
      color: '#2196F3',
      items: [
        { type: 'user_input', label: 'User Input', icon: '⌨️', description: 'Collect text input' },
        { type: 'message_with_options', label: 'Message with Options', icon: ColoredMenuIcon, description: 'Buttons/menu for selection' },
        { type: 'file', label: 'File Upload', icon: '📁', description: 'Request file upload' },
      ]
    },
    {
      name: 'Process Flow & Logic',
      description: 'Nodes that control conversation flow',
      color: '#FF9800',
      items: [
        { type: 'branch', label: 'Branch', icon: '🔀', description: 'Conditional logic' },
        { type: 'trigger_path', label: 'Trigger Path', icon: '⚡', description: 'Execute sub-path' },
      ]
    },
    {
      name: 'Integrations & External',
      description: 'Nodes that connect to external services',
      color: '#9C27B0',
      items: [
        { type: 'google_sheet', label: 'Send to Google Sheet', icon: '📗', description: 'Save data to Google Sheets' },
        { type: 'api_call', label: 'API Call', icon: '🔗', description: 'Make HTTP API requests' },
      ]
    },
    {
      name: 'Communication',
      description: 'Nodes for sending messages and notifications',
      color: '#FF5722',
      items: [
        { type: 'send_email', label: 'Send Email', icon: '📧', description: 'Send emails to users' },
      ]
    }
  ];
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  const expandAll = () => {
    const allExpanded = {};
    nodeCategories.forEach(category => {
      allExpanded[category.name] = true;
    });
    setExpandedCategories(allExpanded);
  };
  const collapseAll = () => {
    setExpandedCategories({});
  };
  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const allItems = nodeCategories.flatMap(category => category.items);
  const filteredAllItems = allItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  React.useEffect(() => {
    if (searchTerm) {
      const expanded = {};
      filteredCategories.forEach(category => {
        expanded[category.name] = true;
      });
      setExpandedCategories(expanded);
    }
  }, [searchTerm]);

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

      {/* Expand/Collapse */}
      {!searchTerm && (
        <div style={styles.controls}>
          <button onClick={expandAll} style={styles.controlButton}>
            Expand All
          </button>
          <button onClick={collapseAll} style={styles.controlButton}>
            Collapse All
          </button>
        </div>
      )}

      <div style={styles.gridContainer}>
        {searchTerm ? (
          filteredAllItems.length > 0 ? (
            filteredAllItems.map((n) => (
              <div
                key={n.type}
                style={styles.nodeBox}
                onClick={() => addNode(n.type)}
                title={`Add ${n.label} node`}
              >
                <div style={styles.icon}>{n.icon}</div>
                <div style={styles.label}>{n.label}</div>
                <div style={styles.description}>{n.description}</div>
              </div>
            ))
          ) : (
            <div style={styles.noResults}>
              No nodes found for "{searchTerm}"
            </div>
          )
        ) : (
          filteredCategories.map((category, index) => (
            <div key={category.name} style={styles.categorySection}>
              <div 
                style={{
                  ...styles.categoryHeader,
                  borderLeft: `4px solid ${category.color}`
                }}
                onClick={() => toggleCategory(category.name)}
              >
                <div style={styles.categoryHeaderContent}>
                  <div>
                    <h4 style={styles.categoryName}>{category.name}</h4>
                    <p style={styles.categoryDescription}>{category.description}</p>
                  </div>
                  <div style={styles.expandIcon}>
                    {expandedCategories[category.name] ? '▴' : '▿'}
                  </div>
                </div>
              </div>
              
              {expandedCategories[category.name] && (
                <>
                  <div style={styles.categoryGrid}>
                    {category.items.map((n) => (
                      <div
                        key={n.type}
                        style={styles.nodeBox}
                        onClick={() => addNode(n.type)}
                        title={`Add ${n.label} node: ${n.description}`}
                      >
                        <div style={styles.icon}>{n.icon}</div>
                        <div style={styles.label}>{n.label}</div>
                        <div style={styles.description}>{n.description}</div>
                      </div>
                    ))}
                  </div>
                  {index < filteredCategories.length - 1 && (
                    <div style={styles.categoryDivider} />
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
      
      <p style={styles.hint}>
        ❗ <strong>Hint:</strong> Select a node to edit its label or content.<br />
        🔁 Double-click an edge to set a branch condition.<br />
        🖼️ Use <strong>Image</strong> nodes to show pictures to users.<br />
        📂 Use <strong>File Upload</strong> nodes to request user uploads.<br />
        📋 Use <strong>Message with Options</strong> to show buttons for user selection.<br />
        ⚡ Use <strong>Trigger Path</strong> nodes to execute specific flow paths.
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
    maxHeight: '80vh',
    overflowY: 'auto',
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
  controls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
    justifyContent: 'center',
  },
  controlButton: {
    padding: '6px 12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '20px',
  },
  categorySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryHeader: {
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  categoryHeaderContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffffff',
  },
  categoryDescription: {
    margin: '0',
    fontSize: '12px',
    color: '#cccccc',
    fontStyle: 'italic',
  },
  expandIcon: {
    color: '#ffffffff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '0 10px',
    animation: 'fadeIn 0.3s ease',
  },
  categoryDivider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '10px 0',
  },
  nodeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '15px 8px',
    backgroundColor: '#ffffffff',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    minHeight: '90px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  icon: {
    fontSize: '20px',
    marginBottom: '6px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#333',
    lineHeight: '1.2',
    marginBottom: '4px',
  },
  description: {
    fontSize: '9px',
    color: '#666',
    lineHeight: '1.2',
    fontStyle: 'italic',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#ffffffff',
    fontSize: '14px',
    fontStyle: 'italic',
    gridColumn: '1 / -1',
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