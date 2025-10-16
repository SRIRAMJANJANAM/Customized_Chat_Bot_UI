import React, { useState, useEffect, useRef } from 'react';
import { API } from '../api';
import styles from './Builder.module.css';

const AnalyticsView = ({ botId }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, item: null, position: { x: 0, y: 0 } });
  const chartAreaRef = useRef(null);

  const selectedDate = new Date().toISOString().split('T')[0];

  const getExactTimeFromTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown Time';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('Error parsing timestamp:', err);
      return 'Invalid Time';
    }
  };

  const getExactTimeFromIdentifier = (userIdentifier) => {
    if (!userIdentifier) return null;
    
    try {
      const timeMatch = userIdentifier.match(/(\d{3,4})(AM|PM)/i);
      if (timeMatch) {
        const timeDigits = timeMatch[1];
        const period = timeMatch[2].toUpperCase();

        if (timeDigits.length === 3) {
          const hour = timeDigits.substring(0, 1);
          const minute = timeDigits.substring(1, 3);
          return `0${hour}:${minute} ${period}`;
        }
        else if (timeDigits.length === 4) {
          const hour = timeDigits.substring(0, 2);
          const minute = timeDigits.substring(2, 4);
          return `${hour}:${minute} ${period}`;
        }
      }
      const altMatch = userIdentifier.match(/(\d{2})(\d{2})(AM|PM)/i);
      if (altMatch) {
        const hour = altMatch[1];
        const minute = altMatch[2];
        const period = altMatch[3].toUpperCase();
        return `${hour}:${minute} ${period}`;
      }
    } catch (err) {
      console.error('Error parsing time from identifier:', err);
    }
    
    return null;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(`/chatbots/${botId}/analytics/`, {
        params: { date: selectedDate }
      });
      
      console.log('Analytics API Response:', response.data); 
      
      if (response.data && Array.isArray(response.data.engagement_data)) {
        const processedData = {
          ...response.data,
          engagement_data: response.data.engagement_data.map(item => {
            console.log('Processing item:', item); 
            let exactTime = null;
            if (item.timestamp) {
              exactTime = getExactTimeFromTimestamp(item.timestamp);
              console.log('Time from timestamp:', exactTime);
            }

            if (!exactTime && item.time) {
              if (item.time.includes(':')) {
                const [hours, minutes] = item.time.split(':');
                const hourNum = parseInt(hours);
                const period = hourNum >= 12 ? 'PM' : 'AM';
                const hour12 = hourNum % 12 || 12;
                exactTime = `${hour12}:${minutes} ${period}`;
              } else {
                exactTime = item.time;
              }
              console.log('Time from time field:', exactTime); 
            }
            if (!exactTime && item.user_identifier) {
              exactTime = getExactTimeFromIdentifier(item.user_identifier);
              console.log('Time from identifier:', exactTime); 
            }
            if (!exactTime) {
              exactTime = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              console.log('Time fallback to current:', exactTime); 
            }

            return {
              ...item,
              exact_time: exactTime,
              timestamp: item.timestamp || new Date().toISOString(),
              user_identifier: item.user_identifier || `user_${Math.random().toString(36).substr(2, 9)}`,
              message_count: item.message_count || 0,
              session_duration: item.session_duration || 0
            };
          })
        };
        
        console.log('Processed analytics data:', processedData); 
        setAnalyticsData(processedData);
      } else {
        throw new Error('Invalid data format from server');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Failed to load analytics data');
      setAnalyticsData(generateMockAnalyticsData(selectedDate));
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalyticsData = (date) => {
    try {
      const engagementData = [];
      const selectedDateObj = new Date(date);
      
      const totalUsers = Math.floor(Math.random() * 10) + 15;
      const exactTimes = [
        '04:41 AM', '05:15 AM', '06:30 AM', '07:45 AM', '08:20 AM',
        '09:10 AM', '10:00 AM', '10:30 AM', '11:15 AM', '11:45 AM',
        '12:00 PM', '01:20 PM', '02:15 PM', '03:30 PM', '04:45 PM',
        '05:30 PM', '06:15 PM', '07:00 PM', '08:30 PM', '09:45 PM',
        '10:20 PM', '11:10 PM', '11:50 PM'
      ];
      
      for (let i = 0; i < totalUsers; i++) {
        const exactTime = exactTimes[i % exactTimes.length];
        let [timePart, period] = exactTime.split(' ');
        let [hours, minutes] = timePart.split(':');
        let hour24 = parseInt(hours);
        
        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        const engagementTime = new Date(selectedDateObj);
        engagementTime.setHours(hour24, parseInt(minutes), 0, 0);
        
        const messageCount = Math.floor(Math.random() * 30) + 1;
        const intensity = messageCount > 10 ? 0.8 + (Math.random() * 0.2) : 
                         messageCount > 5 ? 0.4 + (Math.random() * 0.4) : 
                         0.1 + (Math.random() * 0.3);

        const timeForId = exactTime.replace(':', '').replace(' ', '');
        const userIdentifier = `orai_RAM_${Math.floor(Math.random() * 9000) + 1000}_${timeForId}`;
        
        engagementData.push({
          user_id: `user_${i + 1}`,
          user_identifier: userIdentifier,
          date: engagementTime.toISOString().split('T')[0],
          time: exactTime, 
          exact_time: exactTime, 
          timestamp: engagementTime.toISOString(),
          message_count: messageCount,
          intensity: intensity,
          session_duration: Math.floor(Math.random() * 30) + 1
        });
      }

      engagementData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const totalEngagements = engagementData.length;
      const totalMessages = engagementData.reduce((sum, item) => sum + item.message_count, 0);
      const activeUsers = engagementData.length;
      const highEngagementUsers = engagementData.filter(user => user.message_count > 10).length;
      
      return {
        engagement_data: engagementData,
        total_engagements: totalEngagements,
        total_messages: totalMessages,
        active_users: activeUsers,
        high_engagement_users: highEngagementUsers,
        avg_session_duration: (Math.random() * 5 + 2.5).toFixed(1),
        selected_date: date,
        period_start: new Date(selectedDateObj.setHours(0, 0, 0, 0)).toISOString(),
        period_end: new Date(selectedDateObj.setHours(23, 59, 59, 999)).toISOString()
      };
    } catch (err) {
      console.error('Mock data generation error:', err);
      return {
        engagement_data: [],
        total_engagements: 0,
        total_messages: 0,
        active_users: 0,
        high_engagement_users: 0,
        avg_session_duration: '0.0',
        selected_date: date,
        period_start: new Date().toISOString(),
        period_end: new Date().toISOString()
      };
    }
  };

  const EnhancedEngagementTooltip = () => {
    if (!tooltip.visible || !tooltip.item) return null;
    
    const { item } = tooltip;
    const exactTime = item.exact_time || item.time || getExactTimeFromTimestamp(item.timestamp);
    
    console.log('Tooltip item:', item); 
    console.log('Exact time for tooltip:', exactTime); 
    
    return (
      <div 
        className={styles.tooltip}
        style={{
          position: 'absolute',
          left: `${tooltip.position.x}px`,
          top: `${tooltip.position.y}px`,
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        <div className={styles.tooltipContent}>
          <div className={styles.tooltipHeader}>
            <div className={styles.tooltipUser}>
              {item.user_identifier?.replace(/(orai_RAM_\d+).*/, '$1') || 'Unknown User'}
            </div>
            <div className={styles.tooltipTime}>
              {exactTime || 'Unknown Time'}
            </div>
          </div>
          
          <div className={styles.tooltipStats}>
            <div className={styles.tooltipStat}>
              <span className={styles.statIcon}>💬</span>
              <div className={styles.statDetails}>
                <span className={styles.statLabel}>Messages:</span>
                <span className={styles.statValue}>{item.message_count || 0}</span>
              </div>
            </div>
            <div className={styles.tooltipStat}>
              <span className={styles.statIcon}>⏱️</span>
              <div className={styles.statDetails}>
                <span className={styles.statLabel}>Session:</span>
                <span className={styles.statValue}>{item.session_duration || 0} min</span>
              </div>
            </div>
          </div>
          
          <div className={styles.tooltipFooter}>
            {item.message_count > 10 && (
              <span className={styles.highEngagementBadge}>🎯 Highly Engaged</span>
            )}
            <span className={styles.triggerTime}>
              Triggered at: {exactTime || 'Unknown Time'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const getEngagementDots = () => {
    if (!analyticsData?.engagement_data || !Array.isArray(analyticsData.engagement_data)) {
      return null;
    }
    
    const handleDotHover = (item, event) => {
      try {
        const dotElement = event.currentTarget;
        const dotRect = dotElement.getBoundingClientRect();
        const chartArea = chartAreaRef.current;
        
        if (!chartArea) return;
        
        const chartRect = chartArea.getBoundingClientRect();
        
        let x = dotRect.left - chartRect.left + (dotRect.width / 2);
        let y = dotRect.top - chartRect.top - 10;
        
        const tooltipWidth = 200;
        const tooltipHeight = 120;
        
        if (x + tooltipWidth > chartRect.width) {
          x = chartRect.width - tooltipWidth - 10;
        }
        if (x < 0) {
          x = 10;
        }
        if (y - tooltipHeight < 0) {
          y = dotRect.bottom - chartRect.top + 10;
        }
        
        setTooltip({
          visible: true,
          item,
          position: { x, y }
        });
      } catch (err) {
        console.error('Tooltip error:', err);
      }
    };

    const handleDotLeave = () => {
      setTooltip({ visible: false, item: null, position: { x: 0, y: 0 } });
    };

    return analyticsData.engagement_data.map((user, index) => {
      try {
        const messageCount = user.message_count || 0;
        const size = 6 + (Math.min(messageCount / 30, 1) * 8);
        const opacity = 0.4 + (Math.min(messageCount / 30, 1) * 0.6);
        const baseColor = messageCount > 10 ? '34, 101, 189' : '74, 144, 226';
        const colorIntensity = messageCount > 10 ? 1 : 0.7;
        const userTime = new Date(user.timestamp);
        const userHours = userTime.getHours();
        const userMinutes = userTime.getMinutes();
        
        console.log(`User ${user.user_identifier}:`, {
          timestamp: user.timestamp,
          hours: userHours,
          minutes: userMinutes,
          time: user.time,
          exact_time: user.exact_time
        }); 
        const totalMinutesInDay = 24 * 60;
        const userMinutesInDay = (userHours * 60) + userMinutes;
        const position = (userMinutesInDay / totalMinutesInDay) * 100;

        const userHash = user.user_id ? user.user_id.split('_').pop() : index;
        const verticalPosition = 10 + (parseInt(userHash) % 80);

        return (
          <div
            key={`${user.user_id}-${index}`}
            className={styles.engagementDot}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: opacity,
              backgroundColor: `rgba(${baseColor}, ${colorIntensity})`,
              position: 'absolute',
              left: `${Math.max(0, Math.min(100, position))}%`,
              bottom: `${Math.max(5, Math.min(95, verticalPosition))}%`,
              borderRadius: '50%',
              cursor: 'pointer',
              transform: 'translateX(-50%)',
              transition: 'all 0.2s ease',
              boxShadow: `0 2px 6px rgba(${baseColor}, ${colorIntensity * 0.4})`,
              border: messageCount > 10 ? '2px solid #2264d1' : 'none',
              zIndex: 1
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateX(-50%) scale(1.5)';
              e.target.style.zIndex = '10';
              e.target.style.boxShadow = `0 4px 12px rgba(${baseColor}, ${colorIntensity * 0.7})`;
              handleDotHover(user, e);
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateX(-50%) scale(1)';
              e.target.style.zIndex = '1';
              e.target.style.boxShadow = `0 2px 6px rgba(${baseColor}, ${colorIntensity * 0.4})`;
              handleDotLeave();
            }}
            onMouseMove={(e) => {
              handleDotHover(user, e);
            }}
          />
        );
      } catch (err) {
        console.error('Error rendering engagement dot:', err);
        return null;
      }
    }).filter(Boolean);
  };

  const formatNumber = (num) => {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatDisplayDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (err) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [botId]); 

  return (
    <div className={styles.analyticsView}>
      <div className={styles.analyticsHeader}>
        <div className={styles.headerLeft}>
          <h2>User Engagement Analytics</h2>
          <span className={styles.selectedDateLabel}>
            {formatDisplayDate(selectedDate)}
          </span>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading today's user engagement data...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          <div className={styles.errorContent}>
            <span className={styles.errorIcon}>⚠️</span>
            <div>
              <strong>Unable to load today's analytics</strong>
              <p>{error}</p>
            </div>
          </div>
          <button onClick={fetchAnalytics} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      {(analyticsData && !loading) && (
        <div className={styles.analyticsContent}>
          <div className={styles.statsOverview}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statInfo}>
                <h3>{formatNumber(analyticsData.active_users)}</h3>
                <p>Total Users</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💬</div>
              <div className={styles.statInfo}>
                <h3>{formatNumber(analyticsData.total_messages)}</h3>
                <p>Total Messages</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statInfo}>
                <h3>{formatNumber(analyticsData.high_engagement_users)}</h3>
                <p>Highly Engaged</p>
              </div>
            </div>
            
          </div>

          <div className={styles.chartSection}>
            <div className={styles.sectionHeader}>
              <h3>Today's User Engagement Timeline</h3>
              <p>
                Each dot represents one user. Hover over dots to see exact trigger times.
              </p>
            </div>
            <div className={styles.engagementChart}>
              <div className={styles.chartContainer}>
                <div className={styles.chartBackground}>
                  <div className={styles.yAxis}>
                    <span>Users</span>
                  </div>
                  
                  <div 
                    className={styles.chartArea} 
                    ref={chartAreaRef}
                    style={{ position: 'relative' }}
                  >
                    {getEngagementDots()}
                    <EnhancedEngagementTooltip />
                    
                    <div className={styles.chartGrid}>
                      {[0, 25, 50, 75, 100].map((percent) => (
                        <div
                          key={percent}
                          className={styles.gridLine}
                          style={{ bottom: `${percent}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className={styles.xAxis}>
                  <span>12 AM</span>
                  <span>3 AM</span>
                  <span>6 AM</span>
                  <span>9 AM</span>
                  <span>12 PM</span>
                  <span>3 PM</span>
                  <span>6 PM</span>
                  <span>9 PM</span>
                  <span>12 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!analyticsData && !loading && !error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>No User Data Today</h3>
          <p>No user engagement data found for today.</p>
          <button onClick={fetchAnalytics} className={styles.refreshButton}>
            Check for Data
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;