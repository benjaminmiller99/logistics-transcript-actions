# Structured Candidate Scoring: One-Key Gateway API, Rate Limits, Fallback Routing

Short answer: for a B2B SaaS product that scores candidates against a job rubric, an OpenAI, Claude, and Gemini gateway API with one key is useful only when its common request contract preserves structured output, bounded retries, and regional policy. It can simplify setup; it cannot make unlike model schemas, quotas, or data-processing terms identical.

The useful unit of comparison is therefore not the number of model names behind the gateway. It is the number of production decisions your application can make explicitly. A candidate score is a poor place for silent fallback: a different model may return valid JSON with a different interpretation of the rubric, and that difference is a correctness failure even when the HTTP request succeeded.

## What should a one-key gateway API prove for candidate scoring?

Start with a narrow data flow. Normalize the job rubric and candidate profile, select an approved model class, send one request, validate the returned object, and store the decision with the prompt and schema versions. A gateway may provide one authentication boundary and one transport shape. Your service still owns the rubric, eligibility rules, and audit record.

The output contract should be stricter than “the response looks like JSON.” Require a fixed object such as `score`, `evidence`, and `missing_requirements`; reject unknown keys; constrain score ranges; and require evidence to point back to supplied text. JSON Schema is a useful boundary, but schema validity does not prove that the score is substantively correct. Keep a small labeled evaluation set and compare each candidate model against it before changing the fallback order.

This is the smallest TypeScript boundary I would ship. It keeps provider details outside the scoring code and makes a fallback decision only after classifying the failure.

```ts
type CandidateScore = {
  score: number;
  evidence: string[];
  missing_requirements: string[];
};

type GatewayResult = {
  status: number;
  text: string;
  retryAfterMs?: number;
};

const allowedModels = new Set([
  "primary-structured",
  "secondary-structured",
]);

function parseScore(text: string): CandidateScore {
  const value = JSON.parse(text) as CandidateScore;
  if (
    !Number.isInteger(value.score) ||
    value.score < 0 ||
    value.score > 100 ||
    !Array.isArray(value.evidence) ||
    !Array.isArray(value.missing_requirements)
  ) {
    throw new Error("Candidate score violates the output contract");
  }
  return value;
}

async function scoreCandidate(
  request: string,
  models: string[],
  callGateway: (model: string, body: string) => Promise<GatewayResult>,
): Promise<CandidateScore> {
  for (const model of models) {
    if (!allowedModels.has(model)) throw new Error(`Unapproved model: ${model}`);

    const result = await callGateway(model, request);
    if (result.status === 429) {
      if (result.retryAfterMs === undefined) continue;
      await new Promise((resolve) => setTimeout(resolve, result.retryAfterMs));
      continue;
    }
    if (result.status >= 400 && result.status < 500) {
      throw new Error(`Non-retryable request failure: ${result.status}`);
    }
    if (result.status >= 500) continue;
    return parseScore(result.text);
  }
  throw new Error("No approved model produced a valid candidate score");
}
```

The example deliberately does not pretend that a generic gateway can guarantee semantic equivalence. The model list is an application policy, and `parseScore` is a hard stop. In a real implementation, use a JSON Schema validator for nested fields and attach a request id to every attempt. Do not log the candidate profile merely to make debugging convenient.

## How do rate limits, fallback routing, and EU/US regions affect the setup?

Rate limits are a scheduling input. A 429 should be counted by model and deployment, respect a server-provided delay when one exists, and stop after a total deadline. Exponential backoff alone is not a routing strategy. It can turn a small quota event into a queue of duplicate scoring jobs.

Ship the contract.

Classify failures before switching models. A timeout may be retryable; malformed input, an invalid credential, a policy rejection, and a schema failure need different handling. A schema failure is especially important here: retrying with the same model can be reasonable once, but moving to a cheaper or weaker model without recording that change makes the score difficult to explain later. Every attempt should record model class, region, status family, latency, token usage if available, and validation result.

