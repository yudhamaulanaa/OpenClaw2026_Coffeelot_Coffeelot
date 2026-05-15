import { runAgentWorkflow, type AgentWorkflowId } from "./agent-workflows";

const DEFAULT_TENANT_ID = "demo-tenant-kopi-jagoan";
const DEFAULT_OUTLET_ID = "demo-outlet-booth-ciputat";

type ScheduledAgentWorkflow = {
  workflowId: AgentWorkflowId;
  everyMs: number;
};

function parseIntervalMs(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function scheduledWorkflows(): ScheduledAgentWorkflow[] {
  return [
    {
      workflowId: "daily_report",
      everyMs: parseIntervalMs(process.env.AGENT_DAILY_REPORT_INTERVAL_MS, 24 * 60 * 60 * 1000),
    },
    {
      workflowId: "restock_alert",
      everyMs: parseIntervalMs(process.env.AGENT_RESTOCK_ALERT_INTERVAL_MS, 60 * 60 * 1000),
    },
  ];
}

async function runScheduledWorkflow(workflowId: AgentWorkflowId) {
  const tenantId = process.env.AGENT_SCHEDULER_TENANT_ID || process.env.DEMO_TENANT_ID || DEFAULT_TENANT_ID;
  const outletId = process.env.AGENT_SCHEDULER_OUTLET_ID || process.env.DEMO_OUTLET_ID || DEFAULT_OUTLET_ID;
  const result = await runAgentWorkflow({ tenantId, outletId, workflowId, triggerType: "scheduled" });
  console.log(`Agent scheduler ran ${workflowId}: ${result.run.status}`);
}

export function startAgentScheduler() {
  const enabled = process.env.AGENT_SCHEDULER_ENABLED !== "false";
  if (!enabled) return;

  const initialDelayMs = parseIntervalMs(process.env.AGENT_SCHEDULER_INITIAL_DELAY_MS, 5_000);
  for (const workflow of scheduledWorkflows()) {
    setTimeout(() => {
      runScheduledWorkflow(workflow.workflowId).catch((error) => {
        console.error(`Agent scheduler failed ${workflow.workflowId}`, error instanceof Error ? error.message : error);
      });
    }, initialDelayMs).unref();

    setInterval(() => {
      runScheduledWorkflow(workflow.workflowId).catch((error) => {
        console.error(`Agent scheduler failed ${workflow.workflowId}`, error instanceof Error ? error.message : error);
      });
    }, workflow.everyMs).unref();
  }

  console.log(`Agent scheduler enabled: ${scheduledWorkflows().map((workflow) => `${workflow.workflowId}/${workflow.everyMs}ms`).join(", ")}`);
}
