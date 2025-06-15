import { useState } from 'react';

export default function Login() {
  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, password })
    });
    if (res.ok) {
      setMessage('Login successful');
      // store member id for simple auth
      localStorage.setItem('memberId', memberId);
      window.location.href = '/dashboard';
    } else {
      const data = await res.json();
      setMessage(data.error || 'Login failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Sterling Resorts Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <input placeholder="Member ID" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
        </div>
        <div>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit">Login</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
