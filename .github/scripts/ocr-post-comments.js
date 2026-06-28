// Post OpenCodeReview JSON results as GitHub PR review comments.
// Designed to run inside actions/github-script.
module.exports = async function postOcrComments({ github, context }) {
  const fs = require("node:fs");

  const RESULT_PATH = "/tmp/ocr-result.json";
  const STDERR_PATH = "/tmp/ocr-stderr.log";

  const MAX_RETRIES = intVar("OCR_MAX_RETRIES", 3);
  const SUCCESS_DELAY = intVar("OCR_SUCCESS_DELAY", 2000);
  const FAILURE_DELAY = intVar("OCR_FAILURE_DELAY", 1000);
  const LOW_REMAINING_THRESHOLD = intVar("OCR_LOW_REMAINING_THRESHOLD", 3);
  const LOW_REMAINING_SPACING = intVar("OCR_LOW_REMAINING_SPACING", 10000);
  const RETRY_BASE_DELAY = intVar("OCR_RETRY_BASE_DELAY", 60000);
  const RETRY_MAX_DELAY = intVar("OCR_RETRY_MAX_DELAY", 300000);

  let result;
  try {
    const raw = fs.readFileSync(RESULT_PATH, "utf8");
    result = JSON.parse(raw);
  } catch (err) {
    const stderr = readFile(STDERR_PATH);
    console.log("Failed to parse OCR output:", err.message);
    if (stderr) {
      await createIssueComment(
        `⚠️ **OpenCodeReview** encountered an error:\n${fencedBlock(stderr)}`
      );
    }
    return;
  }

  const comments = result.comments || [];
  const warnings = result.warnings || [];

  if (comments.length === 0) {
    const message = result.message || "No comments generated. Looks good to me.";
    await createIssueComment(`✅ **OpenCodeReview**: ${message}`);
    return;
  }

  const prNumber = context.issue.number;
  const commitSha = await resolveHeadSha();

  const inlineComments = [];
  const summaryComments = [];

  for (const comment of comments) {
    const body = formatComment(comment);
    const hasLine = comment.start_line >= 1 || comment.end_line >= 1;
    if (!hasLine) {
      summaryComments.push({ comment, body });
      continue;
    }

    const reviewComment = { path: comment.path, body };
    if (
      comment.start_line >= 1 &&
      comment.end_line >= 1 &&
      comment.start_line !== comment.end_line
    ) {
      reviewComment.start_line = comment.start_line;
      reviewComment.line = comment.end_line;
      reviewComment.start_side = "RIGHT";
      reviewComment.side = "RIGHT";
    } else if (comment.end_line >= 1) {
      reviewComment.line = comment.end_line;
      reviewComment.side = "RIGHT";
    } else {
      reviewComment.line = comment.start_line;
      reviewComment.side = "RIGHT";
    }
    inlineComments.push({ comment, reviewComment });
  }

  let successCount = 0;
  let failedCount = 0;
  const failedComments = [];

  try {
    await github.rest.pulls.createReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
      commit_id: commitSha,
      body: buildSummaryBody(
        comments.length,
        inlineComments.length,
        summaryComments.length,
        warnings
      ),
      event: "COMMENT",
      comments: inlineComments.map(({ reviewComment }) => reviewComment),
    });
    successCount = inlineComments.length;
    console.log(`Posted review with ${successCount} inline comment(s)`);
  } catch (err) {
    console.log("Batch review failed, falling back to individual comments:", err.message);
    const cooldown = computeRetryDelay(err, 0);
    if (cooldown) await sleep(cooldown.delayMs);

    for (const { comment, reviewComment } of inlineComments) {
      let posted = false;
      for (let attempt = 0; attempt <= MAX_RETRIES && !posted; attempt++) {
        try {
          const res = await github.rest.pulls.createReview({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber,
            commit_id: commitSha,
            body: "",
            event: "COMMENT",
            comments: [reviewComment],
          });
          successCount++;
          posted = true;
          const remaining = logRateLimit(res, reviewComment.path);
          await sleep(
            remaining != null && remaining <= LOW_REMAINING_THRESHOLD
              ? LOW_REMAINING_SPACING
              : SUCCESS_DELAY
          );
        } catch (innerErr) {
          const retry = computeRetryDelay(innerErr, attempt);
          const willRetry = retry && attempt < MAX_RETRIES;
          if (willRetry) {
            console.log(`Retry ${reviewComment.path}: ${retry.detail}`);
            await sleep(retry.delayMs);
          } else {
            failedCount++;
            failedComments.push({ comment, error: innerErr.message });
            console.log(`Failed ${reviewComment.path}: ${innerErr.message}`);
            await sleep(retry ? SUCCESS_DELAY : FAILURE_DELAY);
            break;
          }
        }
      }
    }
  }

  const summaryCount = summaryComments.length + failedComments.length;
  let finalBody = buildSummaryBody(comments.length, successCount, summaryCount, warnings);
  for (const { comment } of summaryComments) {
    finalBody += `\n\n---\n\n${formatCommentMarkdown(comment)}`;
  }
  if (failedComments.length > 0) {
    finalBody += "\n\n---\n\n### ⚠️ Comments that could not be posted inline\n";
    for (const { comment, error } of failedComments) {
      finalBody += `\n\n---\n\n${formatCommentMarkdown(comment, error)}`;
    }
  }
  finalBody += `\n\n---\n\n📊 **Posting statistics:** ${successCount} posted, ${failedCount} failed.`;

  await createIssueComment(finalBody);

  // --- helpers -----------------------------------------------------------

  function readFile(path) {
    try {
      return fs.readFileSync(path, "utf8").trim();
    } catch {
      return "";
    }
  }

  async function createIssueComment(body) {
    return github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body,
    });
  }

  async function resolveHeadSha() {
    if (context.eventName === "pull_request_target") {
      return context.payload.pull_request.head.sha;
    }
    const { data: pr } = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.issue.number,
    });
    return pr.head.sha;
  }

  function formatComment(comment) {
    let body = comment.content || "";
    if (comment.suggestion_code && comment.existing_code) {
      body += `\n\n**Suggestion:**\n${fencedBlock(comment.suggestion_code, "suggestion")}`;
    }
    return body;
  }

  function formatCommentMarkdown(comment, error) {
    let md = `### 📄 \`${comment.path}\``;
    if (comment.start_line && comment.end_line) {
      md += ` (L${comment.start_line}-L${comment.end_line})`;
    }
    md += "\n\n";
    if (error) md += `⚠️ Could not post inline: ${error}\n\n`;
    md += comment.content || "";
    if (comment.suggestion_code && comment.existing_code) {
      md += `\n\n**Before:**\n${fencedBlock(comment.existing_code)}`;
      md += `\n\n**After:**\n${fencedBlock(comment.suggestion_code)}`;
    }
    return md;
  }

  function buildSummaryBody(total, inline, summary, warnings) {
    let body = `🔍 **OpenCodeReview** found **${total}** issue(s) in this PR.`;
    if (total > 0) {
      body += `\n- ✅ ${inline} inline comment(s)`;
      body += `\n- 📝 ${summary} summary comment(s)`;
    }
    if (warnings.length > 0) {
      body += `\n\n⚠️ ${warnings.length} warning(s) occurred during review.`;
    }
    return body;
  }

  function fencedBlock(content, language = "") {
    const text = String(content || "");
    const ticks = Math.max(
      3,
      (text.match(/`+/g) || []).reduce((m, t) => Math.max(m, t.length), 0) + 1
    );
    const fence = "`".repeat(ticks);
    return `${fence + language}\n${text}${text.endsWith("\n") ? "" : "\n"}${fence}`;
  }

  function intVar(name, fallback) {
    const value = process.env[name];
    return value ? parseInt(value, 10) : fallback;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getHeader(headers, name) {
    const value = headers[name] != null ? headers[name] : headers[name.toLowerCase()];
    return value != null ? String(value).trim() : undefined;
  }

  function logRateLimit(response, tag) {
    const h = response?.headers || {};
    const remaining = getHeader(h, "x-ratelimit-remaining");
    const limit = getHeader(h, "x-ratelimit-limit");
    if (remaining != null) {
      console.log(`[rate-limit] ${tag}: remaining=${remaining}${limit ? `/${limit}` : ""}`);
    }
    return remaining != null ? Number(remaining) : null;
  }

  function computeRetryDelay(error, attempt) {
    if (!error) return null;
    const status = error.status;
    const message = String(error.message || "");
    const isRateLimit =
      status === 429 || (status === 403 && /rate limit|abuse|secondary/i.test(message));
    const isTransient = (status >= 500 && status < 600) || status === 408;
    if (!isRateLimit && !isTransient) return null;

    const headers = error.response?.headers || {};
    const nowSec = Math.floor(Date.now() / 1000);
    let info = null;

    if (isRateLimit) {
      const retryAfter = getHeader(headers, "retry-after");
      if (retryAfter) {
        const secs = Number(retryAfter);
        if (!Number.isNaN(secs) && secs >= 0) {
          info = { rawMs: secs * 1000, source: "retry-after", detail: `${secs}s` };
        } else {
          const dateMs = Date.parse(retryAfter);
          if (!Number.isNaN(dateMs)) {
            info = {
              rawMs: Math.max(0, dateMs - Date.now()),
              source: "retry-after",
              detail: retryAfter,
            };
          }
        }
      }
      if (!info) {
        const remaining = getHeader(headers, "x-ratelimit-remaining");
        const reset = getHeader(headers, "x-ratelimit-reset");
        if (reset != null && Number(remaining) === 0) {
          const rawMs = Math.max(0, Number(reset) - nowSec) * 1000;
          info = {
            rawMs,
            source: "x-ratelimit-reset",
            detail: `reset in ${Math.ceil(rawMs / 1000)}s`,
          };
        }
      }
      if (!info) {
        const backoff = Math.min(RETRY_BASE_DELAY * 2 ** attempt, RETRY_MAX_DELAY);
        info = { rawMs: backoff, source: "exponential-backoff", detail: `${backoff}ms` };
      }
    } else {
      const backoff = Math.min(2000 * 2 ** attempt, RETRY_MAX_DELAY);
      info = { rawMs: backoff, source: "transient-backoff", detail: `${backoff}ms` };
    }

    const delayMs = Math.min(info.rawMs, RETRY_MAX_DELAY);
    return { delayMs, source: info.source, detail: info.detail };
  }
};
