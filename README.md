# GitHub Organization Member Commits Details in one repositroy Report Action

> A GitHub Action to generate a report showing specified member commits in the specified repository for the specified days.

## Usage

Copy paste the below YAML file in `.github/workflows/member_contribution.yml` of any repository of your organization. 

You can also the cron job to run daily, weekly or monthly to execute it periodically. 

**Note:** When running on cron job, make sure to set the default values of days, org and repo.

```yml
name: Member Contribution Report

on:
  schedule:
    # Runs on the first day of the month at 00:00 UTC
    #
    #        ┌────────────── minute
    #        │ ┌──────────── hour
    #        │ │ ┌────────── day (month)
    #        │ │ │ ┌──────── month
    #        │ │ │ │ ┌────── day (week)
    - cron: '0 0 1 * *'
  workflow_dispatch:
    inputs:
      days:
        description: 'Optional interval start date (format: yyyy-mm-dd)'
        required: false # Skipped if workflow dispatch input is not provided
      org:
        description: 'GitHub organization to retrieve data from. Default current'
        default: ''
        required: true
      repo:
        description: 'Name of the repo. Default current'
        required: true

jobs:
  member-contribution-report:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Get Member Contributions
        uses: nicklegan/github-org-member-contribution-action@v1.1.1
        with:
          token: ${{ secrets.ORG_TOKEN }}
          days: ${{ inputs.days }}
          repo: ${{ inputs.repo }}
          org: ${{ inputs.org }} 
```

## GitHub secrets

| Name                 | Value                                                            | Required |
| :------------------- | :--------------------------------------------------------------- | :------- |
| `ORG_TOKEN`          | A `repo`, `read:org`, `read:user` scoped [Personal Access Token] | `true`   |
| `ACTIONS_STEP_DEBUG` | `true` [Enables diagnostic logging]                              | `false`  |

[personal access token]: https://github.com/settings/tokens/new?scopes=repo,read:org,read:user&description=Member+Contribution+Action 'Personal Access Token'
[enables diagnostic logging]: https://docs.github.com/en/actions/managing-workflow-runs/enabling-debug-logging#enabling-runner-diagnostic-logging 'Enabling runner diagnostic logging'

:bulb: Disable [token expiration](https://github.blog/changelog/2021-07-26-expiration-options-for-personal-access-tokens/) to avoid failed workflow runs when running on a schedule.

## Action inputs

| Name              | Description                                                   | Default                     | Options                                                                                                                                                                            | Required |
| :---------------- | :------------------------------------------------------------ | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| `org`             | Organization different than workflow context                  |                             |                                                                                                                                                                                    | `true`  |
| `days`            | Amount of days in the past to collect data for                | `7`                        |                                                                                                                                                                                    | `true`  |
| `repo`            | Name of Repo            | current repo in which action is running             | any other repo of org | `true`  |

## Workflow dispatch inputs

In case of workflow dispatch event, the input values will overrie the default values.

## CSV layout

The results of all except the first two columns will be the sum of contributions for the requested interval per organization member.

| Column                   | Description                                                     |
| :----------------------- | :-------------------------------------------------------------- |
| Member                   | Username of the organization member                             |
| Name of Repo | Repo from which data is retrived                   |
| Commits created          | total commits                     |

A CSV report file to be printed

## GitHub App authentication

In some scenarios it might be preferred to authenthicate as a [GitHub App](https://docs.github.com/developers/apps/getting-started-with-apps/about-apps) rather than using a [personal access token](https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

The following features could be a benefit authenticating as a GitHub App installation:

- The GitHub App is directly installed on the organization, no separate user account is required.
- A GitHub App has more granular permissions than a personal access token.
- To avoid hitting the 5000 requests per hour GitHub API rate limit, [authenticating as a GitHub App installation](https://docs.github.com/developers/apps/building-github-apps/authenticating-with-github-apps#authenticating-as-an-installation) would increase the [API request limit](https://docs.github.com/developers/apps/building-github-apps/rate-limits-for-github-apps#github-enterprise-cloud-server-to-server-rate-limits).

The GitHub App authentication strategy can be integrated with the Octokit library by installing and configuring the [@octokit/auth-app](https://github.com/octokit/auth-app.js/#usage-with-octokit) npm module before [rebuilding](https://docs.github.com/actions/creating-actions/creating-a-javascript-action) the Action in a separate repository.