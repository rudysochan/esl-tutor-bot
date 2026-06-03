//running our node file through the VS terminal, Node wraps our file in a Node environment where it has access to global variables and functions. the terminal command is 'node server.js'. must navigate to folder in terminal before running.
//Node is the runtime environment — it's what allows JavaScript to run outside of a browser, on your machine. By itself, Node isn't a server, it's just an environment that can run JavaScript.
// Express is what actually makes your program behave like a server — it listens for incoming requests, handles routing, serves files, etc.
// dotenv reads your .env file and loads its values into process.env; process is a global object that Node.js creates automatically every time it runs a program
// Must run before anything tries to read process.env, so it goes first
require('dotenv').config();

// Diagnostic: confirms whether the key was loaded successfully
// The ? 'YES' : 'NO' is a ternary — if the value exists, print YES, else NO
// This never prints the actual key, just confirms it's there
console.log('Key loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');

// 'Express' is a framework that makes building a Node web server much simpler. require() found and loaded the 'express' package, and const express stores a reference to the factory function it returned. Calling express() builds and returns a new Express application. 
//node modules are in the project folder because we used npm to download them. require() reads from from that folder, which is a local library.
const express = require('express');

// Creates your server instance. The factory function imported above is called and an object has been made that is ready to act as the server.
const app = express();

// Tells Express to automatically parse incoming JSON request bodies
// Without this, req.body would be undefined
// req is the request object Express creates when the browser sends a request.
// It contains everything about that request: req.body (the payload/data), 
// req.headers (metadata), req.method (GET, POST, etc.)
//app.use() is a method (function) built into the Express application object. Calling it registers middleware — code that runs on every incoming request before it reaches your routes.The line says: "Call the use method on app, passing in the JSON-parsing middleware that express.json() returns — so every incoming request gets its body parsed before we try to read it." Middleware - a checkpoint every request passes through before reaching its destination.
app.use(express.json());

// Tells Express to serve any static files (HTML, CSS, JS) from this folder
// __dirname = the folder server.js lives in
// This is how http://localhost:3000 serves your index.html
app.use(express.static(__dirname));

// Defines a route: when the browser POSTs to /api/chat, run this function
// async means this function can use await (pause and wait for responses)
// req = the incoming request from the browser, res = your response back to it
app.post('/api/chat', async (req, res) => {

  // Forward the request to Anthropic's API
  // await pauses here until Anthropic responds
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY
    },
    // req.body is what the browser sent — we pass it straight through to Anthropic
    body: JSON.stringify(req.body)
  });

  // Parse Anthropic's response from raw HTTP into a JS object
  const data = await response.json();

  // Send Anthropic's response back to the browser
  res.json(data);
});

// Start the server and listen for requests on port 3000
// The callback just confirms in the terminal that it started successfully
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});