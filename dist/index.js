/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 620:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 393:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 155:
/***/ ((module) => {

module.exports = eval("require")("@actions/github/lib/utils");


/***/ }),

/***/ 738:
/***/ ((module) => {

module.exports = eval("require")("@octokit/plugin-retry");


/***/ }),

/***/ 436:
/***/ ((module) => {

module.exports = eval("require")("@octokit/plugin-throttling");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 521:
/***/ ((module) => {

"use strict";
module.exports = require("readline");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(620)
const github = __nccwpck_require__(393)
const {GitHub} = __nccwpck_require__(155)
const {retry} = __nccwpck_require__(738)
const {throttling} = __nccwpck_require__(436)

const MyOctokit = GitHub.plugin(throttling, retry)
const eventPayload = require(process.env.GITHUB_EVENT_PATH)
const org = core.getInput('org', {required: false}) || eventPayload.organization.login
const token = core.getInput('token', {required: true})
///////////////// added by nadeem ///////////////////
const repo = core.getInput('repo', { required: false }) || github.context.repo.repo
const uname = core.getInput('username', {required: true})
const usernames = uname.split(',')
const fs = __nccwpck_require__(147);
const readline = __nccwpck_require__(521);
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
async function getAllBranchComits(uid,from,uniqueOids,jsonData,username) {
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
      jsonData = { ...jsonData, ...getComitResult }

    } while (hasNextPageMember)
  } catch (error) {
    core.setFailed(error.message)
  }
  const totalcommits = uniqueOids.length
  console.log(`${username}, ${totalcommits}`)
  //console.log('')
  //console.log('Details of commits is:')
  //console.log(JSON.stringify(jsonData, null, 2))
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
    console.log(' ')
    for (const username of uname){ 
    getUserIdResult = await octokit.graphql({
      query,
      username: uname
    })
    const uid = getUserIdResult.user.id  
    await getAllBranchComits(uid,from,uniqueOids,jsonData,username)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
})()


})();

module.exports = __webpack_exports__;
/******/ })()
;