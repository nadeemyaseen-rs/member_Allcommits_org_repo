const core = require('@actions/core')
const github = require('@actions/github')
const {GitHub} = require('@actions/github/lib/utils')
const {retry} = require('@octokit/plugin-retry')
const {throttling} = require('@octokit/plugin-throttling')

const MyOctokit = GitHub.plugin(throttling, retry)
const eventPayload = require(process.env.GITHUB_EVENT_PATH)
const org = core.getInput('org', {required: false}) || eventPayload.organization.login
const token = core.getInput('token', {required: true})
///////////////// added by nadeem ///////////////////
const repo = core.getInput('repo', { required: false }) || github.context.repo.repo
const uname = core.getInput('username', {required: true})
const fs = require('fs');
const readline = require('readline');
/////////////////////////////////////////////////////


// API throttling
const octokit = new MyOctokit({
  auth: token,
  request: {
    retries: 3,
    retryAfter: 180
  },
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`)

      if (options.request.retryCount === 0) {
        // only retries once
        octokit.log.info(`Retrying after ${retryAfter} seconds!`)
        return true
      }
    },
    onAbuseLimit: (retryAfter, options, octokit) => {
      // does not retry, only logs a warning
      octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`)
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(`Secondary rate limit reached for request ${options.method} ${options.url}`)
    }
  }
})

///////////////// added by nadeem ///////////////////////////
// Query all commits of given user in all Repos of org from given time
async function getAllBranchComits(uid,from,uniqueOids,jsonData) {
  let paginationMember = null
  const query = `query ($org: String!, $repo: String!, $uid: ID, $from: GitTimestamp, $after: String) {
    repository(name: $repo, owner: $org) {
      refs(refPrefix: "refs/heads/", first: 100, after: $after) {
        edges {
          node {
            name
            target {
              ... on Commit {
                history(author: {id: $uid}, since: $from) {
                  edges {
                    node {
                      oid
                      author {
                        name
                        email
                        date
                      }
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }`

  try {
    let hasNextPageMember = false
    let getComitResult = null

    do {
      getComitResult = await octokit.graphql({
        query,
        org,
        repo,
        uid,
        from,
        after: paginationMember
      })

      //const ComitObj = getComitResult.organization.repositories.nodes
      hasNextPageMember = getComitResult.repository.refs.pageInfo.hasNextPage
      if (hasNextPageMember) {
        paginationMember = getComitResult.repository.refs.pageInfo.endCursor
      } else {
        paginationMember = null
      }

      const oidSet = new Set();
      
        getComitResult.repository.refs.edges.forEach((edge) => {
          if (edge.node.target.history.edges.length > 0) {
            edge.node.target.history.edges.forEach((historyEdge) => {
              oidSet.add(historyEdge.node.oid);
            });
          }
        });

      uniqueOids.push(...Array.from(oidSet))
      jsonData = getComitResult

    } while (hasNextPageMember)
  } catch (error) {
    core.setFailed(error.message)
  }
  const totalcommits = uniqueOids.length
  console.log(`Total number of uniques commits are: ${totalcommits}`)
  console.log('')
  console.log('Details of commits is:')
  console.log(JSON.stringify(jsonData, null, 2))
  //console.log(uniqueOids);

}

/////////////////////////////////////////////////////////////

;(async () => {
  try {
    // Find user id for member
    const query = `query ($username: String!) {
      user(login: $username) {
        id
      }
    }`
    getUserIdResult = await octokit.graphql({
      query,
      username: uname
    })
  
  const uid = getUserIdResult.user.id    

    let to
    let from
    let days
    let logDate
      
    days = core.getInput('days', {required: true}) || '7'
    to = new Date()
    from = new Date()
    from.setDate(to.getDate() - days)
    logDate = `${days} days`

    // Take time, org/repo parameters and init array to get all commits
    const jsonData = {}
    const uniqueOids = [] 
    console.log(`Retrieving ${logDate} of ${uname} commits in ${org}/${repo}:`)
    await getAllBranchComits(uid,from,uniqueOids,jsonData)
  } catch (error) {
    core.setFailed(error.message)
  }
})()

