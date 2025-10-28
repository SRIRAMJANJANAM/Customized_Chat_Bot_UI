import React, { useState } from 'react';
import styles from './Builder.module.css';

const WebsiteIntegrationView = ({ botId }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('chat');

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

  return (
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
  );
};

export default WebsiteIntegrationView;