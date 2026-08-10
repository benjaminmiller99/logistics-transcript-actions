import assert from "node:assert/strict";
import { parseAction } from "./logistics_transcription.js";

const action = parseAction('{"shipmentId":"CN-2048","status":"delivered","nextAction":"notify the learner"}');
assert.equal(action.shipmentId, "CN-2048");
assert.equal(action.status, "delivered");
console.log("logistics action parsing passed");
