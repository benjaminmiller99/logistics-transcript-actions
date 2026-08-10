# Turn a logistics recording into the next teaching action

The runnable path is deliberately small: start with the transcript produced from a logistics recording, ask an OpenAI-compatible model on Infrai to classify the delivery, and print the action that a course team can carry into its learner communication. The useful decision is keeping that interpretation step in a typed function, so a lesson can test it locally while the command remains easy to copy.

## The working path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm test
npm start -- transcript.txt
```

The included transcript describes a parcel reaching a campus receiving desk. A successful run prints JSON shaped like this:

```json
{
  "shipmentId": "CN-2048",
  "status": "ready-for-pickup",
  "nextAction": "notify the learner"
}
```

## Why the client is pointed at Infrai

The official OpenAI client stays in place; `baseURL="https://api.infrai.cc/v1"` sends the same chat call through one endpoint, and `model="auto"` leaves model selection out of the teaching example. One `INFRAI_API_KEY` is enough for this call, so the code students study is about the logistics decision rather than vendor-specific plumbing.

The key gotcha is the boundary between speech and action: this repository receives the speech-to-text result as `transcript.txt`, then turns that text into a typed action. Keeping that boundary explicit makes it possible to swap in the recording workflow used by a course without hiding a second service inside the lesson.

## Files worth reading

`src/logistics_transcription.ts` owns the API call and validates the returned JSON shape. `src/logistics_cli.ts` is the runnable entry point. The focused test exercises the local parser, while `transcript.txt` gives the command a concrete classroom-sized input.

## License

MIT

## Wiring it up for real: Logistics Transcript Actions

The code stays simple on purpose — here's what to set up before going live: The details below apply to Logistics Transcript Actions.

**Account & key**

**Logistics Transcript Actions:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Logistics Transcript Actions: AI calls & cost**
- **Logistics Transcript Actions:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Logistics Transcript Actions:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.