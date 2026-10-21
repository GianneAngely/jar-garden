// Silent headless Chrome over the DevTools protocol (--mute-audio, own temp profile, never a visible window).
// Shared by tools/test.mjs and tools/record.mjs.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch({ width = 1280, height = 720, scale = 1, mobile = false } = {}) {
  const ud = mkdtempSync(join(tmpdir(), "jargarden-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ["--headless=new", "--mute-audio", `--user-data-dir=${ud}`, `--remote-debugging-port=${port}`,
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  const close = () => { proc.kill("SIGKILL"); rmSync(ud, { recursive: true, force: true }); };

  let ws;
  for (let i = 0; i < 75 && !ws; i++) {
    try { ws = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page")?.webSocketDebuggerUrl; } catch {}
    if (!ws) await sleep(200);
  }
  if (!ws) { close(); throw new Error("no devtools"); }
  const sock = new WebSocket(ws);
  await new Promise(r => sock.addEventListener("open", r, { once: true }));
  let id = 0; const pending = new Map(); const errors = [];
  sock.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? a.description).join(" "));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => {
    const r = (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result;
    if (r?.exceptionDetails) errors.push(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r?.result?.value;
  };
  const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await sleep(150); } return false; };
  const png = async () => Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64");
  const shot = async path => writeFileSync(path, await png());
  // game coordinates (1280x720) -> page pixels
  const toPage = async (gx, gy) => evaluate(`(() => { const r = game.canvas.getBoundingClientRect(); return [r.left + ${gx} * r.width / 1280, r.top + ${gy} * r.height / 720]; })()`);
  const click = async (gx, gy, wait = 200) => {
    const [x, y] = await toPage(gx, gy);
    const touch = mobile;
    if (touch) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await sleep(50);
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await sleep(50);
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    }
    await sleep(wait);
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile });
  if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  const open = async url => { await send("Page.navigate", { url }); };
  return { send, evaluate, waitFor, png, shot, click, open, errors, close };
}
