import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getFilters, addFilter, updateFilter, deleteFilter, findMatchingResponse } from './src/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Authentication Middleware ---
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD not set in environment' });
    }

    if (authHeader === `Bearer ${adminPassword}`) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // --- API Routes ---
  
  // Login
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      res.json({ success: true, token: password });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  });

  // Get all filters
  app.get('/api/filters', requireAuth, (req, res) => {
    try {
      const filters = getFilters();
      res.json(filters);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch filters' });
    }
  });

  // Add a filter
  app.post('/api/filters', requireAuth, (req, res) => {
    try {
      const { keyword, response, is_exact_match } = req.body;
      if (!keyword || !response) {
        return res.status(400).json({ error: 'Keyword and response are required' });
      }
      const newFilter = addFilter(keyword, response, is_exact_match);
      res.json(newFilter);
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Keyword already exists' });
      } else {
        res.status(500).json({ error: 'Failed to add filter' });
      }
    }
  });

  // Update a filter
  app.put('/api/filters/:id', requireAuth, (req, res) => {
    try {
      const { keyword, response, is_exact_match } = req.body;
      if (!keyword || !response) {
        return res.status(400).json({ error: 'Keyword and response are required' });
      }
      const updatedFilter = updateFilter(Number(req.params.id), keyword, response, is_exact_match);
      res.json(updatedFilter);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update filter' });
    }
  });

  // Delete a filter
  app.delete('/api/filters/:id', requireAuth, (req, res) => {
    try {
      deleteFilter(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete filter' });
    }
  });

  // --- Telegram Webhook ---
  app.post('/api/telegram/webhook', async (req, res) => {
    // Acknowledge receipt immediately so Telegram doesn't retry
    res.sendStatus(200);

    const update = req.body;
    
    // We only care about messages with text
    if (!update || !update.message || !update.message.text) {
      return;
    }

    const chatId = update.message.chat.id;
    const messageText = update.message.text;

    const responseText = findMatchingResponse(messageText);

    if (responseText) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return;
      }

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            reply_to_message_id: update.message.message_id, // Reply to the user
          }),
        });
      } catch (error) {
        console.error('Failed to send message to Telegram:', error);
      }
    }
  });

  // Webhook registration endpoint (Admin can trigger this)
  app.post('/api/telegram/register-webhook', requireAuth, async (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = process.env.APP_URL;

    if (!botToken || !appUrl) {
      return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN or APP_URL not set' });
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message'],
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Failed to register webhook:', error);
      res.status(500).json({ error: 'Failed to register webhook' });
    }
  });
  
  app.get('/api/telegram/webhook-info', requireAuth, async (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get webhook info' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
