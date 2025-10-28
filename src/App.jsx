import React, { useEffect, useState, createContext, useContext } from 'react'
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

// Create a Theme Context
const ThemeContext = createContext()

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme || 'light'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme }
}

function ThemeProvider({ children }) {
  const theme = useTheme()
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

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

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeContext()
  
  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {theme === 'light' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

function BotList({ user, logout }) {
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newBotName, setNewBotName] = useState('')
  const [editingBotId, setEditingBotId] = useState(null)
  const [editingBotName, setEditingBotName] = useState('')
  const [menuOpen, setMenuOpen] = useState(null) // Track which bot's menu is open
  const navigate = useNavigate()
  const { theme } = useThemeContext()

  useEffect(() => {
    if (!user) return
    const loadBots = async () => {
      setLoading(true)
      try {
        const res = await API.get('/chatbots/')
        setBots(res.data)
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
      setNewBotName('')
      setCreating(false)
      // Navigate to the builder for the new bot
      navigate(`/bot/${newBot.id}`)
    } catch (err) {
      console.error('Failed creating bot', err)
      alert('Failed to create bot Please Login')
    }
  }

  const deleteBot = async (botId) => {
    if (!window.confirm('Are you sure you want to delete this bot?')) return
    try {
      await API.delete(`/chatbots/${botId}/`)
      setBots((prev) => prev.filter((b) => b.id !== botId))
      setMenuOpen(null) // Close menu after deletion
    } catch (err) {
      console.error('Failed deleting bot', err)
      alert('Failed to delete bot')
    }
  }

  const startEditing = (bot) => {
    setEditingBotId(bot.id)
    setEditingBotName(bot.name)
    setMenuOpen(null) // Close menu when starting to edit
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

  const openBotBuilder = (botId) => {
    navigate(`/bot/${botId}`)
  }

  const toggleMenu = (botId, e) => {
    e.stopPropagation()
    setMenuOpen(menuOpen === botId ? null : botId)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpen(null)
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

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
      <header className="main-header">
        <h1>ORAI Chatbots</h1>
        <div className="header-actions">
          <ThemeToggle />
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="bot-list-container">
        <div className="bot-list-header">
          <div className="bot-list-title">
            <h2>Your Chatbots</h2>
            <ul>
              <li>
                <span className="bot-count">{bots.length} bot{bots.length !== 1 ? 's' : ''}</span>
              </li>
            </ul>
          </div>
          <button 
            className="btn-primary"
            onClick={() => setCreating(true)}
          >
            Create New Bot
          </button>
        </div>

        {creating && (
          <div className="create-bot-card">
            <h3>Create New Bot</h3>
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
              <button className="btn-primary" onClick={createBot}>
                Create
              </button>
              <button className="btn-secondary" onClick={() => {
                setCreating(false)
                setNewBotName('')
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      <div className="bots-grid-container">
        <div className="bots-grid">
          {bots.map((bot) => (
            <div key={bot.id} className="bot-card">
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
                    <button className="btn-primary btn-sm" onClick={() => saveEdit(bot.id)}>
                      Save
                    </button>
                    <button className="btn-secondary btn-sm" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bot-card-header">
                    <h3>{bot.name || `Bot #${bot.id}`}</h3>
                    <div className="bot-actions">
                      <div className="dropdown-container">
                        <button 
                          className="icon-btn"
                          onClick={(e) => toggleMenu(bot.id, e)}
                          aria-label="More options"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="6" r="2" fill="currentColor"/>
                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                            <circle cx="12" cy="18" r="2" fill="currentColor"/>
                          </svg>
                        </button>
                        {menuOpen === bot.id && (
                          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => startEditing(bot)}
                              className="dropdown-item"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Rename
                            </button>
                            <button 
                              onClick={() => deleteBot(bot.id)}
                              className="dropdown-item"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bot-card-body" >
                    <div className="bot-icon">
                      <img 
                        src="https://media.licdn.com/dms/image/v2/D560BAQEt4ERh7X-kxw/company-logo_200_200/B56Za4ZhNWGkAM-/0/1746850421045/orairobotics_logo?e=2147483647&v=beta&t=HbwP8feYD0BiMyXEt8Vby0pgC_I1QdZ5PShFS7VJ6TA" 
                        alt="Chatbot icon" 
                        width="68" 
                        height="68"
                        className="bot-image"
                      />
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={() => openBotBuilder(bot.id)}
                    >
                      Open Builder
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => navigate(`/chat/${bot.id}`)}
                    >
                      Test Chat
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {bots.length === 0 && !creating && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M9 9H9.01M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>No bots yet</h3>
              <p>Create your first chatbot to get started</p>
              <button 
                className="btn-primary"
                onClick={() => setCreating(true)}
              >
                Create Your First Bot
              </button>
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  )
}

function BotBuilderPage() {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeContext()
  
  return (
    <div className="app-container">
      <header className="builder-header">
        <button onClick={() => navigate('/')} className="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Bots
        </button>
        <h2>ORAI</h2>
        <ThemeToggle />
      </header>
      <Builder botId={botId} />
    </div>
  )
}

function ChatPage() {
  const { botId } = useParams()
  const navigate = useNavigate()
  return <TestModal botId={botId} onClose={() => navigate('/')} />
}

function AuthPage({ isLoginView, onLogin, onSignup, switchToLogin, switchToSignup }) {
  const { theme, toggleTheme } = useThemeContext()
  
  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>ORAI Chatbots</h1>
        <ThemeToggle />
      </div>
      <div className="auth-content">
        {isLoginView ? (
          <Login onLogin={onLogin} switchToSignup={switchToSignup} />
        ) : (
          <Signup onSignup={onSignup} switchToLogin={switchToLogin} />
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { user, login, signup, logout } = useAuth()
  const [isLoginView, setIsLoginView] = useState(true)

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Publicly accessible chat route */}
          <Route path="/chat/:botId" element={<ChatPage />} />

          {/* Protected routes (only if logged in) */}
          {user ? (
            <>
              <Route path="/" element={<BotList user={user} logout={logout} />} />
              <Route path="/bot/:botId" element={<BotBuilderPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route
                path="/"
                element={
                  <AuthPage 
                    isLoginView={isLoginView}
                    onLogin={login}
                    onSignup={signup}
                    switchToLogin={() => setIsLoginView(true)}
                    switchToSignup={() => setIsLoginView(false)}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </Router>
    </ThemeProvider>
  )
}