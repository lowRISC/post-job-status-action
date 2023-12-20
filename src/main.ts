import * as core from '@actions/core';
import * as github from '@actions/github';

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);

    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      repo: github.context.repo.owner,
      owner: github.context.repo.repo,
      run_id: github.context.runId
    });

    core.debug(JSON.stringify(jobs));
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
