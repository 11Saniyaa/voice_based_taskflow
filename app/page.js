'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Plus, Trash2, Check, Volume2, Calendar } from 'lucide-react';

export default function VoiceTaskManager() {
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef(tasks);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [feedback, setFeedback] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    const saved = localStorage.getItem('tasks');
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let transcriptText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptText += event.results[i][0].transcript + ' ';
        }
        transcriptText = transcriptText.trim();
        setTranscript(transcriptText);

        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult.isFinal) {
          processVoiceCommand(transcriptText.toLowerCase());
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setTranscript('');
      };

      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        setFeedback(`Error: ${event.error}`);
      };
    }
  }, []);

  // 🔊 Voice Feedback
  const speak = (text) => {
    if ('speechSynthesis' in window && text) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // 🎙 Process Voice Commands
  const processVoiceCommand = (rawCommand) => {
    if (rawCommand.startsWith("add task")) {
      const text = rawCommand.replace("add task", "").trim();
      if (text) {
        const newTask = { id: Date.now(), text, completed: false, createdAt: new Date(), dueDate: null };
        setTasks(prev => [...prev, newTask]);
        setFeedback(`Added: ${text}`);
        speak(`Task added: ${text}`);
      }
    } else if (rawCommand.startsWith("delete task")) {
      const text = rawCommand.replace("delete task", "").trim();
      setTasks(prev => prev.filter(t => t.text.toLowerCase() !== text));
      setFeedback(`Deleted: ${text}`);
      speak(`Deleted task: ${text}`);
    } else if (rawCommand.startsWith("complete task")) {
      const text = rawCommand.replace("complete task", "").trim();
      setTasks(prev => prev.map(t => t.text.toLowerCase() === text ? { ...t, completed: true } : t));
      setFeedback(`Completed: ${text}`);
      speak(`Marked as completed: ${text}`);
    } else {
      setFeedback("Sorry, I didn't understand.");
      speak("Sorry, I didn't understand.");
    }
  };

  // 🎤 Voice Listening
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setFeedback('Listening...');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // ➕ Manual Add Task with Due Date
  const addManualTask = () => {
    const taskText = prompt('Enter new task:');
    if (taskText?.trim()) {
      let dueDate = prompt('Enter due date (optional, e.g. 2025-09-01T15:00):');
      const newTask = { id: Date.now(), text: taskText.trim(), completed: false, createdAt: new Date(), dueDate: dueDate || null };
      setTasks(prev => [...prev, newTask]);
      setFeedback(`Added: ${taskText}`);
      speak(`Task added: ${taskText}`);
    }
  };

  // ⏰ Reminder check (alerts when task due in <1 min)
  useEffect(() => {
    const interval = setInterval(() => {
      tasks.forEach(task => {
        if (task.dueDate && !task.completed) {
          const now = new Date();
          const due = new Date(task.dueDate);
          const diff = due - now;
          if (diff > 0 && diff < 60000) {
            alert(`⏰ Reminder: "${task.text}" is due soon!`);
            speak(`Reminder: ${task.text} is due soon`);
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  // 📊 Progress
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const sortedTasks = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

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
      <div style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '30px',
        border: '1px solid #1e293b'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#3b82f6'
        }}>
          Voice Task Manager
        </h1>

        {!isSupported ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#f87171' }}>
            <p>⚠️ Speech recognition not supported. Use Chrome, Edge, or Safari.</p>
          </div>
        ) : (
          <>
            {/* 🎙 Voice Control */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "30px",
              padding: "40px",
              minHeight: "300px",
              background: "#1e293b",
              borderRadius: "12px",
              border: isListening ? "2px solid #3b82f6" : "1px solid #334155"
            }}>
              <button
                onClick={isListening ? stopListening : startListening}
                style={{
                  background: isListening ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '70px',
                  height: '70px',
                  cursor: 'pointer',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}
              >
                {isListening ? <MicOff /> : <Mic />}
              </button>

              <p style={{ fontWeight: 'bold', margin: '10px 0', color: '#e0e6ed' }}>
                {isListening ? '🎤 Listening...' : 'Click to speak'}
              </p>

              {transcript && (
                <p style={{
                  background: '#0f172a',
                  padding: '10px',
                  borderRadius: '6px',
                  fontStyle: 'italic',
                  color: '#cbd5e1'
                }}>
                  "{transcript}"
                </p>
              )}

              {feedback && (
                <div style={{
                  background: '#0f172a',
                  padding: '10px',
                  borderRadius: '6px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  border: '1px solid #334155'
                }}>
                  {feedback}
                  <button onClick={() => speak(feedback)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                    <Volume2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* 📊 Progress */}
            {tasks.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p><b>Progress:</b> {completedCount}/{tasks.length} ({progress}%)</p>
                <div style={{ height: '12px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${progress}%`,
                    background: '#3b82f6',
                    height: '100%',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}

            {/* ➕ Manual Add */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button onClick={addManualTask} style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 'bold'
              }}>
                <Plus size={20} /> Add Manually
              </button>
            </div>

            {/* 📌 Task List */}
            <div>
              <h2 style={{ marginBottom: '20px', color: '#e0e6ed' }}>Tasks ({tasks.filter(t => !t.completed).length} pending)</h2>

              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                  No tasks yet! Try saying "Add task buy milk"
                </div>
              ) : (
                sortedTasks.map(task => {
                  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
                  return (
                    <div key={task.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      margin: '10px 0',
                      background: overdue ? '#7f1d1d' : '#111827',
                      border: overdue ? '1px solid #f87171' : '1px solid #1e293b',
                      borderRadius: '6px',
                      opacity: task.completed ? 0.6 : 1
                    }}>
                      <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))} style={{
                        background: task.completed ? '#3b82f6' : '#0f172a',
                        border: '2px solid #3b82f6',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        marginRight: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {task.completed && <Check color="white" size={14} />}
                      </button>

                      <span style={{
                        flex: 1,
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? '#64748b' : '#e2e8f0'
                      }}>
                        {task.text}
                        {task.dueDate && (
                          <small style={{ marginLeft: '10px', color: overdue ? '#f87171' : '#cbd5e1' }}>
                            <Calendar size={14} style={{ marginRight: '4px' }} /> {task.dueDate}
                          </small>
                        )}
                      </span>

                      <button onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))} style={{
                        background: 'transparent',
                        color: '#f87171',
                        border: '1px solid #f87171',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        cursor: 'pointer'
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* 🗑 Clear All */}
            {tasks.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button onClick={() => { if (confirm('Delete all tasks?')) { setTasks([]); speak('All tasks deleted'); } }} style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 'bold'
                }}>
                  <Trash2 size={20} /> Delete All
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