Consider one concrete sequence. A worker receives a candidate profile, sends it to the primary model, and receives a 429 with a five-second delay. It should not immediately send the same payload to every configured provider: first apply the request deadline, quota policy, and region filter; then decide whether the next model has been approved for this rubric. If the second response is HTTP 200 but contains a score outside 0-100, an unknown field, or evidence that cannot be tied to the profile, the worker must mark the attempt invalid and route the item to review or a bounded retry policy. The queue record should retain both attempt ids, the schema version, the selected region, and the reason for the transition. Without that record, an operator sees only a successful final response and cannot tell whether the system recovered from capacity pressure, crossed a policy boundary, or silently changed the scoring behavior. This is also why a single latency percentile is insufficient: measure time to the first failure, delay before fallback, validation time, and total time to an auditable result.

Region is an eligibility filter, not a label in a dropdown. For EU and US deployments, verify processing location, retention, subprocessors, and the contractual scope of each upstream route. Keep separate approved model lists and credentials where the policy requires it. A fallback that crosses a data boundary is not a successful recovery.

I'm not sure a gateway's region badge can answer every contractual question for your account; your mileage may vary. Resolve that uncertainty with the provider's current data-processing terms and an internal privacy review, not with a green health check.

## Which gateway trade-offs matter more than simple setup?

The main gain from a unified gateway is reduced adapter surface: one HTTP contract and one authentication boundary can let a small team keep model selection in configuration. That is meaningful for a solo founder shipping an LLM feature. It is not permission to erase vendor-specific behavior from the architecture.

| Approach | Useful when | Cost or boundary |
| --- | --- | --- |
| Direct provider clients | Native tools, streaming, or specialist modalities define the product | Multiple credentials and request contracts remain your responsibility |
| Self-hosted gateway | The team needs control over routing and data paths | Deployment, upgrades, telemetry, and incident response become part of the product |
| Managed gateway | Standard text requests are the dominant workload | Verify routing policy, regional terms, quotas, and the exit path |
| Thin internal adapter | The workload has one strict schema and a small approved model set | You own the adapter, but the behavior stays easy to test and replace |

For this candidate-scoring case, a thin internal adapter may be the better choice than a broad gateway if structured-output correctness is the primary axis. Use a gateway when its shared contract covers the exact response mode you test. Keep direct integrations for features the shared contract cannot represent. The catch is that “one key” reduces credential plumbing, not the need to understand each model's context limits, refusal behavior, or regional availability.

Cost belongs in the same ledger as correctness and recovery latency. Track tokens, retries, validation failures, and human-review rates per model class. I would not make a gateway decision from a claimed savings percentage; the workload changes when fallback, retries, and manual review are included.

## What does a durable rollout and exit test look like?

Before release, run the exact production rubric through a contract suite. Include long candidate profiles, missing fields, ambiguous evidence, refusal-like responses, malformed JSON, 429 responses with and without a delay, timeouts, and an exhausted fallback list. Assert that the service never turns an invalid score into a hire recommendation.

Then replay a fixed evaluation set in each approved region. Compare score distributions, evidence quality, latency, and token use, not just pass rates. Pin schema and prompt versions. Keep the model order in deployment configuration, and require a review for changes to that order.

The final check is an exit test: replace the gateway call with a direct adapter in a staging run and count the business modules that change. If scoring, audit storage, and policy checks all remain untouched, the boundary is doing its job. If every downstream module knows a gateway-specific response shape, the setup is simple only until the first migration.

Use a gateway for a narrow, tested common path. Stay direct when provider-native behavior or strict regional control is the product requirement. That decision is less exciting than a universal routing promise, but it produces scores that can be inspected, retried, and defended.

## References

- https://platform.openai.com/docs/api-reference
- https://docs.anthropic.com/en/api/overview
- https://ai.google.dev/gemini-api/docs
- https://docs.cohere.com/docs/rerank-overview
- https://elevenlabs.io/docs
- https://openrouter.ai/docs
- https://portkey.ai/docs
- https://docs.litellm.ai/
