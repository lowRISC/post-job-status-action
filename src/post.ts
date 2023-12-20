import * as core from '@actions/core';
import * as github from '@actions/github';

export async function post_run(): Promise<void> {
  try {
    core.debug("Post run");
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
