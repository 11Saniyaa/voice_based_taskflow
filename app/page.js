'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Plus, Trash2, Check, Calendar, Search, Clock, AlertCircle, ListTodo, Edit, Flag, Tag, ChevronDown, ChevronRight, FileText, Repeat, X, Save, Layers } from 'lucide-react';

export default function TaskFlowAI() {
  const [tasks, setTasks] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created');
  const [search, setSearch] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalData, setTaskModalData] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const recognitionRef = useRef(null);
  const tasksRef = useRef(tasks);
  
  // Task templates
  const taskTemplates = [
    { name: 'Daily Standup', text: 'Daily standup meeting', category: 'Work', priority: 'medium' },
    { name: 'Code Review', text: 'Review pull requests', category: 'Work', priority: 'high' },
    { name: 'Exercise', text: '30 minutes exercise', category: 'Health', priority: 'medium' },
    { name: 'Grocery Shopping', text: 'Buy groceries', category: 'Personal', priority: 'low' },
    { name: 'Team Meeting', text: 'Weekly team meeting', category: 'Work', priority: 'high' }
  ];
  
  // Keep tasksRef in sync
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
  }, []);

  // Fuzzy string matching for better command recognition
  const fuzzyMatch = useCallback((str1, str2, threshold = 0.7) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  }, []);

  // Levenshtein distance calculation
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Normalize text for better matching
  const normalizeText = useCallback((text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }, []);

  // Find best matching command
  const findBestCommand = useCallback((text, commands) => {
    const normalized = normalizeText(text);
    let bestMatch = null;
    let bestScore = 0;
    
    for (const cmd of commands) {
      const score = fuzzyMatch(normalized, cmd);
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = cmd;
      }
    }
    
    return bestMatch;
  }, [fuzzyMatch, normalizeText]);

  // Find best matching task
  const findBestTask = useCallback((searchText, taskList) => {
    const normalized = normalizeText(searchText);
    let bestMatch = null;
    let bestScore = 0;
    
    for (const task of taskList) {
      const taskText = normalizeText(task.text);
      const score = fuzzyMatch(normalized, taskText);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = task;
      }
    }
    
    return { task: bestMatch, score: bestScore };
  }, [fuzzyMatch, normalizeText]);

  // Natural language date parsing
  const parseNaturalDate = useCallback((text) => {
    const now = new Date();
    const lowerText = text.toLowerCase();
    let date = new Date(now);
    
    // Time patterns
    const timeMatch = lowerText.match(/(\d{1,2})\s*(am|pm|:(\d{2}))?/);
    let hours = now.getHours();
    let minutes = 0;
    
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const isPM = lowerText.includes('pm') || (hour < 12 && lowerText.includes('p'));
      const isAM = lowerText.includes('am') || (hour === 12 && lowerText.includes('a'));
      
      if (timeMatch[3]) {
        minutes = parseInt(timeMatch[3]);
      }
      
      if (isPM && hour !== 12) {
        hours = hour + 12;
      } else if (isAM && hour === 12) {
        hours = 0;
      } else if (!isPM && !isAM) {
        hours = hour;
      } else {
        hours = hour;
      }
    }
    
    // Date patterns
    if (lowerText.includes('today')) {
      date = new Date(now);
    } else if (lowerText.includes('tomorrow')) {
      date = new Date(now);
      date.setDate(date.getDate() + 1);
    } else if (lowerText.includes('next week')) {
      date = new Date(now);
      date.setDate(date.getDate() + 7);
    } else if (lowerText.includes('next month')) {
      date = new Date(now);
      date.setMonth(date.getMonth() + 1);
    } else if (lowerText.match(/\d{1,2}\/\d{1,2}/)) {
      const dateMatch = lowerText.match(/(\d{1,2})\/(\d{1,2})/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        date = new Date(now.getFullYear(), month, day);
      }
    } else if (lowerText.includes('monday') || lowerText.includes('tuesday') || 
               lowerText.includes('wednesday') || lowerText.includes('thursday') ||
               lowerText.includes('friday') || lowerText.includes('saturday') || 
               lowerText.includes('sunday')) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.find(d => lowerText.includes(d));
      const targetDayIndex = days.indexOf(targetDay);
      const currentDay = now.getDay();
      let daysToAdd = targetDayIndex - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      date = new Date(now);
      date.setDate(date.getDate() + daysToAdd);
    }
    
    if (timeMatch) {
      date.setHours(hours, minutes, 0, 0);
    } else if (!lowerText.includes('today') && !lowerText.includes('tomorrow') && 
               !lowerText.includes('next') && !lowerText.match(/\d{1,2}\/\d{1,2}/) &&
               !lowerText.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
      return null; // No date found
    }
    
    return date.toISOString().slice(0, 16);
  }, []);

  const handleVoiceCommand = useCallback((command) => {
    const text = normalizeText(command);
    const originalText = command.trim();
    let response = '';

    // Command patterns with fuzzy matching
    const addTaskPatterns = ["add task", "create task", "new task", "add a task", "create a task", "make task"];
    const completePatterns = ["complete task", "finish task", "done task", "mark complete", "mark done", "complete"];
    const deletePatterns = ["delete task", "remove task", "delete", "remove"];
    const pendingPatterns = ["show pending", "pending tasks", "what's pending", "pending", "show pending tasks"];
    const overduePatterns = ["overdue", "what's overdue", "show overdue", "overdue tasks"];
    const markAllPatterns = ["mark all", "complete all", "done all", "finish all"];
    const showAllPatterns = ["show all", "list all", "all tasks", "show all tasks"];
    const completedPatterns = ["show completed", "completed tasks", "completed"];
    const countPatterns = ["how many", "task count", "how many tasks", "count tasks"];

    // Check for add task command with fuzzy matching
    const addTaskMatch = findBestCommand(text, addTaskPatterns);
    if (addTaskMatch) {
      // Extract task text more flexibly
      let taskText = text;
      for (const pattern of addTaskPatterns) {
        const regex = new RegExp(pattern.replace(/\s+/g, '\\s+'), 'i');
        taskText = taskText.replace(regex, '').trim();
      }
      taskText = taskText.replace(/\b(to|for|on|at|by)\b/gi, '').trim();
      
      // Extract date/time info
      const datePatterns = [
        /(today|tomorrow|next week|next month)/i,
        /(\d{1,2}\/\d{1,2})/,
        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /(\d{1,2})\s*(am|pm)/i,
        /at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i
      ];
      
      let dueDate = null;
      let dateText = '';
      
      for (const pattern of datePatterns) {
        const match = taskText.match(pattern);
        if (match) {
          dateText = match[0];
          dueDate = parseNaturalDate(taskText);
          taskText = taskText.replace(match[0], "").trim();
          break;
        }
      }
      
      // Clean up common words
      taskText = taskText.replace(/\b(to|for|on|at|by)\b/gi, "").trim();
      
      if (taskText) {
        setTasks(prev => [...prev, {
          id: Date.now(),
          text: taskText,
          completed: false,
          createdAt: new Date(),
          dueDate: dueDate,
          priority: 'medium',
          category: '',
          tags: [],
          subtasks: [],
          notes: '',
          recurring: null
        }]);
        response = `Added task: ${taskText}${dueDate ? ` for ${dateText}` : ''}`;
        setFeedback(response);
        setTimeout(() => setFeedback(''), 4000);
        speak(`Task added: ${taskText}${dueDate ? ` scheduled for ${dateText}` : ''}`);
      }
    }
    // Complete task with fuzzy matching
    else {
      const completeMatch = findBestCommand(text, completePatterns);
      if (completeMatch) {
        // Extract task name more flexibly
        let name = text;
        for (const pattern of completePatterns) {
          const regex = new RegExp(pattern.replace(/\s+/g, '\\s+'), 'i');
          name = name.replace(regex, '').trim();
        }
        
        setTasks(prev => {
          // Use fuzzy matching to find the task
          const pendingTasks = prev.filter(t => !t.completed);
          const match = findBestTask(name, pendingTasks);
          
          if (match.task && match.score >= 0.5) {
            const updated = prev.map(t => 
              t.id === match.task.id ? { ...t, completed: true } : t
            );
            setTimeout(() => {
              setFeedback(`Completed: ${match.task.text}`);
              speak(`Task completed: ${match.task.text}`);
              setTimeout(() => setFeedback(''), 3000);
            }, 0);
            return updated;
          } else {
            setTimeout(() => {
              setFeedback(`No matching task found: "${name}"`);
              speak("No matching task found");
              setTimeout(() => setFeedback(''), 3000);
            }, 0);
            return prev;
          }
        });
      }
      // Delete task with fuzzy matching
      else {
        const deleteMatch = findBestCommand(text, deletePatterns);
        if (deleteMatch) {
          let name = text;
          for (const pattern of deletePatterns) {
            const regex = new RegExp(pattern.replace(/\s+/g, '\\s+'), 'i');
            name = name.replace(regex, '').trim();
          }
          
          setTasks(prev => {
            const match = findBestTask(name, prev);
            if (match.task && match.score >= 0.5) {
              setTimeout(() => {
                setFeedback(`Deleted: ${match.task.text}`);
                speak(`Task deleted: ${match.task.text}`);
                setTimeout(() => setFeedback(''), 3000);
              }, 0);
              return prev.filter(t => t.id !== match.task.id);
            } else {
              setTimeout(() => {
                setFeedback(`No matching task found: "${name}"`);
                speak("No matching task found");
                setTimeout(() => setFeedback(''), 3000);
              }, 0);
              return prev;
            }
          });
        }
        // Show pending tasks with fuzzy matching
        else {
          const pendingMatch = findBestCommand(text, pendingPatterns);
          if (pendingMatch) {
            const currentTasks = tasksRef.current;
            const pending = currentTasks.filter(t => !t.completed);
            if (pending.length === 0) {
              response = "No pending tasks";
              setFeedback(response);
              setTimeout(() => setFeedback(''), 3000);
              speak("You have no pending tasks");
            } else {
              setFilter('pending');
              const taskList = pending.slice(0, 5).map(t => t.text).join(", ");
              response = `You have ${pending.length} pending task${pending.length > 1 ? 's' : ''}`;
              setFeedback(response);
              setTimeout(() => setFeedback(''), 4000);
              speak(`You have ${pending.length} pending task${pending.length > 1 ? 's' : ''}. ${taskList}`);
            }
          }
          // Show overdue tasks with fuzzy matching
          else {
            const overdueMatch = findBestCommand(text, overduePatterns);
            if (overdueMatch) {
              const currentTasks = tasksRef.current;
              const overdue = currentTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed);
              if (overdue.length === 0) {
                response = "No overdue tasks";
                setFeedback(response);
                setTimeout(() => setFeedback(''), 3000);
                speak("You have no overdue tasks");
              } else {
                const taskList = overdue.slice(0, 5).map(t => t.text).join(", ");
                response = `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`;
                setFeedback(response);
                setTimeout(() => setFeedback(''), 4000);
                speak(`You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. ${taskList}`);
              }
            }
            // Mark all as done with fuzzy matching
            else {
              const markAllMatch = findBestCommand(text, markAllPatterns);
              if (markAllMatch && (text.includes("done") || text.includes("complete") || text.includes("finish"))) {
                setTasks(prev => {
                  const pending = prev.filter(t => !t.completed);
                  const updated = prev.map(t => ({ ...t, completed: true }));
                  const pendingCount = pending.length;
                  setTimeout(() => {
                    setFeedback(`Marked all ${pendingCount} tasks as completed`);
                    speak(`All ${pendingCount} tasks marked as completed`);
                    setTimeout(() => setFeedback(''), 3000);
                  }, 0);
                  return updated;
                });
              }
              // Show all tasks with fuzzy matching
              else {
                const showAllMatch = findBestCommand(text, showAllPatterns);
                if (showAllMatch) {
                  const currentTasks = tasksRef.current;
                  setFilter('all');
                  response = `Showing all ${currentTasks.length} tasks`;
                  setFeedback(response);
                  setTimeout(() => setFeedback(''), 3000);
                  speak(`You have ${currentTasks.length} total tasks`);
                }
                // Show completed tasks with fuzzy matching
                else {
                  const completedMatch = findBestCommand(text, completedPatterns);
                  if (completedMatch) {
                    const currentTasks = tasksRef.current;
                    const completed = currentTasks.filter(t => t.completed);
                    setFilter('completed');
                    response = `Showing ${completed.length} completed tasks`;
                    setFeedback(response);
                    setTimeout(() => setFeedback(''), 3000);
                    speak(`You have ${completed.length} completed tasks`);
                  }
                  // Task count with fuzzy matching
                  else {
                    const countMatch = findBestCommand(text, countPatterns);
                    if (countMatch) {
                      const currentTasks = tasksRef.current;
                      const pending = currentTasks.filter(t => !t.completed).length;
                      const completed = currentTasks.filter(t => t.completed).length;
                      response = `You have ${currentTasks.length} total tasks, ${pending} pending, and ${completed} completed`;
                      setFeedback(response);
                      setTimeout(() => setFeedback(''), 4000);
                      speak(`You have ${currentTasks.length} total tasks. ${pending} pending and ${completed} completed`);
                    }
                    // Unknown command - provide suggestions
                    else {
                      // Try to find closest command match
                      const allCommands = [
                        ...addTaskPatterns,
                        ...completePatterns,
                        ...deletePatterns,
                        ...pendingPatterns,
                        ...overduePatterns,
                        ...markAllPatterns,
                        ...showAllPatterns,
                        ...completedPatterns,
                        ...countPatterns
                      ];
                      const closest = findBestCommand(text, allCommands);
                      
                      if (closest) {
                        response = `Did you mean "${closest}"? Command: "${originalText}"`;
                        setFeedback(response);
                        setTimeout(() => setFeedback(''), 4000);
                        speak(`I'm not sure. Did you mean ${closest}?`);
                      } else {
                        response = `Unknown command: "${originalText}". Try: "add task", "show pending", "what's overdue"`;
                        setFeedback(response);
                        setTimeout(() => setFeedback(''), 4000);
                        speak("I didn't understand that command");
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, [speak, parseNaturalDate, normalizeText, findBestCommand, findBestTask]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true; // Enable for better feedback
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives

      recognitionRef.current.onresult = (event) => {
        // Get the best result with highest confidence
        let bestResult = null;
        let bestConfidence = 0;
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            for (let j = 0; j < result.length; j++) {
              const alternative = result[j];
              if (alternative.confidence > bestConfidence) {
                bestConfidence = alternative.confidence;
                bestResult = alternative.transcript;
              }
            }
          }
        }
        
        // Fallback to first result if no confidence scores
        const command = bestResult || event.results[event.results.length - 1][0].transcript;
        setTranscript(command);
        
        // Only process if confidence is reasonable or if it's the final result
        if (bestConfidence > 0.5 || event.results[event.results.length - 1].isFinal) {
          handleVoiceCommand(command);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          setFeedback('No speech detected. Please try again.');
          setTimeout(() => setFeedback(''), 3000);
        } else if (event.error === 'audio-capture') {
          setFeedback('Microphone not found. Please check your microphone.');
          setTimeout(() => setFeedback(''), 3000);
        } else if (event.error === 'not-allowed') {
          setFeedback('Microphone permission denied. Please allow microphone access.');
          setTimeout(() => setFeedback(''), 3000);
        } else {
          setFeedback('Recognition error. Please try again.');
          setTimeout(() => setFeedback(''), 3000);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [handleVoiceCommand]);

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks
    .filter(t => (filter === 'all' ? true : filter === 'completed' ? t.completed : !t.completed))
    .filter(t => (categoryFilter === 'all' ? true : t.category === categoryFilter))
    .filter(t => (priorityFilter === 'all' ? true : t.priority === priorityFilter))
    .filter(t => {
      const searchLower = search.toLowerCase();
      return t.text.toLowerCase().includes(searchLower) ||
             (t.notes && t.notes.toLowerCase().includes(searchLower)) ||
             (t.category && t.category.toLowerCase().includes(searchLower)) ||
             (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchLower)));
    })
    .sort((a, b) => {
      if (sort === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      return sort === 'created'
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    });
  
  const allCategories = [...new Set(tasks.map(t => t.category).filter(Boolean))];

  const addManualTask = (template = null) => {
    if (template) {
      const newTask = {
        id: Date.now(),
        text: template.text,
        completed: false,
        createdAt: new Date(),
        dueDate: null,
        priority: template.priority || 'medium',
        category: template.category || '',
        tags: [],
        subtasks: [],
        notes: '',
        recurring: null
      };
      setTasks(prev => [...prev, newTask]);
      setFeedback(`Added template: ${template.name}`);
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    
    setTaskModalData({
      text: '',
      dueDate: null,
      priority: 'medium',
      category: '',
      tags: [],
      subtasks: [],
      notes: '',
      recurring: null
    });
    setShowTaskModal(true);
  };

  const saveTask = (taskData, taskId = null) => {
    if (taskId) {
      // Update existing task
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...taskData } : t));
      setFeedback('Task updated');
    } else {
      // Create new task
      const newTask = {
        id: Date.now(),
        ...taskData,
        completed: false,
        createdAt: new Date()
      };
      setTasks(prev => [...prev, newTask]);
      setFeedback('Task added');
    }
    setTimeout(() => setFeedback(''), 3000);
    setShowTaskModal(false);
    setTaskModalData(null);
    setEditingTask(null);
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const addSubtask = (taskId, subtaskText) => {
    if (!subtaskText?.trim()) return;
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, subtasks: [...(t.subtasks || []), { id: Date.now(), text: subtaskText, completed: false }] }
        : t
    ));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, subtasks: (t.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )}
        : t
    ));
  };

  const deleteSubtask = (taskId, subtaskId) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) }
        : t
    ));
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getPriorityLabel = (priority) => {
    return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'None';
  };

  // Handle recurring tasks
  useEffect(() => {
    const checkRecurringTasks = () => {
      const now = new Date();
      setTasks(prev => prev.map(task => {
        if (!task.recurring || task.completed) return task;
        
        const lastDue = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
        const daysSince = Math.floor((now - lastDue) / (1000 * 60 * 60 * 24));
        
        let shouldRecur = false;
        if (task.recurring === 'daily' && daysSince >= 1) shouldRecur = true;
        else if (task.recurring === 'weekly' && daysSince >= 7) shouldRecur = true;
        else if (task.recurring === 'monthly' && daysSince >= 30) shouldRecur = true;
        
        if (shouldRecur && task.completed) {
          const newDueDate = new Date(lastDue);
          if (task.recurring === 'daily') newDueDate.setDate(newDueDate.getDate() + 1);
          else if (task.recurring === 'weekly') newDueDate.setDate(newDueDate.getDate() + 7);
          else if (task.recurring === 'monthly') newDueDate.setMonth(newDueDate.getMonth() + 1);
          
          return {
            ...task,
            completed: false,
            dueDate: newDueDate.toISOString().slice(0, 16)
          };
        }
        return task;
      }));
    };
    
    const interval = setInterval(checkRecurringTasks, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

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
              {transcript && (
                <p style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: '0 0 8px 0',
                  fontStyle: 'italic'
                }}>
                  Heard: "{transcript}"
                </p>
              )}
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
              onClick={() => addManualTask()}
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

          {/* Task Templates */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#64748b', width: '100%', marginBottom: '8px' }}>Quick Templates:</span>
            {taskTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => addManualTask(template)}
                style={{
                  padding: '6px 12px',
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#334155';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.borderColor = '#334155';
                }}
              >
                {template.name}
              </button>
            ))}
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
              >
                <option value="created">Created</option>
                <option value="due">Due Date</option>
                <option value="priority">Priority</option>
              </select>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
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
              >
                <option value="all">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
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
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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
              {filteredTasks.map(task => {
                const isExpanded = expandedTasks.has(task.id);
                const isEditing = editingTask === task.id;
                const subtasks = task.subtasks || [];
                const completedSubtasks = subtasks.filter(st => st.completed).length;
                
                return (
                  <div
                    key={task.id}
                    style={{
                      background: task.completed ? '#050816' : '#0a0f1a',
                      border: `1px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#1e293b'}`,
                      borderRadius: '10px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px'
                    }}>
                      <button
                        onClick={() => toggleTaskExpand(task.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

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
                        {isEditing ? (
                          <input
                            type="text"
                            defaultValue={task.text}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== task.text) {
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, text: e.target.value.trim() } : t));
                              }
                              setEditingTask(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              } else if (e.key === 'Escape') {
                                setEditingTask(null);
                              }
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              background: '#050816',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              color: '#f1f5f9',
                              fontSize: '15px',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <p 
                            onClick={() => setEditingTask(task.id)}
                            style={{
                              margin: '0',
                              fontSize: '15px',
                              color: task.completed ? '#64748b' : '#f1f5f9',
                              textDecoration: task.completed ? 'line-through' : 'none',
                              wordBreak: 'break-word',
                              cursor: 'pointer'
                            }}
                          >
                            {task.text}
                          </p>
                        )}
                        
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {task.priority && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              background: getPriorityColor(task.priority) + '20',
                              border: `1px solid ${getPriorityColor(task.priority)}`,
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: getPriorityColor(task.priority)
                            }}>
                              <Flag size={10} />
                              {getPriorityLabel(task.priority)}
                            </span>
                          )}
                          
                          {task.category && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              background: '#1e3a8a20',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#60a5fa'
                            }}>
                              <Tag size={10} />
                              {task.category}
                            </span>
                          )}
                          
                          {task.dueDate && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#64748b'
                            }}>
                              <Calendar size={10} />
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                          
                          {task.recurring && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#64748b'
                            }}>
                              <Repeat size={10} />
                              {task.recurring}
                            </span>
                          )}
                          
                          {subtasks.length > 0 && (
                            <span style={{
                              fontSize: '11px',
                              color: '#64748b'
                            }}>
                              {completedSubtasks}/{subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setTaskModalData({ ...task });
                          setShowTaskModal(true);
                        }}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#1e293b';
                          e.currentTarget.style.color = '#60a5fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#64748b';
                        }}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => {
                          setTasks(prev => prev.filter(t => t.id !== task.id));
                          setFeedback('Task deleted');
                          setTimeout(() => setFeedback(''), 3000);
                        }}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          borderRadius: '4px'
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
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '0 16px 16px 16px',
                        borderTop: '1px solid #1e293b',
                        marginTop: '12px',
                        paddingTop: '12px'
                      }}>
                        {task.notes && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <FileText size={12} color="#64748b" />
                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Notes</span>
                            </div>
                            <p style={{
                              margin: '0',
                              fontSize: '13px',
                              color: '#94a3b8',
                              padding: '8px',
                              background: '#050816',
                              borderRadius: '6px',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {task.notes}
                            </p>
                          </div>
                        )}

                        {subtasks.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <Layers size={12} color="#64748b" />
                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Subtasks</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {subtasks.map(subtask => (
                                <div key={subtask.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  background: '#050816',
                                  borderRadius: '6px'
                                }}>
                                  <button
                                    onClick={() => toggleSubtask(task.id, subtask.id)}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '3px',
                                      border: `2px solid ${subtask.completed ? '#22c55e' : '#475569'}`,
                                      background: subtask.completed ? '#22c55e' : 'transparent',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}
                                  >
                                    {subtask.completed && <Check size={10} color="white" />}
                                  </button>
                                  <span style={{
                                    flex: 1,
                                    fontSize: '13px',
                                    color: subtask.completed ? '#64748b' : '#f1f5f9',
                                    textDecoration: subtask.completed ? 'line-through' : 'none'
                                  }}>
                                    {subtask.text}
                                  </span>
                                  <button
                                    onClick={() => deleteSubtask(task.id, subtask.id)}
                                    style={{
                                      padding: '4px',
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#64748b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Add subtask..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  addSubtask(task.id, e.target.value.trim());
                                  e.target.value = '';
                                }
                              }}
                              style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '6px 8px',
                                background: '#0a0f1a',
                                border: '1px solid #1e293b',
                                borderRadius: '6px',
                                color: '#f1f5f9',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Modal */}
        {showTaskModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowTaskModal(false);
            setTaskModalData(null);
          }}
          >
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '20px' }}>
                  {taskModalData?.id ? 'Edit Task' : 'New Task'}
                </h3>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskModalData(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Task Name *
                  </label>
                  <input
                    type="text"
                    value={taskModalData?.text || ''}
                    onChange={(e) => setTaskModalData({ ...taskModalData, text: e.target.value })}
                    placeholder="Enter task name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#050816',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                      Priority
                    </label>
                    <select
                      value={taskModalData?.priority || 'medium'}
                      onChange={(e) => setTaskModalData({ ...taskModalData, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#050816',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                      Category
                    </label>
                    <input
                      type="text"
                      value={taskModalData?.category || ''}
                      onChange={(e) => setTaskModalData({ ...taskModalData, category: e.target.value })}
                      placeholder="Work, Personal, etc."
                      list="categories"
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#050816',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <datalist id="categories">
                      {allCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={taskModalData?.dueDate ? new Date(taskModalData.dueDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setTaskModalData({ ...taskModalData, dueDate: e.target.value ? new Date(e.target.value).toISOString().slice(0, 16) : null })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#050816',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Recurring
                  </label>
                  <select
                    value={taskModalData?.recurring || ''}
                    onChange={(e) => setTaskModalData({ ...taskModalData, recurring: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#050816',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  >
                    <option value="">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Notes
                  </label>
                  <textarea
                    value={taskModalData?.notes || ''}
                    onChange={(e) => setTaskModalData({ ...taskModalData, notes: e.target.value })}
                    placeholder="Add notes or description..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#050816',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setTaskModalData(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#1e293b',
                      color: '#f1f5f9',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (taskModalData?.text?.trim()) {
                        saveTask(taskModalData, taskModalData?.id);
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#1e40af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          padding: '20px',
          color: '#475569',
          fontSize: '13px'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Voice commands: "add task [name] [time]", "complete task [name]", "delete task [name]"
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>
            Try: "show pending tasks", "what's overdue", "mark all as done", "add task buy groceries tomorrow at 3pm"
          </p>
        </div>
      </div>
    </div>
  );
}
