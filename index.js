const Parser = require("rss-parser");
const parser = new Parser();

// Configuration
const SUBREDDIT = "news"; // Change this to your subreddit name
const NTFY_TOPIC = "topic"; // Change this to your ntfy.sh topic
const RSS_FEED_URL = `https://www.reddit.com/r/${SUBREDDIT}/new/.rss?sort=new`;
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;
const CHECK_INTERVAL = 60000; // Check every minute

// Keep track of seen post IDs
const seenPosts = new Set();

async function doShit(dryRun = false) {
  const feed = await parser.parseURL(RSS_FEED_URL);
  feed.items.forEach(async (entry) => {
    if (!seenPosts.has(entry.id)) {
      seenPosts.add(entry.id);
      if (!dryRun) {
        await fetch(NTFY_URL, {
          method: "POST",
          body: `r/${SUBREDDIT}: ${entry.title}`,
          headers: { Click: entry.link },
        });
        console.log(`Sent notification: ${entry.title}`);
      }
    }
  });
}

console.log("Starting RSS feed checker...");
doShit(true); // Run with dryRun = true first to avoid spamming the topic with old posts
setInterval(doShit, CHECK_INTERVAL);
