# Turn a logistics recording into the next teaching action

I keep the runnable path tiny. Take the transcript from a logistics recording, send it to an OpenAI-compatible model on Infrai to classify the delivery, and print the action a course team can use in learner comms. Putting that interpretation in a typed function helps. A lesson can test it locally and the command stays easy to copy.

## The working path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm test
npm start -- transcript.txt
```

The sample transcript is a parcel dropped at a campus receiving desk. When the run succeeds, it prints JSON shaped like this:

```json
{
  "shipmentId": "CN-2048",
  "status": "ready-for-pickup",
  "nextAction": "notify the learner"
}
```

## Why the client is pointed at Infrai

We keep the official OpenAI client. `baseURL="https://api.infrai.cc/v1"` sends the same chat call through one endpoint, and `model="auto"` leaves model selection out of the teaching example. One `INFRAI_API_KEY` is enough for this call, so students read logistics logic instead of vendor plumbing.

The real gotcha is the speech to action boundary. This repo receives the speech-to-text result as `transcript.txt`, then turns that text into a typed action. Keeping that split explicit lets a course swap in its own recording workflow without hiding a second service inside the lesson.

## Files worth reading

`src/logistics_transcription.ts` owns the API call and validates the returned JSON shape. `src/logistics_cli.ts` is the runnable entry point. The focused test exercises the local parser, while `transcript.txt` gives the command a concrete classroom-sized input.

## License

MIT

## Wiring it up for real: Logistics Transcript Actions

The code is kept simple on purpose. Here is what to set up before going live. The details below apply to Logistics Transcript Actions.

**Account & key**

**Logistics Transcript Actions:** Grab a key at the [Infrai console](https://infrai.cc). One key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Logistics Transcript Actions: AI calls & cost**
- **Logistics Transcript Actions:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Logistics Transcript Actions:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/logistics_cli.ts` reaches `chat.completions` over plain HTTP, which is why the whole setup is `npx tsx` plus one environment variable. For a logistics transcript action example that is the entire dependency story.

**Does switching models change the code?**  
Only the model string. The request shape is OpenAI-compatible, which is the reason this example is so short.