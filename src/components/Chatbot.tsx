import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Mic, MicOff, Download } from 'lucide-react';
import ChartDisplay from './ChartDisplay';
import Table from './ui/Table';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { exportToCsv } from '../services/api';
import { AuthUser } from '../types/types'; // Assuming AuthUser is now in types/types.ts

// Declare SpeechRecognition types globally if not already in your project's d.ts files
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Removing local AuthUser interface as it's imported
// interface AuthUser {
//   token: string;
//   username: string;
// }

interface ChatMessage {
  sender: 'user' | 'bot';
  type: 'text' | 'chart' | 'table';
  content?: string;
  title?: string;
  chartType?: 'bar' | 'line' | 'pie' | undefined;
  data?: any;
  options?: any;
  headers?: string[];
  rows?: any[][];
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      let finalTranscript = '';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
        finalTranscript = transcript;
        // No longer update messages here, only update input
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (finalTranscript && finalTranscript.trim() !== '') {
          setInput(finalTranscript);
          setTimeout(() => {
            handleSendMessage(finalTranscript);
          }, 100); // slight delay to ensure input is set
        } else {
          setMessages((prevMessages) => {
            const lastMessageIndex = prevMessages.length - 1;
            const lastMessage = prevMessages[lastMessageIndex];
            if (lastMessage && lastMessage.sender === 'user') {
              if (!lastMessage.content || lastMessage.content === '...') {
                return [
                  ...prevMessages.slice(0, lastMessageIndex),
                  { sender: 'bot', type: 'text', content: "I didn't hear anything. Please speak clearly or try again." }
                ];
              } else if (typeof lastMessage.content === 'string' && lastMessage.content.endsWith('...')) {
                return [
                  ...prevMessages.slice(0, lastMessageIndex),
                  { sender: 'user', type: 'text', content: typeof lastMessage.content === 'string' ? lastMessage.content.slice(0, -3) : '' }
                ];
              }
            }
            return prevMessages;
          });
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        let errorMessage = "Sorry, I couldn't understand your voice input. Please try again or use text.";
        if (event.error === 'no-speech') {
          errorMessage = "I didn't hear anything. Please speak clearly or try again.";
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        }
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'bot', type: 'text', content: errorMessage }
        ]);
      };

      recognitionRef.current.onstart = () => {
        console.log('Recording started');
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'user', type: 'text', content: '...' } // Start with dots to indicate listening
        ]);
      };
    } else {
      setIsSpeechSupported(false);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', type: 'text', content: 'Speech recognition is not supported in your browser. Please use text input.' }
      ]);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!isSpeechSupported) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      // Request microphone permission before starting recognition
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          recognitionRef.current.start();
          setIsRecording(true);
        })
        .catch((error) => {
          console.error('Microphone access error:', error);
          setIsRecording(false);
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: 'bot', type: 'text', content: 'Failed to access microphone. Please allow microphone access.' }
          ]);
        });
    }
  };

  const handleSendMessage = async (overrideInput?: string) => {
    const messageToSend = typeof overrideInput === 'string' ? overrideInput : input;
    if (messageToSend.trim() === '') return;

    const userMessage: ChatMessage = { sender: 'user', type: 'text', content: messageToSend.trim() };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');

    try {
      const response = await axios.post(
        'http://localhost:5000/chat',
        { question: userMessage.content, user: user?.username }, // Use optional chaining just in case
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token || 'dummy-token'}` // Use dummy token if user or token is null
          }
        }
      );

      // Unpack the backend response and push correct message(s)
      const { type, answer, title, headers, rows, chart } = response.data;
      const newMessages: ChatMessage[] = [];

      // Always show the summary/answer if present
      if (answer) {
        newMessages.push({ sender: 'bot', type: 'text', content: answer });
      }
      // Show table if present
      if (type === 'table' && headers && rows) {
        newMessages.push({
          sender: 'bot',
          type: 'table',
          title,
          headers,
          rows
        });
        // If chart is present in a table response, also push a chart message
        if (chart) {
          newMessages.push({
            sender: 'bot',
            type: 'chart',
            title,
            chartType: chart.type,
            data: chart.data,
            options: chart.options
          });
        }
      }
      // Show chart if present (either as main type or as part of table)
      else if (type === 'chart' && chart) {
        newMessages.push({ sender: 'bot', type: 'chart', title, chartType: chart.type, data: chart.data, options: chart.options });
      }
      // If only text (no table/chart), fallback
      if (newMessages.length === 0 && !answer) { // Only fallback if no answer was provided either
        newMessages.push({ sender: 'bot', type: 'text', content: 'Received a response, but no displayable content.' });
      } else if (newMessages.length === 0 && answer) {
         // This case should ideally not happen if answer is present
         newMessages.push({ sender: 'bot', type: 'text', content: answer });
      }

      setMessages((prevMessages) => [...prevMessages, ...newMessages]);
    } catch (error) {
      console.error('Error sending message to chatbot API:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', type: 'text', content: 'Oops! Something went wrong communicating with the chatbot.' }
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleExportTable = (headers: string[], rows: any[][]) => {
    const data = rows.map(row => {
      const rowData: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });
    exportToCsv(data, 'chatbot-table-export');
  };

  const handleTablePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col flex-grow h-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-600 text-white">
        <MessageSquare className="w-6 h-6 mr-2" />
        <h1 className="text-xl font-semibold">AI Assistant</h1>
      </div>

      {/* Main Chat Area */}
      <div className="relative flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Welcome Message */}
        {messages.length === 0 && !isRecording && (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
             <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
               <Bot className="w-12 h-12 text-purple-600 dark:text-purple-300" />
             </div>
             <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Welcome to AI Assistant</h2>
             <p className="text-gray-600 dark:text-gray-400 max-w-md">
               I'm here to help you with your questions. You can type or use voice commands to interact with me.
             </p>
             {isSpeechSupported && (
               <button
                 onClick={toggleRecording}
                 className="mt-6 p-4 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 bg-purple-600 text-white hover:bg-purple-700"
                 aria-label={'Start recording'}
               >
                 <Mic size={24} />
               </button>
             )}
           </div>
         )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 z-10">
            <div className="flex flex-col items-center justify-center p-8 rounded-lg shadow-lg bg-purple-600 text-white animate-pulse">
              <Mic size={48} className="mb-4" />
              <p className="text-lg font-semibold">Listening...</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`flex items-start max-w-[90%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] p-4 rounded-xl shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
              }`}
            >
              <div className="mr-3 flex-shrink-0 mt-1">
                {msg.sender === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
                    <User size={16} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0 overflow-hidden">
                {msg.type === 'text' && (
                  <div className="prose dark:prose-invert max-w-none">
                    {typeof msg.content === 'string' || typeof msg.content === 'number' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : msg.content ? (
                      <pre className="text-xs text-red-600 bg-red-50 p-2 rounded">{JSON.stringify(msg.content, null, 2)}</pre>
                    ) : null}
                  </div>
                )}
                {msg.type === 'chart' && msg.data && (
                  <div className="w-full h-96 bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto dark:text-gray-200">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">{msg.title}</h3>
                    <ChartDisplay data={msg.data} options={msg.options} chartType={msg.chartType || 'bar'} />
                  </div>
                )}
                {msg.type === 'table' && msg.headers && msg.rows && (
                  <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{msg.title}</h3>
                      <button
                        onClick={() => msg.headers && msg.rows && handleExportTable(msg.headers, msg.rows)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        title="Export to CSV"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <Table
                        columns={msg.headers.map((header, index) => ({
                          id: header,
                          header: header,
                          accessor: (row: any) => row[index],
                          sortable: true
                        }))}
                        data={msg.rows.map((row, index) => ({ id: index, ...row }))}
                        keyExtractor={(item) => item.id}
                        isPaginated={true}
                        itemsPerPage={5}
                        currentPage={currentPage}
                        onPageChange={handleTablePageChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400"
            placeholder="Type your message or speak..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {isSpeechSupported && (
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
          <button
            onClick={() => handleSendMessage()}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
            aria-label="Send message" disabled={!input.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;