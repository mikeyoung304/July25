#!/usr/bin/env node
import http from "http";
import { spawn } from "node:child_process";

async function main() {
  // Boot server in child process
  const proc = spawn("npx", ["tsx", "server/src/server.ts"], { 
    env: { ...process.env, PORT: "3001" },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let healthy = false;
  const timeout = setTimeout(() => {
    console.error("Timeout: server did not start within 15 seconds");
    proc.kill("SIGTERM");
  }, 15000);

  // Collect server output for debugging
  let serverOutput = '';
  proc.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });
  proc.stderr.on('data', (data) => {
    serverOutput += data.toString();
  });

  // Wait for server to boot
  await new Promise(r => setTimeout(r, 3000));
  
  // Ping health endpoint
  try {
    await new Promise((resolve, reject) => {
      const req = http.get("http://localhost:3001/health", (res) => {
        if (res.statusCode && res.statusCode < 500) { 
          healthy = true; 
          console.log(`✓ Server responded healthy (status: ${res.statusCode})`);
          resolve(null); 
        } else { 
          reject(new Error(`Bad status: ${res.statusCode}`)); 
        }
      });
      req.on("error", reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    });
  } catch (err) {
    console.error("Failed to reach health endpoint:", err.message);
    if (serverOutput) {
      console.error("Server output:", serverOutput.slice(-1000));
    }
  }
  
  clearTimeout(timeout);
  try { 
    proc.kill("SIGTERM"); 
    // Give process time to clean up
    await new Promise(r => setTimeout(r, 1000));
    proc.kill("SIGKILL");
  } catch {}

  process.exitCode = healthy ? 0 : 1;
  if (!healthy) {
    console.error("❌ Smoke test failed: server did not respond healthy");
  } else {
    console.log("✓ Smoke test passed");
  }
}

main().catch(err => {
  console.error("Smoke test error:", err);
  process.exit(1);
});