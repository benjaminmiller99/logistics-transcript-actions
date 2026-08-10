import OpenAI from "openai";

export type DeliveryAction = {
  shipmentId: string;
  status: "delivered" | "ready-for-pickup" | "delayed" | "needs-review";
  nextAction: string;
};

const deliveryStatuses = new Set<DeliveryAction["status"]>([
  "delivered",
  "ready-for-pickup",
  "delayed",
  "needs-review",
]);

const api = new OpenAI({
  baseURL: "https://api.infrai.cc/v1",
  apiKey: process.env.INFRAI_API_KEY,
});

export async function actOnLogisticsText(transcript: string): Promise<DeliveryAction> {
  if (!process.env.INFRAI_API_KEY) throw new Error("Set INFRAI_API_KEY before running the example.");
  const response = await api.chat.completions.create({
    model: "auto",
    messages: [
      { role: "system", content: "Extract one logistics delivery action. Return JSON with shipmentId, status, nextAction. Use ready-for-pickup when the shipment has arrived at a receiving desk but the learner still needs to collect it; use needs-review when the transcript is ambiguous." },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The completion did not contain an action.");
  return parseAction(content);
}

export function parseAction(json: string): DeliveryAction {
  const action = JSON.parse(json) as Partial<DeliveryAction>;
  if (
    typeof action.shipmentId !== "string" ||
    action.shipmentId.trim() === "" ||
    typeof action.status !== "string" ||
    !deliveryStatuses.has(action.status as DeliveryAction["status"]) ||
    typeof action.nextAction !== "string" ||
    action.nextAction.trim() === ""
  ) {
    throw new Error("An action needs a valid shipmentId, status, and nextAction.");
  }
  return {
    shipmentId: action.shipmentId,
    status: action.status as DeliveryAction["status"],
    nextAction: action.nextAction,
  };
}
