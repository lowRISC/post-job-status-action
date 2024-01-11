// Copyright lowRISC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

import * as core from '@actions/core';

import { run } from './main';
import { post_run } from './post';

async function main(): Promise<void> {
  try {
    const post = !!core.getState('post');

    if (!post) {
      core.saveState('post', true);
      await run();
    } else {
      await post_run();
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.stack || error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
