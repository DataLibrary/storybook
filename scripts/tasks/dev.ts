import detectFreePort from 'detect-port';
import { join } from 'path';
import waitOn from 'wait-on';

import type { Task } from '../task';
import { exec } from '../utils/exec';
import { now, saveBench } from '../bench';

export const PORT = process.env.STORYBOOK_SERVE_PORT
  ? parseInt(process.env.STORYBOOK_SERVE_PORT, 10)
  : 6006;

export const dev: Task = {
  description: 'Run the sandbox in development mode',
  service: true,
  dependsOn: ['sandbox'],
  async ready() {
    return (await detectFreePort(PORT)) !== PORT;
  },
  async run({ sandboxDir, codeDir, selectedTask }, { dryRun, debug }) {
    const controller = new AbortController();
    const devCommand = `yarn storybook --port ${PORT}${selectedTask === 'dev' ? '' : ' --ci'}`;
    const start = now();

    exec(
      devCommand,
      { cwd: sandboxDir },
      { dryRun, debug, signal: controller.signal as AbortSignal }
    ).catch((err) => {
      // If aborted, we want to make sure the rejection is handled.
      if (!err.killed) throw err;
    });
    await waitOn({ resources: [`http://localhost:${PORT}/iframe.html`], interval: 50 });

    const time = now() - start;
    await saveBench({ time }, { key: 'dev', rootDir: codeDir });

    return controller;
  },
};
