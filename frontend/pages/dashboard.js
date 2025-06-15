import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [resorts, setResorts] = useState([]);
  const [message, setMessage] = useState('');
  const memberId = typeof window !== 'undefined' ? localStorage.getItem('memberId') : null;

  useEffect(() => {
    const fetchResorts = async () => {
      const res = await fetch('/api/resorts', { headers: { 'x-member-id': memberId } });
      if (res.ok) {
        const data = await res.json();
        setResorts(data);
      } else {
        setMessage('Failed to load resorts');
      }
    };
    if (memberId) fetchResorts();
  }, [memberId]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Resorts</h1>
      {message && <p>{message}</p>}
      <ul>
        {resorts.map(r => (
          <li key={r.id}>{r.name} - {r.location}</li>
        ))}
      </ul>
    </div>
  );
}
