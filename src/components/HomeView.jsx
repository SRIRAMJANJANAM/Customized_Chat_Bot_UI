import React from 'react';
import styles from './Builder.module.css';

export default function HomeView({ onNavigate }) {
  const openBuilder = () => onNavigate('builder');
  const openChatHistory = () => onNavigate('chat');
  const openAnalytics = () => onNavigate('analytics');
  const openFaqManagement = () => onNavigate('faq');
  const openWebsiteIntegration = () => onNavigate('integration');

  return (
    <div className={styles.homeView}>
      <h2>Dashboard Overview</h2>
      <div className={styles.quickLinks}>
        {/* Main Large Card */}
        <div className={styles.quickLinkCard} onClick={openBuilder}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </div>
          <h3>Bot Builder</h3>
          <p>Design and build your chatbot conversation flows with our intuitive visual editor. Create complex workflows with drag-and-drop simplicity.</p>
          <div className={styles.cardCta}>
            Start Building <span>→</span>
          </div>
        </div>
        
        {/* Chat History */}
        <div className={styles.quickLinkCard} onClick={openChatHistory}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
          </div>
          <h3>Chat History</h3>
          <p>Review conversations and analyze user interactions with your chatbot</p>
          <div className={styles.cardCta}>
            View History <span>→</span>
          </div>
        </div>

        {/* Analytics */}
        <div className={styles.quickLinkCard} onClick={openAnalytics}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 22V8h4v14H3zm7 0V2h4v20h-4zm7 0v-8h4v8h-4z"/>
            </svg>
          </div>
          <h3>Analytics</h3>
          <p>Monitor performance metrics and track engagement across all channels</p>
          <div className={styles.cardCta}>
            View Analytics <span>→</span>
          </div>
        </div>

        {/* FAQ Management */}
        <div className={styles.quickLinkCard} onClick={openFaqManagement}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </div>
          <h3>FAQ Management</h3>
          <p>Manage frequently asked questions and knowledge base content</p>
          <div className={styles.cardCta}>
            Manage FAQs <span>→</span>
          </div>
        </div>

        {/* Website Integration */}
        <div className={styles.quickLinkCard} onClick={openWebsiteIntegration}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </div>
          <h3>Website Integration</h3>
          <p>Integrate chatbot with your website and configure deployment settings</p>
          <div className={styles.cardCta}>
            Configure <span>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}