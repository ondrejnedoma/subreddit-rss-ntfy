const Parser = require("rss-parser");
const parser = new Parser({
  headers: {
    Cookie: {
      token_v2:
        // Reddit might hate you and IP ban you if you make too many requests without a token
        "TOKEN",
    },
  },
});

const SUBREDDIT = "news"; // Change this to your subreddit name
const NTFY_TOPIC = "topic"; // Change this to your ntfy.sh topic
const RSS_FEED_URL = `https://www.reddit.com/r/${SUBREDDIT}/new/.rss?sort=new`;
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`; // Can be changed if self-hosting ntfy.sh
const CHECK_INTERVAL = 60000; // Check every minute
const KW_BLACKLIST = ["spoiler", "nsfw"]; // Add keywords to ignore posts containing them

const seenPosts = new Set();
let isFirstRun = true;

async function checkFeed() {
  try {
    const feed = await parser.parseURL(RSS_FEED_URL);
    if (isFirstRun) {
      feed.items.forEach((entry) => seenPosts.add(entry.id));
      isFirstRun = false;
      console.log("Initial fetch successful, cache populated.");
      return;
    }
    const newPosts = feed.items.filter((entry) => !seenPosts.has(entry.id));
    for (const entry of newPosts) {
      // Create a combined string of title and content and check for blacklisted keywords
      const allContent = `${entry.title} ${entry.content}`.toLowerCase();
      const hasBlacklistedKeyword = KW_BLACKLIST.some((kw) =>
        allContent.includes(kw.toLowerCase()),
      );
      if (hasBlacklistedKeyword) {
        console.log(`Skipping post (blacklisted keyword): ${entry.title}`);
      } else {
        // Attempt to send notification request and log any errors
        try {
          await fetch(NTFY_URL, {
            method: "POST",
            body: `r/${SUBREDDIT}: ${entry.title}`,
            headers: { Click: entry.link },
          });
          console.log(`Sent notification: ${entry.title}`);
        } catch (fetchError) {
          console.error(
            `Failed to send notification for ${entry.title}`,
            fetchError,
          );
        }
      }
    }
    // Mark new posts as seen
    newPosts.forEach((entry) => seenPosts.add(entry.id));
    // Cleanup old entries to prevent memory bloat
    if (seenPosts.size > 1000) {
      const toDelete = seenPosts.size - 500;
      const iterator = seenPosts.values();
      for (let i = 0; i < toDelete; i++) {
        seenPosts.delete(iterator.next().value);
      }
    }
  } catch (error) {
    console.error("Error fetching or parsing RSS feed:", error.message);
  }
}

console.log("Starting RSS feed checker...");
checkFeed();
setInterval(checkFeed, CHECK_INTERVAL);
