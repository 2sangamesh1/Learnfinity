#!/usr/bin/env node

/**
 * Learnfinity Backend Startup Script
 * Starts both Node.js main backend and Python ML microservice
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Learnfinity Hybrid Backend Architecture...\n');

// Start Python ML Microservice
console.log('🐍 Starting Python ML Microservice on port 8000...');
const pythonBackend = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
  cwd: path.join(__dirname, 'python-backend'),
  stdio: 'pipe'
});

pythonBackend.stdout.on('data', (data) => {
  console.log(`[Python ML] ${data.toString().trim()}`);
});

pythonBackend.stderr.on('data', (data) => {
  console.error(`[Python ML Error] ${data.toString().trim()}`);
});

// Start Node.js Main Backend
console.log('🟢 Starting Node.js Main Backend on port 3001...');
const nodeBackend = spawn('node', ['index.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe'
});

nodeBackend.stdout.on('data', (data) => {
  console.log(`[Node.js] ${data.toString().trim()}`);
});

nodeBackend.stderr.on('data', (data) => {
  console.error(`[Node.js Error] ${data.toString().trim()}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backends...');
  pythonBackend.kill();
  nodeBackend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backends...');
  pythonBackend.kill();
  nodeBackend.kill();
  process.exit(0);
});

// Wait a moment for services to start
setTimeout(() => {
  console.log('\n✅ Both backends are starting up!');
  console.log('📊 Node.js Main Backend: http://localhost:3001');
  console.log('🧠 Python ML Microservice: http://localhost:8000');
  console.log('🔗 Frontend should connect to: http://localhost:3001');
  console.log('\nPress Ctrl+C to stop both services\n');
}, 2000);
