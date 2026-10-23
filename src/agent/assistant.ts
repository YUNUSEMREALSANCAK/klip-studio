import Anthropic from '@anthropic-ai/sdk';
import { COMMAND_SPECS, execute, type Command } from '../core/commands';
import { screenshot } from './bridge';

// Doğal dille kurgu: Claude, komut katmanını araç olarak kullanarak editörü sürer.
// Yalnız proje özeti ve önizleme kareleri gönderilir; medya dosyalarının kendisi gönderilmez.

const MODEL = 'claude-opus-5-5';
const MAX_STEPS = 30;

const SYSTEM = `Sen Klip Stüdyo adlı tarayıcı tabanlı video editöründe çalışan bir kurgu asistanısın.
Kullanıcının isteğini editör araçlarıyla gerçekleştir. Klip ve varlık kimliklerini önce get_state ile öğren; kimlik uydurma.
Zamanlar saniye cinsindendir. Görsel bir değişiklik yaptıysan sonucu screenshot ile kontrol edebilirsin.
Yapamayacağın bir şey istenirse bunu kısaca söyle. Yanıtlarını Türkçe ve kısa yaz.`;

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
    description: 'Önizlemenin o anki karesini görüntü olarak döndürür.',
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

// Konuşmaya yeni kullanıcı mesajını ekler ve Claude işini bitirene kadar araç döngüsünü çalıştırır.
// Geçmiş yalnızca sona eklenerek büyür (yanıt içerikleri olduğu gibi geri gönderilir).
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
        fallbacks: 'default', // güvenlik sınıflandırıcısı reddederse istek uygun modelde sürer
        output_config: { effort: 'medium' },
        system: SYSTEM,
        tools,
        messages,
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) onEvent({ kind: 'error', text: 'API anahtarı geçersiz.' });
      else if (error instanceof Anthropic.RateLimitError) onEvent({ kind: 'error', text: 'Hız sınırına takıldı; biraz sonra tekrar deneyin.' });
      else if (error instanceof Anthropic.APIError) onEvent({ kind: 'error', text: `API hatası (${error.status}): ${error.message}` });
      else onEvent({ kind: 'error', text: `Bağlantı hatası: ${(error as Error).message}` });
      return messages;
    }

    messages.push({ role: 'assistant', content: response.content });
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) onEvent({ kind: 'text', text: block.text });
    }

    if (response.stop_reason === 'refusal') {
      onEvent({ kind: 'error', text: 'İstek güvenlik nedeniyle yanıtlanmadı.' });
      return messages;
    }
    if (response.stop_reason === 'max_tokens') {
      onEvent({ kind: 'error', text: 'Yanıt yarıda kesildi; isteği daha küçük adımlara bölün.' });
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
  onEvent({ kind: 'error', text: 'Adım sınırına ulaşıldı.' });
  return messages;
}
