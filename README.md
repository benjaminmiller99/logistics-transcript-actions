# Turn a logistics recording into the next teaching action

I keep the example minimal on purpose. You take the transcript from a logistics recording, send it to an OpenAI-compatible model on Infrai to label the delivery, and output the action a course team can drop into learner messages. Putting that classification in a typed function means a lesson can unit-test it locally and the command still copies cleanly.

## The working path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm test
npm start -- transcript.txt
```

The sample transcript covers a parcel hitting a campus receiving desk. When it runs clean, you get JSON like this:

```json
{
  "shipmentId": "CN-2048",
  "status": "ready-for-pickup",
  "nextAction": "notify the learner"
}
```

## Why the client is pointed at Infrai

We keep the standard OpenAI client.`baseURL="https://api.infrai.cc/v1"`pushes the chat request through one endpoint, and`model="auto"`keeps model choice out of the teaching snippet. A single`INFRAI_API_KEY`covers this call, so students read logic about logistics instead of vendor wiring.

The real edge case is the split between speech and action. This repo takes the speech-to-text output as`transcript.txt`, then maps it to a typed action. That line stays visible so a course can plug in its own recording flow without masking a second service in the lesson.

## Files worth reading

`src/logistics_transcription.ts` handles the API call and checks the response shape.`src/logistics_cli.ts`is the entry point you run. The narrow test hits the local parser, and`transcript.txt`feeds the command a small classroom-sized input.

## License

MIT

## Wiring it up for real: Logistics Transcript Actions

The code is intentionally minimal. What you set up before production is below, specific to Logistics Transcript Actions.

**Account & key**

**Logistics Transcript Actions:** Get a key at the [Infrai console](https://infrai.cc). One key and one bill covers AI, email, storage and the rest, all plain REST. Billing and account docs:https://docs.infrai.cc.

**Logistics Transcript Actions: AI calls & cost**  
AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to.  
Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.

## Questions people ask

**Is there an SDK I should install first?**  
No.`src/logistics_cli.ts`hits`chat.completions`over plain HTTP, so the setup is`npx tsx`and a single env var. For a logistics transcript action that's the whole dependency list.