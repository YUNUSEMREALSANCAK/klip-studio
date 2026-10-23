import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, test } from '@playwright/test';
import { addToMain, importMedia, openEditor } from './helpers';

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('window.klip komut API ile düzenleme yapılır', async ({ page }) => {
  await importMedia(page, 'speech.webm');
  const result = await page.evaluate(async () => {
    const klip = (window as unknown as { klip: { execute: (c: object) => Promise<unknown>; state: () => Promise<{ assets: { id: string }[]; clips: { id: string }[] }> } }).klip;
    const { assets } = await klip.state();
    await klip.execute({ name: 'add_media', assetId: assets[0].id });
    await klip.execute({ name: 'split', time: 2 });
    await klip.execute({ name: 'add_text', text: 'Merhaba', start: 0.5 });
    return klip.state();
  });
  expect(result.clips).toHaveLength(3);
  await expect(page.locator('.clip.main')).toHaveCount(2);
  await expect(page.locator('.clip.text')).toHaveText(/Merhaba/);
});

test('MCP sunucusu editörü durum okuma, komut ve ekran görüntüsüyle sürer', async ({ page }) => {
  const transport = new StdioClientTransport({ command: 'node', args: ['mcp/server.mjs'], stderr: 'pipe' });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(transport);
  try {
    await page.goto('/?bridge');
    await expect(page.locator('.save-status')).toHaveText('Kaydedildi');
    await importMedia(page, 'gradient.webm');
    await addToMain(page, 0);
    await expect.poll(async () => {
      const r = await client.callTool({ name: 'klip_state', arguments: {} });
      return !(r as { isError?: boolean }).isError;
    }, { timeout: 15_000 }).toBe(true);

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toEqual(expect.arrayContaining(['klip_state', 'klip_execute', 'klip_screenshot', 'klip_import_file']));

    await client.callTool({ name: 'klip_execute', arguments: { command: { name: 'add_text', text: 'MCP ile eklendi' } } });
    await expect(page.locator('.clip.text')).toHaveText(/MCP ile eklendi/);

    const shot = (await client.callTool({ name: 'klip_screenshot', arguments: {} })) as { content: { type: string; data?: string }[] };
    expect(shot.content[0].type).toBe('image');
    expect(shot.content[0].data!.length).toBeGreaterThan(1000);

    const imported = (await client.callTool({ name: 'klip_import_file', arguments: { path: 'tests/fixtures/square.png' } })) as { content: { text: string }[] };
    expect(imported.content[0].text).toContain('assetId');
  } finally {
    await client.close();
  }
});

test('asistan araç döngüsü komutları çalıştırır (sahte API)', async ({ page }) => {
  await importMedia(page, 'gradient.webm');
  const replies = [
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'get_state', input: {} }] },
    { stop_reason: 'tool_use', content: [{ type: 'text', text: 'Başlığı ekliyorum.' }, { type: 'tool_use', id: 't2', name: 'add_text', input: { text: 'Hoş geldiniz', preset: 'title' } }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Başlık eklendi.' }] },
  ];
  const requests: { messages: { role: string }[]; tools: unknown[] }[] = [];
  await page.route('https://api.anthropic.com/**', async (route) => {
    requests.push(route.request().postDataJSON());
    const reply = replies[requests.length - 1];
    await route.fulfill({
      json: { id: `msg_${requests.length}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 }, ...reply },
    });
  });
  await page.locator('.side-tab', { hasText: 'Asistan' }).click();
  await page.locator('.assistant input[type=password]').fill('sk-ant-test');
  await page.locator('.assistant input[type=text]').fill('Başa hoş geldiniz başlığı ekle');
  await page.locator('.assistant button', { hasText: 'Gönder' }).click();
  await expect(page.locator('.chat-entry.text', { hasText: 'Başlık eklendi.' })).toBeVisible();
  await expect(page.locator('.clip.text')).toHaveText(/Hoş geldiniz/);
  expect(requests).toHaveLength(3);
  // Son istek: kullanıcı → asistan → araç sonucu → asistan → araç sonucu (geçmiş yalnız sona eklenir)
  expect(requests[2].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
  expect(requests[0].tools.length).toBeGreaterThan(10);
});
