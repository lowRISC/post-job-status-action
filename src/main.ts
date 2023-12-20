import * as core from '@actions/core';
import * as github from '@actions/github';

export async function run(): Promise<void> {
  const repository = core.getInput('repository');
  const sha = core.getInput('sha');
  const workflow_name = core.getInput('workflow_name');
  const job_name = core.getInput('job_name');
  const step_name = core.getInput('step_name');
  const token = core.getInput('token');
  const pat = core.getInput('pat');

  const { owner, repo } = github.context.repo;
  const [target_owner, target_repo] = repository.split('/');

  const octokit = github.getOctokit(token);
  const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: github.context.runId
  });

  // Find the running job
  const job = jobs.jobs.find(job => job.name === job_name);
  if (!job || !job.steps) {
    throw new Error(`Job not found: ${job_name}`);
  }
  core.saveState('job_id', job.id);

  // Find the running step. We don't need this now, but we check so that
  // the post run is able to identify the steps of interest.
  const step = job.steps.find(step => step.name === step_name);
  if (!step) {
    throw new Error(`Step not found: ${step_name}`);
  }

  const octokit_pat = github.getOctokit(pat);
  await octokit_pat.rest.repos.createCommitStatus({
    owner: target_owner,
    repo: target_repo,
    sha,
    state: 'pending',
    target_url: job.html_url,
    description: 'Running',
    context: `${workflow_name} / ${job_name}`
  });
}
