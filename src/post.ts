// Copyright lowRISC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

import * as core from '@actions/core';
import * as github from '@actions/github';
import { RetryableError, retry } from './retry';

export async function post_run(): Promise<void> {
  const repository = core.getInput('repository');
  const sha = core.getInput('sha');
  const workflow_name = core.getInput('workflow_name');
  const job_name = core.getInput('job_name');
  const step_name = core.getInput('step_name');
  const token = core.getInput('token');
  const pat = core.getInput('pat');

  const job_id = +core.getState('job_id');

  const { owner, repo } = github.context.repo;
  const [target_owner, target_repo] = repository.split('/');

  const octokit = github.getOctokit(token);

  const post_step_name = `Post ${step_name}`;

  // The job from API is not updated immediately, retry until the current step is marked as running.
  const result = await retry(async last_attempt => {
    const { data: job } = await octokit.rest.actions.getJobForWorkflowRun({
      owner,
      repo,
      job_id
    });

    if (!job.steps) {
      throw new Error(`Job not found: ${job_name}`);
    }

    const post_step = job.steps.findIndex(step => step.name === post_step_name);
    if (post_step < 0) {
      throw new RetryableError(`Step not found: ${post_step_name}`);
    }

    // Wait until the post step is marked as running
    if (!job.steps[post_step].started_at) {
      throw new RetryableError(`Step not started: ${post_step_name}`);
    }

    const main_step = job.steps.findIndex(step => step.name === step_name);
    if (main_step < 0) {
      throw new Error(`Step not found: ${step_name}`);
    }

    // Collect statuses from all steps in between
    let success = true;
    for (let i = main_step + 1; i < post_step; i++) {
      if (job.steps[i].status !== 'completed') {
        // GitHub actions status update is asynchronous, so it's possible for the API/UI to reflect that two jobs are
        // running at the same time. Retry in this case.
        if (last_attempt) {
          // GitHub seems to have a bug where sometimes a step can be stuck in pending state until the whole job completes.
          // If this happens then we'll just assume it's successful to avoid frequent CI breakage.
          core.warning(
            `Step not completed: ${job.steps[i].name}. Assuming it's successful`
          );
          continue;
        }
        throw new RetryableError(`Step not completed: ${job.steps[i].name}`);
      }
      switch (job.steps[i].conclusion) {
        case 'success':
        case 'skipped':
          break;
        default:
          success = false;
          break;
      }
    }

    const elapsed = Math.round(
      (new Date(job.steps[post_step].started_at!).getTime() -
        new Date(job.started_at).getTime()) /
        1000
    );

    return {
      success,
      elapsed,
      url: job.html_url
    };
  });

  const octokit_pat = github.getOctokit(pat);
  await octokit_pat.rest.repos.createCommitStatus({
    owner: target_owner,
    repo: target_repo,
    sha,
    state: result.success ? 'success' : 'failure',
    target_url: result.url,
    description: `${result.success ? 'Successful in' : 'Failing after'} ${
      result.elapsed > 60
        ? `${Math.round(result.elapsed / 60)}m`
        : `${result.elapsed}s`
    }`,
    context: `${workflow_name} / ${job_name}`
  });
}
