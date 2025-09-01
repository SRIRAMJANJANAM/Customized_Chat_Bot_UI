import React, { useState, useEffect } from 'react'

export default function Login({ onLogin, switchToSignup }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 480)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await onLogin({ username, password })
    if (!success) setError('Invalid credentials')
  }

  return (
    <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
      <h2 style={styles.title}>Login</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" style={styles.button}>
          Login
        </button>
      </form>
      <p style={styles.switchText}>
        Don't have an account?{' '}
        <button onClick={switchToSignup} style={styles.switchButton}>
          Sign Up
        </button>
      </p>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: 360,
    margin: '80px auto',
    padding: 24,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  containerMobile: {
    margin: '40px 16px',
    maxWidth: 'auto',
    width: 'auto',
    padding: 20,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  error: {
    color: '#d32f2f',
    marginBottom: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    height: 40,
    marginBottom: 16,
    padding: '0 12px',
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    height: 40,
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  switchText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#1976d2',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    fontSize: 14,
    fontWeight: 'bold',
  },
}
