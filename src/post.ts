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
  const job = await retry(async () => {
    const { data: job } = await octokit.rest.actions.getJobForWorkflowRun({
      owner,
      repo,
      job_id
    });

    if (!job.steps) {
      throw new Error(`Job not found: ${job_name}`);
    }

    // Wait until the post step is marked as running
    const post_step = job.steps.find(step => step.name === post_step_name);
    if (!post_step) {
      throw new RetryableError(`Step not found: ${post_step_name}`);
    }

    if (!post_step.started_at) {
      throw new RetryableError(`Step not started: ${post_step_name}`);
    }

    return job;
  });

  const steps = job.steps!;
  const main_step = steps.findIndex(step => step.name === step_name);
  if (main_step < 0) {
    throw new Error(`Step not found: ${step_name}`);
  }

  const post_step = steps.findIndex(step => step.name === post_step_name);
  if (post_step < 0) {
    throw new Error(`Step not found: ${post_step_name}`);
  }

  // Collect statuses from all steps in between
  let success = true;
  for (let i = main_step + 1; i < post_step; i++) {
    if (steps[i].status !== 'completed') {
      throw new Error(`Step not completed: ${steps[i].name}`);
    }
    switch (steps[i].conclusion) {
      case 'success':
      case 'skipped':
        break;
      default:
        success = false;
        break;
    }
  }

  const elapsed = Math.round(
    (new Date(steps[post_step].started_at!).getTime() -
      new Date(job!.started_at).getTime()) /
      1000
  );

  const octokit_pat = github.getOctokit(pat);
  await octokit_pat.rest.repos.createCommitStatus({
    owner: target_owner,
    repo: target_repo,
    sha,
    state: success ? 'success' : 'failure',
    target_url: job!.html_url,
    description: `${success ? 'Successful in' : 'Failing after'} ${
      elapsed > 60 ? `${Math.round(elapsed / 60)}m` : `${elapsed}s`
    }`,
    context: `${workflow_name} / ${job_name}`
  });
}
