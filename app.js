const express = require('express');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const {SessionsClient} = require('@google-cloud/dialogflow-cx');

const LANGUAGE_CODE = 'en';
const SESSION_CLIENT = new SessionsClient({
  keyFilename: 'google.json',
  apiEndpoint: 'europe-west1-dialogflow.googleapis.com',
});


const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const message = req.body.message;
  console.log(message)
  if (!message || !message.text) return res.sendStatus(200);

  const sessionId = message.chat.id;
  console.log(message.chat)
  console.log(sessionId)
  const sessionPath = SESSION_CLIENT.projectLocationAgentSessionPath(
      process.env.PROJECT_ID,
      process.env.LOCATION,
      process.env.AGENT_ID,
      sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message.text,
      },
      languageCode: LANGUAGE_CODE,
    },
  };

  const [response] = await SESSION_CLIENT.detectIntent(request);
  const botReply = response.textResponses?.[0]?.text || 'Sorry, I didn’t understand that.';

  // Send response back to Telegram
  await fetch(`${process.env.TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: botReply,
    }),
  });

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
