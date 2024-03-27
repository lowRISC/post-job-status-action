// Copyright lowRISC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

import * as core from '@actions/core';

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

async function wait(delay: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 8,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries - 1; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RetryableError) {
        core.info(`${error.message}, retry after ${delay}ms`);
        await wait(delay);
        delay *= 2;
        continue;
      }

      throw error;
    }
  }

  return fn();
}
