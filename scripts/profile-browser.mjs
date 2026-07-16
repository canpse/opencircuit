const webdriverUrl = 'http://127.0.0.1:4444';
const appUrl = process.argv[2] ?? 'http://127.0.0.1:5173/?profile=1';

async function webdriver(path, method = 'GET', body) {
  const response = await fetch(`${webdriverUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) {
    throw new Error(payload.value?.message ?? `WebDriver respondeu ${response.status}.`);
  }
  return payload.value;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitUntil(sessionId, script, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await webdriver(`/session/${sessionId}/execute/sync`, 'POST', {
      script,
      args: [],
    });
    if (result) return;
    await sleep(100);
  }
  throw new Error(`Condição não atendida em ${timeoutMs} ms.`);
}

async function execute(sessionId, script) {
  return webdriver(`/session/${sessionId}/execute/sync`, 'POST', { script, args: [] });
}

async function executeAsync(sessionId, script) {
  return webdriver(`/session/${sessionId}/execute/async`, 'POST', { script, args: [] });
}

async function selectOption(sessionId, value) {
  const selected = await execute(
    sessionId,
    `
      const select = Array.from(document.querySelectorAll('select')).find((candidate) =>
        Array.from(candidate.options).some((option) => option.value === '${value}')
      );
      if (!select) return false;
      select.value = '${value}';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    `,
  );
  if (!selected) throw new Error(`Opção ${value} não encontrada.`);
}

async function prepareCase(sessionId, wireStyle) {
  await selectOption(sessionId, wireStyle);
  await sleep(250);
  await execute(
    sessionId,
    `
      const reset = Array.from(document.querySelectorAll('button')).find(
        (button) => button.title === 'Resetar zoom'
      );
      reset?.click();
      window.__openCircuitProfile?.reset();
    `,
  );
  await sleep(100);
  await execute(sessionId, 'window.__openCircuitProfile?.reset();');
}

async function profileZoom(sessionId) {
  await executeAsync(
    sessionId,
    `
      const done = arguments[arguments.length - 1];
      const svg = document.querySelector('.circuit-canvas');
      if (!svg) return done({ error: 'canvas ausente' });
      const rect = svg.getBoundingClientRect();
      let index = 0;
      function step() {
        svg.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          deltaY: index % 2 === 0 ? -40 : 40,
          deltaMode: 0,
        }));
        index += 1;
        if (index < 30) setTimeout(step, 25);
        else setTimeout(() => done(true), 500);
      }
      step();
    `,
  );
  return execute(sessionId, 'return window.__openCircuitProfile?.summary();');
}

async function profilePan(sessionId) {
  await executeAsync(
    sessionId,
    `
      const done = arguments[arguments.length - 1];
      const svg = document.querySelector('.circuit-canvas');
      if (!svg) return done({ error: 'canvas ausente' });
      const rect = svg.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      svg.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: 1,
        buttons: 4,
        clientX: startX,
        clientY: startY,
      }));
      let index = 0;
      function step() {
        svg.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          button: 1,
          buttons: 4,
          clientX: startX + Math.sin(index / 8) * 120,
          clientY: startY + Math.cos(index / 11) * 80,
        }));
        index += 1;
        if (index < 30) return setTimeout(step, 25);
        svg.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          button: 1,
          buttons: 0,
          clientX: startX,
          clientY: startY,
        }));
        setTimeout(() => done(true), 500);
      }
      setTimeout(step, 25);
    `,
  );
  return execute(sessionId, 'return window.__openCircuitProfile?.summary();');
}

let sessionId;
try {
  const session = await webdriver('/session', 'POST', {
    capabilities: {
      alwaysMatch: {
        browserName: 'firefox',
        'moz:firefoxOptions': { args: ['-headless'] },
      },
    },
  });
  sessionId = session.sessionId;
  await webdriver(`/session/${sessionId}/timeouts`, 'POST', { script: 60_000 });
  await webdriver(`/session/${sessionId}/window/rect`, 'POST', {
    width: 1440,
    height: 1000,
  });
  await webdriver(`/session/${sessionId}/url`, 'POST', { url: appUrl });
  await waitUntil(sessionId, 'return Boolean(window.__openCircuitProfile);');
  await selectOption(sessionId, 'alu-4-bit');
  await waitUntil(
    sessionId,
    "return document.querySelectorAll('.component').length === 36 && document.querySelectorAll('.wire').length === 65;",
  );

  const report = {};
  for (const wireStyle of ['orthogonal', 'bezier']) {
    await prepareCase(sessionId, wireStyle);
    report[`${wireStyle}.zoom`] = await profileZoom(sessionId);
    await prepareCase(sessionId, wireStyle);
    report[`${wireStyle}.pan`] = await profilePan(sessionId);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (sessionId) await webdriver(`/session/${sessionId}`, 'DELETE').catch(() => undefined);
}
