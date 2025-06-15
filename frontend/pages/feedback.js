import { useState } from 'react';

export default function Feedback() {
  const memberId = typeof window !== 'undefined' ? localStorage.getItem('memberId') : null;
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const sendFeedback = async () => {
    const res = await fetch('/api/member/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-member-id': memberId
      },
      body: JSON.stringify({ message })
    });
    setStatus(res.ok ? 'Feedback sent' : 'Failed to send feedback');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Feedback</h1>
      <textarea rows="4" cols="50" value={message} onChange={e => setMessage(e.target.value)} />
      <div>
        <button onClick={sendFeedback}>Submit</button>
      </div>
      <p>{status}</p>
    </div>
  );
}
