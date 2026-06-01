import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint for PaaS orchestrators
app.get('/health', (req, res) => res.status(200).send('OK'));

// Handle client-side routing, return all requests to React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Production frontend server is running on port ${PORT}`);
});
