import Anthropic from '@anthropic-ai/sdk';
import { COMMAND_SPECS, execute, type Command } from '../core/commands';
import { screenshot } from './bridge';

// Natural-language editing: Claude drives the editor using the command layer as tools.
// Only a project summary and preview frames are sent; media files themselves never are.

const MODEL = 'claude-opus-5-5';
const MAX_STEPS = 30;

const SYSTEM = `You are an editing assistant inside Klip Studio, a browser-based video editor.
Carry out the user's request with the editor tools. Look up clip and asset IDs with get_state first; never invent IDs.
Times are in seconds. After a visual change you can check the result with screenshot.
If something can't be done, say so briefly. Reply concisely, in the language the user writes in.`;

export type Message = Anthropic.Beta.BetaMessageParam;

export interface AssistantEvent {
  kind: 'text' | 'tool' | 'error';
  text: string;
}

const tools: Anthropic.Beta.BetaTool[] = [
  ...COMMAND_SPECS.map((spec) => ({
    name: spec.name,
    description: spec.description,
    input_schema: { type: 'object' as const, properties: spec.parameters, required: spec.required ?? [] },
  })),
  {
    name: 'screenshot',
    description: 'Returns the current preview frame as an image.',
    input_schema: { type: 'object' as const, properties: {} },
  },
];

async function runTool(block: Anthropic.Beta.BetaToolUseBlock): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  try {
    if (block.name === 'screenshot') {
      const data = screenshot(0.7).split(',')[1];
      return { type: 'tool_result', tool_use_id: block.id, content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }] };
    }
    const result = await execute({ name: block.name, ...(block.input as object) } as Command);
    return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result ?? { ok: true }) };
  } catch (error) {
    return { type: 'tool_result', tool_use_id: block.id, is_error: true, content: (error as Error).message };
  }
}

const describeCall = (block: Anthropic.Beta.BetaToolUseBlock) => {
  const input = JSON.stringify(block.input);
  return `${block.name}${input === '{}' ? '' : ` ${input.length > 80 ? `${input.slice(0, 80)}…` : input}`}`;
};

// Appends the user's message and runs the tool loop until Claude is done.
// History only grows by appending (response content is sent back unchanged).
export async function runAssistant(apiKey: string, history: Message[], onEvent: (event: AssistantEvent) => void): Promise<Message[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages = [...history];

  for (let step = 0; step < MAX_STEPS; step++) {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default', // if the safety classifier declines, the request continues on a fallback model
        output_config: { effort: 'medium' },
        system: SYSTEM,
        tools,
        messages,
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) onEvent({ kind: 'error', text: 'Invalid API key.' });
      else if (error instanceof Anthropic.RateLimitError) onEvent({ kind: 'error', text: 'Rate limited; try again shortly.' });
      else if (error instanceof Anthropic.APIError) onEvent({ kind: 'error', text: `API error (${error.status}): ${error.message}` });
      else onEvent({ kind: 'error', text: `Connection error: ${(error as Error).message}` });
      return messages;
    }

    messages.push({ role: 'assistant', content: response.content });
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) onEvent({ kind: 'text', text: block.text });
    }

    if (response.stop_reason === 'refusal') {
      onEvent({ kind: 'error', text: 'The request was declined for safety reasons.' });
      return messages;
    }
    if (response.stop_reason === 'max_tokens') {
      onEvent({ kind: 'error', text: 'The response was cut off; split the request into smaller steps.' });
      return messages;
    }
    const calls = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || !calls.length) return messages;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      onEvent({ kind: 'tool', text: describeCall(call) });
      results.push(await runTool(call));
    }
    messages.push({ role: 'user', content: results });
  }
  onEvent({ kind: 'error', text: 'Step limit reached.' });
  return messages;
}
