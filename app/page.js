'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Plus, Trash2, Check, Calendar, Search } from 'lucide-react';

export default function TaskFlowAI() {
  const [tasks, setTasks] = useState([]); // start empty
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created');
  const [search, setSearch] = useState('');
  const recognitionRef = useRef(null);

  // --- Speak Feedback ---
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);
    }
  }, []);

  // --- Handle Commands ---
  const handleVoiceCommand = useCallback((command) => {
    const text = command.toLowerCase();

    if (text.startsWith("add task")) {
      const newText = text.replace("add task", "").trim();
      if (newText) {
        setTasks(prev => [...prev, {
          id: Date.now(),
          text: newText,
          completed: false,
          createdAt: new Date(),
          dueDate: null
        }]);
        setFeedback(`✅ Added: ${newText} — Done ✅`);
        speak("Done");
      }
    } else if (text.startsWith("complete task")) {
      const name = text.replace("complete task", "").trim();
      setTasks(prev => prev.map(t =>
        t.text.toLowerCase().includes(name) ? { ...t, completed: true } : t
      ));
      setFeedback(`✅ Completed: ${name} — Done ✅`);
      speak("Done");
    } else if (text.startsWith("delete task")) {
      const name = text.replace("delete task", "").trim();
      setTasks(prev => prev.filter(t => !t.text.toLowerCase().includes(name)));
      setFeedback(`🗑️ Deleted: ${name} — Done ✅`);
      speak("Done");
    } else {
      setFeedback(`⚠️ Unknown command: "${command}"`);
    }
  }, [speak]);

  // --- Voice Recognition Setup ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("Speech recognition not supported in this browser.");
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const command = event.results[0][0].transcript;
        setTranscript(command);
        handleVoiceCommand(command);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [handleVoiceCommand]);

  // Stats
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;
  const todayCount = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Filtered + Sorted
  const filteredTasks = tasks
    .filter(t => (filter === 'all' ? true : filter === 'completed' ? t.completed : !t.completed))
    .filter(t => t.text.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'created'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

  // Add Task manually
  const addManualTask = () => {
    const taskText = prompt('Enter new task:');
    if (taskText?.trim()) {
      const dueDate = prompt('Enter due date (YYYY-MM-DD HH:mm):');
      const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date(),
        dueDate: dueDate ? new Date(dueDate).toISOString().slice(0, 16) : null
      };
      setTasks(prev => [...prev, newTask]);
      setFeedback(`✅ Added: ${taskText} — Done ✅`);
      speak("Done");
    }
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '30px',
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(180deg, #0a0f1c, #0d1117)',
      minHeight: '100vh',
      color: '#e0e6ed'
    }}>
      <h1 style={{
        textAlign: 'center',
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#8b5cf6'
      }}>🎙️ TaskFlow AI</h1>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: '#94a3b8' }}>
        Professional Voice-Powered Task Management
      </p>

      {/* Voice Control */}
      <div style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        border: '1px solid #1e293b'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>🎤 Voice Control</h2>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setIsListening(!isListening)}
            style={{
              background: isListening ? '#ef4444' : '#3b82f6',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 15px',
              cursor: 'pointer'
            }}>
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <p>{isListening ? 'Listening...' : 'Click to start voice command'}</p>
          {feedback && <p style={{ color: '#22c55e', marginTop: '10px' }}>{feedback}</p>}
          <button onClick={addManualTask} style={{
            marginTop: '15px',
            background: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            width: '100%'
          }}>
            <Plus size={18} /> 
          </button>
        </div>
      </div>

      {/* Overview */}
      <div style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '25px',
        border: '1px solid #1e293b'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>📊 Overview</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Total Tasks: {tasks.length}</li>
          <li>Completed: {completedCount}</li>
          <li>Pending: {pendingCount}</li>
          <li>Overdue: {overdueCount}</li>
          <li>Due Today: {todayCount}</li>
        </ul>
        <div style={{ marginTop: '15px' }}>
          <p>Progress: {progress}%</p>
          <div style={{ height: '10px', background: '#1e293b', borderRadius: '6px' }}>
            <div style={{
              width: `${progress}%`,
              background: '#3b82f6',
              height: '100%',
              borderRadius: '6px'
            }} />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #1e293b'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>📝 Tasks ({filteredTasks.length} active)</h2>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 8px 8px 32px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: 'white'
              }}
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
            <option value="created">Date Created</option>
            <option value="due">Due Date</option>
          </select>
        </div>

        {/* Tasks */}
        {filteredTasks.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No tasks found</p>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '10px',
              border: '1px solid #1e293b'
            }}>
              <div style={{ flex: 1 }}>
                <span style={{
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? '#64748b' : 'white'
                }}>{task.text}</span>
                {task.dueDate && (
                  <small style={{ display: 'block', color: '#94a3b8', marginTop: '4px' }}>
                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {task.dueDate}
                  </small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => {
                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
                  setFeedback(`✅ Toggled: ${task.text} — Done ✅`);
                  speak("Done");
                }} style={{
                  background: task.completed ? '#3b82f6' : '#22c55e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'white',
                  cursor: 'pointer'
                }}>
                  <Check size={16} />
                </button>
                <button onClick={() => {
                  setTasks(prev => prev.filter(t => t.id !== task.id));
                  setFeedback(`🗑️ Deleted: ${task.text} — Done ✅`);
                  speak("Done");
                }} style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'white',
                  cursor: 'pointer'
                }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center' }}>
        💡 Pro Tip: Set due dates for reminders & smarter task management.
      </p>
    </div>
  );
}
