import React, { useState, useEffect } from 'react'

export default function Login({ onLogin, switchToSignup }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 480)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await onLogin({ username, password })
      if (!success) setError('Invalid username or password')
    } catch (err) {
      setError('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to continue to your account</p>
        </div>
        
        {error && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.error}>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="username" style={styles.label}>Username</label>
            <input
              id="username"
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonLoading : {})
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={styles.spinner}></div>
            ) : (
              'Login'
            )}
          </button>
        </form>
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>
        
        <p style={styles.switchText}>
          Don't have an account?{' '}
          <button onClick={switchToSignup} style={styles.switchButton}>
            Sign Up
          </button>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    width:"70%",

  },
  containerMobile: {
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05), 0 5px 10px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    margin: '0',
    fontSize: '14px',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '20px',
    backgroundColor: '#ffebee',
    borderRadius: '8px',
    border: '1px solid #ffcdd2',
  },
  errorIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  error: {
    margin: '0',
    fontSize: '14px',
    color: '#d32f2f',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    width: '100%',
    height: '44px',
    padding: '0 14px',
    fontSize: '15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#fafafa',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  button: {
    height: '44px',
    backgroundColor: '#4361ee',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLoading: {
    opacity: '0.8',
    cursor: 'not-allowed',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid transparent',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '24px 0',
  },
  dividerText: {
    display: 'inline-block',
    padding: '0 12px',
    backgroundColor: '#fff',
    fontSize: '12px',
    color: '#777',
    position: 'relative',
    zIndex: '1',
  },
  switchText: {
    margin: '0',
    textAlign: 'center',
    fontSize: '14px',
    color: '#555',
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#4361ee',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '0',
    textDecoration: 'underline',
  },
}

