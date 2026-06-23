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
const multer = require('multer');//library for handling file uploads in Express
const mammoth = require('mammoth');//mammoth variable now = an object, the library for reading docx files
const pdfParse = require('pdf-parse');//variable for reading pdf files

// Creates your server instance. The factory function imported above is called and an object has been made that is ready to act as the server.
const app = express();

const upload = multer({ storage: multer.memoryStorage() });//configures multer to hold the uploaded file in RAM instead of saving it to disk

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

app.post('/api/extract-text', upload.single('lessonFile'), async (req, res) => {//new route — fires when the frontend uploads a file under the field name 'lessonFile'
  try {
    const file = req.file;//multer attaches the uploaded file here as a buffer (raw bytes in memory)
    if (!file) return res.status(400).json({ error: 'No file received' });//bail out early if somehow no file came through

    let rawText = '';//will hold whatever text we manage to pull out of the file

    if (file.originalname.toLowerCase().endsWith('.docx')) {//checks the filename extension, case-insensitive
      const result = await mammoth.extractRawText({ buffer: file.buffer });//mammoth reads the docx buffer and extracts plain text
      rawText = result.value;//the extracted text lives on .value
    } else if (file.originalname.toLowerCase().endsWith('.pdf')) {
      const result = await pdfParse(file.buffer);//pdf-parse reads the pdf buffer and extracts plain text
      rawText = result.text;//the extracted text lives on .text
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a .docx or .pdf file.' });//rejects anything that isn't docx or pdf
    }

    const cleanupResponse = await fetch('https://api.anthropic.com/v1/messages', {//sends the messy raw text to Claude for cleanup
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',//cheapest model tier — this is a simple cleanup task, not complex reasoning
        max_tokens: 2000,
        system: 'You clean up raw text extracted from lesson documents (PDF or Word). Remove page numbers, headers, footers, and extraction artifacts. Preserve all actual lesson content — vocabulary terms and grammar rules/examples should remain clearly distinguishable. Output only the cleaned lesson text, with no preamble or commentary.',
        messages: [{ role: 'user', content: rawText }]
      })
    });

    const cleanupData = await cleanupResponse.json();//parses Claude's response from raw HTTP into a JS object
    const cleanedText = cleanupData.content?.[0]?.text || rawText;//grabs the cleaned text; falls back to the raw text if anything about the Claude call went wrong
    console.log('\n===== RAW EXTRACTED TEXT (pdf-parse output) =====\n', rawText, '\n===== END RAW =====\n');//TEMP: shows the noisy text pdf-parse pulled straight from the PDF, before any cleanup
    console.log('\n===== CLEANED TEXT (Haiku output) =====\n', cleanedText, '\n===== END CLEANED =====\n');//TEMP: shows the final text the quiz engine actually receives, after Haiku cleanup
    res.json({ text: cleanedText });//sends the final cleaned text back to the frontend

  } catch (err) {
    console.error('Extraction error:', err);//logs the real error in your terminal for debugging
    res.status(500).json({ error: 'Failed to extract text from file: ' + err.message });//sends a readable error back to the frontend
  }
});

// Start the server and listen for requests on port 3000
// The callback just confirms in the terminal that it started successfully
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
