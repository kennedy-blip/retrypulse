export type JitterMode="full"|"equal"|"none"; export type CircuitState="CLOSED"|"OPEN"|"HALF_OPEN";
export type Policy={id:string;name:string;targetUpstream:string;maxRetries:number;baseDelayMs:number;jitterMode:JitterMode;failureThreshold:number;circuitState:CircuitState;consecutiveFailures:number;rollingErrorRate:number};
export type DeadLetter={id:string;policyId:string;targetUpstream:string;payload:unknown;reason:string;createdAt:string;attempts:number};
export type Attempt={attempt:number;delayMs:number;outcome:"FAILED"|"SUCCESS";httpStatus:number;timestamp:string};
export type Simulation={attempts:Attempt[];totalElapsedDelayMs:number;circuitState:CircuitState;dlqStatus:string;deadLetterId?:string;recovered:boolean;error?:string};