import { useState } from 'react';

export default function Profile() {
  const memberId = typeof window !== 'undefined' ? localStorage.getItem('memberId') : null;
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const updateAddress = async () => {
    const res = await fetch('/api/member/address', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-member-id': memberId
      },
      body: JSON.stringify({ address })
    });
    setMessage(res.ok ? 'Address updated' : 'Failed to update address');
  };

  const updatePassword = async () => {
    const res = await fetch('/api/member/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-member-id': memberId
      },
      body: JSON.stringify({ password })
    });
    setMessage(res.ok ? 'Password updated' : 'Failed to update password');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Profile</h1>
      <div>
        <input placeholder="New address" value={address} onChange={e => setAddress(e.target.value)} />
        <button onClick={updateAddress}>Change Address</button>
      </div>
      <div>
        <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={updatePassword}>Change Password</button>
      </div>
      <p>{message}</p>
    </div>
  );
}
