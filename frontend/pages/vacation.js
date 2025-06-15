import { useState } from 'react';

export default function Vacation() {
  const memberId = typeof window !== 'undefined' ? localStorage.getItem('memberId') : null;
  const [form, setForm] = useState({ resortId: '', seasonId: '', startDate: '', endDate: '' });
  const [status, setStatus] = useState('');

  const requestVacation = async () => {
    const res = await fetch('/api/member/vacation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-member-id': memberId
      },
      body: JSON.stringify(form)
    });
    setStatus(res.ok ? 'Request submitted' : 'Failed to submit request');
  };

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Vacation Request</h1>
      <div>
        <input name="resortId" placeholder="Resort ID" value={form.resortId} onChange={update} />
      </div>
      <div>
        <input name="seasonId" placeholder="Season ID" value={form.seasonId} onChange={update} />
      </div>
      <div>
        <input name="startDate" type="date" value={form.startDate} onChange={update} />
      </div>
      <div>
        <input name="endDate" type="date" value={form.endDate} onChange={update} />
      </div>
      <button onClick={requestVacation}>Submit</button>
      <p>{status}</p>
    </div>
  );
}
