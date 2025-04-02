const express = require('express');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

const LANGUAGE_CODE = 'en';
const SESSION_CLIENT = new SessionsClient({
  keyFilename: 'google.json',
  apiEndpoint: 'europe-west1-dialogflow.googleapis.com',
});

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;

    if (!message || !message.text) {
      console.log('⚠️ Message missing or not text — skipping.');
      return res.sendStatus(200);
    }

    const sessionId = message.chat.id;
    const sessionPath = SESSION_CLIENT.projectLocationAgentSessionPath(
        process.env.PROJECT_ID,
        process.env.LOCATION,
        process.env.AGENT_ID,
        sessionId
    );

    console.log(`🔗 Dialogflow session path: ${sessionPath}`);
    console.log(`🧠 Sending to Dialogflow: "${message.text}"`);

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

    console.log('🎯 Full Dialogflow Response:');
    console.log(JSON.stringify(response.queryResult.text, null, 2));
    console.log(JSON.stringify(response.queryResult.responseMessages, null, 2));

    const messages = response.queryResult.responseMessages || [];
    const botReply = messages
        .filter(msg => msg.text?.text?.length)
        .map(msg => msg.text.text[0])
        .join('\n') || 'Sorry, I didn’t understand that.';


    const telegramResponse = await fetch(`${process.env.TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: botReply,
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log('📤 Telegram API Response:', telegramResult);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error in /webhook handler:', err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
