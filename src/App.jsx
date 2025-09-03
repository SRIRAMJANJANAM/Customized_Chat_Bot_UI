import React, { useEffect, useState } from 'react'
import { API } from './api'
import Login from './components/Login'
import Signup from './components/Signup'
import Builder from './components/Builder'
import TestModal from './components/TestModal'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate
} from 'react-router-dom'
import './App.css'

function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      setUser({ token })
    }
  }, [])

  const login = async (creds) => {
    try {
      const res = await API.post('/auth/login/', creds)
      localStorage.setItem('access_token', res.data.access)
      setUser({ token: res.data.access })
      return true
    } catch {
      return false
    }
  }

  const signup = async (data) => {
    try {
      const res = await API.post('/auth/register/', data)
      localStorage.setItem('access_token', res.data.access)
      setUser({ token: res.data.access })
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  return { user, login, signup, logout }
}

function Home({ user, logout }) {
  const [bots, setBots] = useState([])
  const [currentBotId, setCurrentBotId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newBotName, setNewBotName] = useState('')
  const [editingBotId, setEditingBotId] = useState(null)
  const [editingBotName, setEditingBotName] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const loadBots = async () => {
      setLoading(true)
      try {
        const res = await API.get('/chatbots/')
        setBots(res.data)
        if (res.data.length > 0) {
          setCurrentBotId(res.data[0].id)
        }
      } catch (err) {
        console.error('Failed loading bots', err)
      } finally {
        setLoading(false)
      }
    }
    loadBots()
  }, [user])

  const createBot = async () => {
    if (!newBotName.trim()) {
      alert('Bot name cannot be empty')
      return
    }
    try {
      const res = await API.post('/chatbots/', { name: newBotName.trim() })
      const newBot = res.data
      setBots((prev) => [...prev, newBot])
      setCurrentBotId(newBot.id)
      setNewBotName('')
      setCreating(false)
    } catch (err) {
      console.error('Failed creating bot', err)
      alert('Failed to create bot')
    }
  }

  const deleteBot = async (botId) => {
    if (!window.confirm('Are you sure you want to delete this bot?')) return
    try {
      await API.delete(`/chatbots/${botId}/`)
      setBots((prev) => prev.filter((b) => b.id !== botId))
      if (currentBotId === botId) {
        setCurrentBotId(bots.length > 1 ? bots[0].id : null)
      }
    } catch (err) {
      console.error('Failed deleting bot', err)
      alert('Failed to delete bot')
    }
  }

  const startEditing = (bot) => {
    setEditingBotId(bot.id)
    setEditingBotName(bot.name)
  }

  const saveEdit = async (botId) => {
    if (!editingBotName.trim()) {
      alert('Bot name cannot be empty')
      return
    }
    try {
      const res = await API.patch(`/chatbots/${botId}/`, { name: editingBotName.trim() })
      setBots((prev) =>
        prev.map((bot) => (bot.id === botId ? { ...bot, name: res.data.name } : bot))
      )
      setEditingBotId(null)
      setEditingBotName('')
    } catch (err) {
      console.error('Failed editing bot', err)
      alert('Failed to update bot name')
    }
  }

  const cancelEdit = () => {
    setEditingBotId(null)
    setEditingBotName('')
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your bots...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Mobile header */}
      <header className="mobile-header">
        <button 
          className="menu-toggle"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h2>Chatbot Builder</h2>
        <button className="logout-btn-mobile" onClick={logout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16V17C13 18.6569 11.6569 20 10 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H10C11.6569 4 13 5.34315 13 7V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <div className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`} onClick={() => setMobileSidebarOpen(false)}></div>
        <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <h3>Bots</h3>
            <div className="sidebar-controls">
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d={sidebarCollapsed ? "M9 19L15 13L9 7" : "M5 19L11 13L5 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button 
                className="sidebar-close-mobile"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <div className="sidebar-content">
              <ul className="bot-list">
                {bots.map((bot) => (
                  <li 
                    key={bot.id} 
                    className={`bot-item ${bot.id === currentBotId ? 'active' : ''}`}
                  >
                    {editingBotId === bot.id ? (
                      <div className="edit-bot-form">
                        <input
                          value={editingBotName}
                          onChange={(e) => setEditingBotName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(bot.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="bot-name-input"
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button 
                            className="btn-primary btn-sm"
                            onClick={() => saveEdit(bot.id)}
                            aria-label="Save changes"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button 
                            className="btn-secondary btn-sm"
                            onClick={cancelEdit}
                            aria-label="Cancel editing"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bot-display">
                        <button
                          onClick={() => {
                            setCurrentBotId(bot.id)
                            setMobileSidebarOpen(false)
                          }}
                          className="bot-name-btn"
                        >
                          <span className="bot-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M9 9H9.01M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <span className="bot-name">{bot.name || `Bot #${bot.id}`}</span>
                        </button>
                        <div className="bot-actions">
                          <button 
                            className="icon-btn"
                            onClick={() => startEditing(bot)}
                            aria-label="Edit bot name"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button 
                            className="icon-btn"
                            onClick={() => deleteBot(bot.id)}
                            aria-label="Delete bot"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="create-bot-section">
                {creating ? (
                  <div className="create-bot-form">
                    <input
                      value={newBotName}
                      onChange={(e) => setNewBotName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createBot()
                        if (e.key === 'Escape') {
                          setCreating(false)
                          setNewBotName('')
                        }
                      }}
                      placeholder="Enter bot name"
                      className="bot-name-input"
                      autoFocus
                    />
                    <div className="create-actions">
                      <button 
                        className="btn-primary btn-sm"
                        onClick={createBot}
                        aria-label="Create bot"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button 
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setCreating(false)
                          setNewBotName('')
                        }}
                        aria-label="Cancel creation"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn-primary create-btn"
                    onClick={() => setCreating(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Create New Bot
                  </button>
                )}
              </div>

              <button
                onClick={logout}
                className="logout-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 16L21 12M21 12L17 8M21 12H7M13 16V17C13 18.6569 11.6569 20 10 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H10C11.6569 4 13 5.34315 13 7V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </div>
          )}
        </nav>

        {/* Main Builder area */}
        <main className="builder-container">
          {currentBotId ? (
            <Builder botId={currentBotId} />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M9 9H9.01M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>{bots.length === 0 ? 'No bots yet' : 'Select a bot to edit'}</h3>
              <p>
                {bots.length === 0 
                  ? 'Create your first chatbot to get started,               If u r new user please logout and signup, If u are new user please logout and login.' 
                  : 'Choose a bot from the sidebar to begin editing'
                }
              </p>
              {bots.length === 0 && (
                <button 
                  className="btn-primary"
                  onClick={() => setCreating(true)}
                >
                  Create Your First Bot
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function ChatPage() {
  const { botId } = useParams()
  const navigate = useNavigate()
  return <TestModal botId={botId} onClose={() => navigate('/')} />
}

export default function App() {
  const { user, login, signup, logout } = useAuth()
  const [isLoginView, setIsLoginView] = useState(true)

  return (
    <Router>
      <Routes>
        {/* Publicly accessible chat route */}
        <Route path="/chat/:botId" element={<ChatPage />} />

        {/* Protected routes (only if logged in) */}
        {user ? (
          <>
            <Route path="/" element={<Home user={user} logout={logout} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={
                isLoginView ? (
                  <Login onLogin={login} switchToSignup={() => setIsLoginView(false)} />
                ) : (
                  <Signup onSignup={signup} switchToLogin={() => setIsLoginView(true)} />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  )
}