import { bodyOf, deadLetters, json, policies, type Policy } from "./_lib/store";
export default async function handler(req: Request): Promise<Response> {
 if (req.method === "GET") return json({ policies, deadLetters });
 if (req.method === "POST") {
  const input = await bodyOf<Partial<Policy>>(req);
  if (!input.targetUpstream || !input.name) return json({ error:"name and targetUpstream are required" },400);
  const existing = policies.find(p => p.id === input.id || p.targetUpstream === input.targetUpstream);
  if (existing) Object.assign(existing, input, { id:existing.id });
  else policies.push({ id:input.id || crypto.randomUUID(), name:input.name, targetUpstream:input.targetUpstream, maxRetries:Math.min(6,Math.max(1,input.maxRetries ?? 3)), baseDelayMs:Math.min(2000,Math.max(100,input.baseDelayMs ?? 250)), jitterMode:input.jitterMode ?? "full", failureThreshold:Math.max(1,input.failureThreshold ?? 4), circuitState:"CLOSED", consecutiveFailures:0, rollingErrorRate:0 });
  return json({ policies, deadLetters });
 }
 if (req.method === "DELETE") {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error:"id query parameter required" },400);
  const index = deadLetters.findIndex(item => item.id === id);
  if (index < 0) return json({ error:"Dead-letter item not found" },404);
  deadLetters.splice(index,1); return json({ policies, deadLetters });
 }
 return json({ error:"Method not allowed" },405);
}