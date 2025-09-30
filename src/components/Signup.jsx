import React, { useState, useEffect } from 'react'

export default function Signup({ onSignup, switchToLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 480)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Calculate password strength
    let strength = 0
    if (password.length > 5) strength += 1
    if (password.length > 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    setPasswordStrength(strength)
  }, [password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await onSignup({ username, email, password })
      if (!success) setError('Signup failed. Username or email might be taken.')
    } catch (err) {
      setError('An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#e0e0e0'
    if (passwordStrength <= 2) return '#ff5252'
    if (passwordStrength <= 3) return '#ffb142'
    return '#2ed573'
  }

  const getPasswordStrengthText = () => {
    if (password.length === 0) return ''
    if (passwordStrength <= 2) return 'Weak'
    if (passwordStrength <= 3) return 'Medium'
    return 'Strong'
  }

  return (
    <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Join us to get started</p>
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
              placeholder="Choose a username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              style={styles.input}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              style={styles.input}
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <div style={styles.passwordStrengthContainer}>
                <div style={styles.passwordStrengthBar}>
                  <div 
                    style={{
                      ...styles.passwordStrengthFill,
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  ></div>
                </div>
                <span style={{
                  ...styles.passwordStrengthText,
                  color: getPasswordStrengthColor()
                }}>
                  {getPasswordStrengthText()}
                </span>
              </div>
            )}
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
              'Create Account'
            )}
          </button>
        </form>
        
        <div style={styles.terms}>
          <p style={styles.termsText}>
            By creating an account, you agree to our <a href="#" style={styles.link}>Terms of Service</a> and <a href="#" style={styles.link}>Privacy Policy</a>.
          </p>
        </div>
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>
        
        <p style={styles.switchText}>
          Already have an account?{' '}
          <button onClick={switchToLogin} style={styles.switchButton}>
            Login
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
  },
  containerMobile: {
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
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
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a1a1a',
    background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
    position: 'relative',
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
    height: '46px',
    padding: '0 14px',
    fontSize: '15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#fafafa',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  passwordStrengthContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '8px',
  },
  passwordStrengthBar: {
    flex: 1,
    height: '4px',
    backgroundColor: '#e0e0e0',
    borderRadius: '2px',
    overflow: 'hidden',
    marginRight: '8px',
  },
  passwordStrengthFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  passwordStrengthText: {
    fontSize: '12px',
    fontWeight: '600',
  },
  button: {
    height: '46px',
    background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
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
    boxShadow: '0 4px 6px rgba(67, 97, 238, 0.3)',
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
  terms: {
    margin: '16px 0',
    textAlign: 'center',
  },
  termsText: {
    margin: '0',
    fontSize: '12px',
    color: '#777',
    lineHeight: '1.4',
  },
  link: {
    color: '#4361ee',
    textDecoration: 'none',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '20px 0',
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

