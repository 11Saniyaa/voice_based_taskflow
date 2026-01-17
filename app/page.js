'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Plus, Trash2, Check, Calendar, Search, Clock, AlertCircle, ListTodo } from 'lucide-react';

export default function TaskFlowAI() {
  const [tasks, setTasks] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created');
  const [search, setSearch] = useState('');
  const recognitionRef = useRef(null);

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);
    }
  }, []);

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
        setFeedback(`Added: ${newText}`);
        setTimeout(() => setFeedback(''), 3000);
        speak("Task added");
      }
    } else if (text.startsWith("complete task")) {
      const name = text.replace("complete task", "").trim();
      setTasks(prev => prev.map(t =>
        t.text.toLowerCase().includes(name) ? { ...t, completed: true } : t
      ));
      setFeedback(`Completed: ${name}`);
      setTimeout(() => setFeedback(''), 3000);
      speak("Task completed");
    } else if (text.startsWith("delete task")) {
      const name = text.replace("delete task", "").trim();
      setTasks(prev => prev.filter(t => !t.text.toLowerCase().includes(name)));
      setFeedback(`Deleted: ${name}`);
      setTimeout(() => setFeedback(''), 3000);
      speak("Task deleted");
    } else {
      setFeedback(`Unknown: "${command}"`);
      setTimeout(() => setFeedback(''), 3000);
    }
  }, [speak]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
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

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks
    .filter(t => (filter === 'all' ? true : filter === 'completed' ? t.completed : !t.completed))
    .filter(t => t.text.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'created'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

  const addManualTask = () => {
    const taskText = prompt('Task name:');
    if (taskText?.trim()) {
      const dueDate = prompt('Due date (YYYY-MM-DD HH:mm) or press Enter:');
      const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date(),
        dueDate: dueDate ? new Date(dueDate).toISOString().slice(0, 16) : null
      };
      setTasks(prev => [...prev, newTask]);
      setFeedback(`Added: ${taskText}`);
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e27',
      padding: '0',
      fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: '#050816',
        borderBottom: '1px solid #1a1f3a',
        padding: '24px 0',
        marginBottom: '40px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#60a5fa',
              margin: '0',
              letterSpacing: '-0.5px'
            }}>
              TaskFlow
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '4px 0 0 0'
            }}>
              Voice-powered task management
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <div style={{
              padding: '8px 16px',
              background: '#1e293b',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#94a3b8'
            }}>
              {tasks.length} tasks
            </div>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px 60px'
      }}>
        {/* Voice Control Section */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#1e3a8a',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mic size={24} color="#60a5fa" />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#f1f5f9',
                margin: '0 0 4px 0'
              }}>
                Voice Control
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '0'
              }}>
                Click the microphone to start
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setIsListening(!isListening)}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: isListening ? '#dc2626' : '#1e40af',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isListening 
                  ? '0 0 20px rgba(220, 38, 38, 0.3)' 
                  : '0 4px 12px rgba(30, 64, 175, 0.3)'
              }}
            >
              {isListening ? (
                <MicOff size={32} color="white" />
              ) : (
                <Mic size={32} color="white" />
              )}
            </button>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{
                fontSize: '15px',
                color: isListening ? '#60a5fa' : '#94a3b8',
                margin: '0 0 8px 0',
                fontWeight: isListening ? '500' : '400'
              }}>
                {isListening ? 'Listening...' : 'Ready'}
              </p>
              {feedback && (
                <p style={{
                  fontSize: '13px',
                  color: '#22c55e',
                  margin: '0',
                  padding: '8px 12px',
                  background: '#064e3b',
                  borderRadius: '6px',
                  border: '1px solid #065f46'
                }}>
                  {feedback}
                </p>
              )}
            </div>

            <button
              onClick={addManualTask}
              style={{
                padding: '12px 20px',
                background: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e3a8a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1e40af';
              }}
            >
              <Plus size={18} />
              Add Task
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <ListTodo size={20} color="#60a5fa" />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Total</span>
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#f1f5f9',
              margin: '0'
            }}>
              {tasks.length}
            </p>
          </div>

          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <Check size={20} color="#22c55e" />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Done</span>
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#f1f5f9',
              margin: '0'
            }}>
              {completedCount}
            </p>
          </div>

          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <Clock size={20} color="#f59e0b" />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Pending</span>
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#f1f5f9',
              margin: '0'
            }}>
              {pendingCount}
            </p>
          </div>

          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <AlertCircle size={20} color="#ef4444" />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Overdue</span>
            </div>
            <p style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#f1f5f9',
              margin: '0'
            }}>
              {overdueCount}
            </p>
          </div>
        </div>

        {/* Progress */}
        {tasks.length > 0 && (
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                Progress
              </span>
              <span style={{ fontSize: '18px', color: '#60a5fa', fontWeight: '600' }}>
                {progress}%
              </span>
            </div>
            <div style={{
              height: '8px',
              background: '#1e293b',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: '#3b82f6',
                borderRadius: '4px',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}

        {/* Tasks Section */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#f1f5f9',
              margin: '0'
            }}>
              Tasks
            </h2>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                <Search size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    background: '#050816',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                  }}
                />
              </div>

              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{
                  padding: '10px 12px',
                  background: '#050816',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#1e293b';
                }}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{
                  padding: '10px 12px',
                  background: '#050816',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#1e293b';
                }}
              >
                <option value="created">Created</option>
                <option value="due">Due Date</option>
              </select>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#475569'
            }}>
              <p style={{ fontSize: '15px', margin: '0' }}>
                {search ? 'No tasks match your search' : 'No tasks yet'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: task.completed ? '#050816' : '#0a0f1a',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!task.completed) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#0f172a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.background = task.completed ? '#050816' : '#0a0f1a';
                  }}
                >
                  <button
                    onClick={() => {
                      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
                      setFeedback(`Task ${task.completed ? 'reopened' : 'completed'}`);
                      setTimeout(() => setFeedback(''), 3000);
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `2px solid ${task.completed ? '#22c55e' : '#475569'}`,
                      background: task.completed ? '#22c55e' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {task.completed && <Check size={12} color="white" />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0',
                      fontSize: '15px',
                      color: task.completed ? '#64748b' : '#f1f5f9',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      wordBreak: 'break-word'
                    }}>
                      {task.text}
                    </p>
                    {task.dueDate && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '6px',
                        fontSize: '12px',
                        color: '#64748b'
                      }}>
                        <Calendar size={12} />
                        <span>{new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setTasks(prev => prev.filter(t => t.id !== task.id));
                      setFeedback('Task deleted');
                      setTimeout(() => setFeedback(''), 3000);
                    }}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1e293b';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          color: '#475569',
          fontSize: '13px'
        }}>
          <p style={{ margin: '0' }}>
            Voice commands: "add task [name]", "complete task [name]", "delete task [name]"
          </p>
        </div>
      </div>
    </div>
  );
}
