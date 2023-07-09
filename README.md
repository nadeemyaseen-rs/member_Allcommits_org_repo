# GitHub Organization Member Commits Details in one repositroy Report Action

> A GitHub Action to generate a report showing specified member commits in the specified repository for the specified days.

## Usage

Copy paste the below YAML file in `.github/workflows/member_contribution.yml` of any repository of your organization. 

You can also run a cron job on daily, weekly or monthly basis to get the data. 

**Note:** When running on cron job, make sure to set the default values of user name, days, org and repo.

```yml
name: Member Commits Details

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
        description: 'Number of days'
        required: false # Skipped if workflow dispatch input is not provided
      org:
        description: 'GitHub organization to retrieve data from. Default current'
        default: ''
        required: true
      repo:
        description: 'Name of the repo. Default current'
        required: true
      username:
        description: 'Member GitHub User Name whose commits details is required.'
        required: true

jobs:
  member-commits-details:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Retrive commit details
        uses: nadeemyaseen-rs/member_Allcommits_org_repo@v0.1
        with:
          token: ${{ secrets.ORG_TOKEN }}
          days: ${{ inputs.days }}
          repo: ${{ inputs.repo }}
          org: ${{ inputs.org }} 
          username: ${{ inputs.username }}
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
| `username`            | Name of Member whose commits details is required          | None             | any name of organization | `true`  |

## Workflow dispatch inputs

In case of workflow dispatch event, the input values will overrie the default values.

## Output

It prints the following output:

```
Retrieving 4 days of nadeemyaseen-rs commits in RapidSilicon/Test_Release:
Total number of uniques commits are: 8

Details of commits is:
{
  "repository": {
    "refs": {
      "edges": [
        {
          "node": {
            "name": "main",
            "target": {
              "history": {
                "edges": [
                  {
                    "node": {
                      "oid": "58bc20a436e8863ad8ce9c597ec88119e0915d24",
                      "author": {
                        "name": "Nadeem Yaseen",
                        "email": "86344264+nadeemyaseen-rs@users.noreply.github.com",
                        "date": "2023-07-06T14:34:51+05:00"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        {
          "node": {
            "name": "nadeemyaseen-rs-patch-1",
            "target": {
              "history": {
                "edges": []
              }
            }
          }
        },
        {
          "node": {
            "name": "test_branch",
            "target": {
              "history": {
                "edges": []
              }
            }
          }
        }
      ],
      "pageInfo": {
        "hasNextPage": false,
        "endCursor": "Mw"
      }
    }
  }
}

```

## GitHub App authentication

In some scenarios it might be preferred to authenthicate as a [GitHub App](https://docs.github.com/developers/apps/getting-started-with-apps/about-apps) rather than using a [personal access token](https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

The following features could be a benefit authenticating as a GitHub App installation:

- The GitHub App is directly installed on the organization, no separate user account is required.
- A GitHub App has more granular permissions than a personal access token.
- To avoid hitting the 5000 requests per hour GitHub API rate limit, [authenticating as a GitHub App installation](https://docs.github.com/developers/apps/building-github-apps/authenticating-with-github-apps#authenticating-as-an-installation) would increase the [API request limit](https://docs.github.com/developers/apps/building-github-apps/rate-limits-for-github-apps#github-enterprise-cloud-server-to-server-rate-limits).

The GitHub App authentication strategy can be integrated with the Octokit library by installing and configuring the [@octokit/auth-app](https://github.com/octokit/auth-app.js/#usage-with-octokit) npm module before [rebuilding](https://docs.github.com/actions/creating-actions/creating-a-javascript-action) the Action in a separate repository.