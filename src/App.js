import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userName, setUserName] = useState(localStorage.getItem('userName'));
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetch(`${API}/tasks`, {
        headers: { Authorization: token }
      })
        .then(res => res.json())
        .then(data => setTasks(Array.isArray(data) ? data : []));
    }

    // Real-time updates
    socket.on('taskAdded', (task) => {
      setTasks(prev => {
        if (prev.find(t => t._id === task._id)) return prev;
        return [...prev, task];
      });
    });

    socket.on('taskUpdated', (updated) => {
      setTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
    });

    socket.on('taskDeleted', (id) => {
      setTasks(prev => prev.filter(t => t._id !== id));
    });

    return () => {
      socket.off('taskAdded');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, [token]);

  const handleAuth = async () => {
    setError('');
    const url = authMode === 'login' ? `${API}/auth/login` : `${API}/auth/signup`;
    const body = authMode === 'login' ? { email, password } : { name, email, password };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.name);
      setToken(data.token);
      setUserName(data.name);
    } else {
      setError(data.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserName(null);
    setTasks([]);
  };

  const addTask = async () => {
    if (!title) return;
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ title, description })
    });
    const newTask = await res.json();
    setTitle('');
    setDescription('');
  };

  const deleteTask = async (id) => {
    await fetch(`${API}/tasks/${id}`, { method: 'DELETE', headers: { Authorization: token } });
  };

  const updateStatus = async (id, status) => {
    await fetch(`${API}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ status })
    });
  };

  if (!token) {
    return (
      <div className="app">
        <h1>✨ Task Manager ✨</h1>
        <p className="subtitle">~ your little productivity garden ~</p>
        <div className="auth-box">
          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Sign Up</button>
          </div>
          {authMode === 'signup' && (
            <input placeholder="🌸 your name..." value={name} onChange={e => setName(e.target.value)} />
          )}
          <input placeholder="📧 email..." value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="🔒 password..." type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button className="auth-btn" onClick={handleAuth}>
            {authMode === 'login' ? '🌷 Login' : '🌸 Sign Up'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>✨ Task Manager ✨</h1>
      <p className="subtitle">~ your little productivity garden ~</p>
      <div className="user-bar">
        <span>🌸 welcome, {userName}!</span>
        <button onClick={logout}>logout</button>
      </div>
      <div className="form">
        <input placeholder="🌸 task title..." value={title} onChange={e => setTitle(e.target.value)} />
        <input placeholder="💭 description..." value={description} onChange={e => setDescription(e.target.value)} />
        <button onClick={addTask}>+ Add Task</button>
      </div>
      <div className="tasks">
        {tasks.length === 0 && <p className="empty">no tasks yet... add something lovely 🌷</p>}
        {tasks.map(task => (
          <div key={task._id} className={`task ${task.status}`}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div className="task-footer">
              <select value={task.status} onChange={e => updateStatus(task._id, e.target.value)}>
                <option value="todo">🔴 To Do</option>
                <option value="inprogress">🟡 In Progress</option>
                <option value="done">🟢 Done</option>
              </select>
              <button onClick={() => deleteTask(task._id)}>🗑 Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;