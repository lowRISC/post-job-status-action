Post Job Status
===

This project has been developed to meet lowRISC's internal need and is *not supported* by lowRISC.

This is a GitHub action to post job status to another repository.

This can be useful if you needs to post status in a workflow_dispatch or pull_request_target.

## Parameters

| Name | Description |
| --- | --- |
| repository | The repository to post the status to. |
| sha | The commit sha to post the status to. |
| workflow_name | Name of the workflow. This shows up in the status check posted. It does not have to match the workflow that invokes this action. This defaults to the name of the running workflow. |
| job_name | The name of the job. This shows up in the status check posted, and it also needs to match the job that invokes this action. |
| step_name | The name of the step. This needs to match the step name that uses this action. It would not show up in the posted status check. |
| token | GitHub token that authenticates the running action. This defaults to `${{ github.token }}` and do not have to be explicitly set. |
| pat | GitHub personal access token that authenticates the status posting. This needs to have the `statuses:write` scope for the target repository. |

## Examples


```yaml
name: CI

on:
  pull_request_target:

permissions:
  statuses: write

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Post job status
        uses: lowRISC/post-job-status-action@v1
        with:
          repository: ${{ github.repository }}
          sha: ${{ github.event.pull_request.head.sha }}
          job_name: Build
          step_name: Post job status
          pat: ${{ github.token }}
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - name: Do Build
        run: ...
```
