// npm install express body-parser cors ws
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { promisify } from 'util';

// Get current file directory with ESM support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_KEY = '7803a4fa7f34eedfda91dfd8b622f1b0';
function authenticateRequest(req, res, next) {
  const authKey = req.headers['auth-key'];
  if (!authKey || authKey !== AUTH_KEY) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  next();
}

// Configuration
const PORT = process.env.PORT || 8003;
const STORAGE_FILE = path.join(__dirname, 'temp.txt');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server to host both Express and WebSocket
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

// ================ CORE FUNCTIONALITY ================

// Core function for storing text
async function storeText(text) {
  if (!text) {
    throw new Error('Text is required');
  }
  
  console.log(`Storing text with length: ${text.length}`);
  
  // a simpe storage object
  const storageObject = {
    id: Date.now(), // Simple timestamp ID
    text: text,
    timestamp: new Date().toISOString()
  };
  
  // save to file
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageObject, null, 2));
  
  console.log(`Successfully stored text with ID: ${storageObject.id}`);
  return { 
    status: 'success', 
    id: storageObject.id, 
    text_length: text.length 
  };
}

async function retrieveText() {
  console.log('Retrieving stored text');
  
  // Check if file exists
  if (!fs.existsSync(STORAGE_FILE)) {
    return {
      status: 'success',
      results: []
    };
  }
  
  try {
    // read from file
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const storageObject = JSON.parse(data);
    
    // return as object (easily extendable in the future)
    const result = {
      id: storageObject.id,
      text: storageObject.text,
      timestamp: storageObject.timestamp
    };
    
    console.log(`Retrieved stored text with ID: ${result.id}`);
    return {
      status: 'success',
      results: [result]
    };
  } catch (error) {
    console.error('Error retrieving text:', error);
    throw error;
  }
}

// ================ HTTP ENDPOINTS ================

// Endpoint to store text
app.use('/store', authenticateRequest);
app.post('/store', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await storeText(text);
    return res.json(result);
  } catch (error) {
    console.error('Error in /store:', error);
    return res.status(500).json({ error: `Failed to store text: ${error.message}` });
  }
});

// Endpoint to retrieve text
app.use('/retrieve', authenticateRequest);
app.post('/retrieve', async (req, res) => {
  try {
    const results = await retrieveText();
    return res.json(results);
  } catch (error) {
    console.error('Error in /retrieve:', error);
    return res.status(500).json({ error: `Retrieval failed: ${error.message}` });
  }
});

// ================ WEBSOCKET SERVER ================

// init WebSocket server
const wss = new WebSocketServer({ 
  server,
  verifyClient: ({ req }) => {
    // extract auth key from URL query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const authKey = url.searchParams.get('authKey');
    return authKey === AUTH_KEY;
  }
});

// WebSocket connection handler
wss.on('connection', function connection(ws, req) {
  // auready authenticated at connection time
  const authenticated = true;
  
  console.log('New WebSocket connection established (authenticated)');
  
  // send welcome message
  ws.send(JSON.stringify({
    type: 'info',
    message: 'Connected to simple storage server.'
  }));
  
  // Message handler
  ws.on('message', async function incoming(message) {
    try {
      const data = JSON.parse(message);
      
      // switch by type of message
      switch (data.type) {
        case 'store':
          console.log('(websocket) store command)');
          try {
            const storeResult = await storeText(data.text);
            ws.send(JSON.stringify({
              type: 'store',
              status: 'success',
              result: storeResult,
              requestId: data.requestId
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'store',
              status: 'error',
              message: error.message,
              requestId: data.requestId
            }));
          }
          break;
          
        case 'retrieve':
          console.log('(websocket) retrieve command)');
          try {
            const retrieveResults = await retrieveText();
            ws.send(JSON.stringify({
              type: 'retrieve',
              status: 'success',
              results: retrieveResults.results,
              requestId: data.requestId
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'retrieve',
              status: 'error',
              message: error.message,
              requestId: data.requestId
            }));
          }
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown operation type',
            requestId: data.requestId
          }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message: ' + error.message
      }));
    }
  });
  
  // disconnection handler
  ws.on('close', function close() {
    console.log('WebSocket connection closed');
  });
});

// start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Storage file: ${STORAGE_FILE}`);
  console.log(`WebSocket and HTTP endpoints available`);
});

// server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
});