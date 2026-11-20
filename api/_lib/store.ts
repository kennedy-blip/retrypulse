export type JitterMode = "full" | "equal" | "none";
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
export type Policy = { id: string; name: string; targetUpstream: string; maxRetries: number; baseDelayMs: number; jitterMode: JitterMode; failureThreshold: number; circuitState: CircuitState; consecutiveFailures: number; rollingErrorRate: number; };
export type DeadLetter = { id: string; policyId: string; targetUpstream: string; payload: unknown; reason: string; createdAt: string; attempts: number; };
const seed: Policy[] = [
 { id:"daraja", name:"Daraja STK Gateway", targetUpstream:"daraja-stk-gateway", maxRetries:4, baseDelayMs:250, jitterMode:"full", failureThreshold:5, circuitState:"CLOSED", consecutiveFailures:0, rollingErrorRate:1.2 },
 { id:"llm", name:"LLM Inference Cluster", targetUpstream:"llm-inference-cluster", maxRetries:3, baseDelayMs:500, jitterMode:"equal", failureThreshold:4, circuitState:"CLOSED", consecutiveFailures:1, rollingErrorRate:3.8 },
 { id:"billing", name:"Billing Webhook Sink", targetUpstream:"billing-webhook-sink", maxRetries:5, baseDelayMs:300, jitterMode:"none", failureThreshold:3, circuitState:"OPEN", consecutiveFailures:3, rollingErrorRate:18.4 }
];
export const policies: Policy[] = seed;
export const deadLetters: DeadLetter[] = [
 { id:"dlq-1042", policyId:"billing", targetUpstream:"billing-webhook-sink", payload:{ event:"invoice.paid", invoiceId:"inv_2048", amount:4200, currency:"KES" }, reason:"Upstream returned HTTP 503 after retry budget exhausted", createdAt:new Date(Date.now()-18*60000).toISOString(), attempts:6 },
 { id:"dlq-1039", policyId:"daraja", targetUpstream:"daraja-stk-gateway", payload:{ phoneNumber:"2547•••••219", amount:1500, accountReference:"ORDER-882" }, reason:"Gateway timeout — connection reset", createdAt:new Date(Date.now()-51*60000).toISOString(), attempts:5 }
];
export function json(data: unknown, status=200) { return new Response(JSON.stringify(data), { status, headers:{ "content-type":"application/json; charset=utf-8", "cache-control":"no-store" } }); }
export async function bodyOf<T>(req: Request): Promise<T> { return await req.json() as T; }
