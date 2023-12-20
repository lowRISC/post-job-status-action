import * as core from '@actions/core';

import { run } from './main';
import { post_run } from './post';

async function main(): Promise<void> {
  const post = !!core.getState('post');

  if (!post) {
    core.saveState('post', true);
    await run();
  } else {
    await post_run();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
