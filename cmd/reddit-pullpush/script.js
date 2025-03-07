async function requestDownloadPermission() {
  // Request permission by trying to save a tiny test file
  const blob = new Blob(['test'], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function savePostToFile(post, id) {
  const jsonData = JSON.stringify(post, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fetchRedditPosts(idsString) {
  // Request download permission at start
  requestDownloadPermission();

  // Convert newline-separated string to array and clean up each ID
  const postIds = idsString.split('\n')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  const results = [];

  for (const id of postIds) {
    let success = false;
    while (!success) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `https://www.reddit.com/r/Caliebre/comments/${id}.json`, false);
        xhr.send();

        if (xhr.status === 429) {
          console.log(`Rate limited for ${id}, waiting 120 seconds...`);
          const startTime = new Date().getTime();
          while (new Date().getTime() - startTime < 120 * 1_000) {
            // Wait 60 seconds on rate limit
          }
          continue; // Retry this ID
        }

        if (xhr.status !== 200) {
          console.error(`Failed to fetch post ${id}: ${xhr.status}, retrying in 5 seconds...`);
          const startTime = new Date().getTime();
          while (new Date().getTime() - startTime < 5_000) {
            // Wait 5 seconds before retry
          }
          continue; // Retry this ID
        }

        const data = JSON.parse(xhr.responseText);
        const postData = data[0].data.children[0].data;

        const flair = postData.link_flair_text?.toLowerCase() || "";
        console.log(flair)
        if (!flair || flair === "video" || flair === "arte" || flair.includes('imagen') || flair.includes('no se yo')) {
          success = true; // Skip this post but mark as successful
          continue;
        }

        console.log("keeping " + id + " with flair: " + postData.link_flair_text);

        const filteredPost = {
          id: postData.id,
          link_flair_text: postData.link_flair_text,
          approved_at_utc: postData.approved_at_utc,
          author: postData.author,
          mod_note: postData.mod_note,
          mod_reports: postData.mod_reports,
          mod_reason_title: postData.mod_reason_title,
          created_utc: postData.created_utc,
          title: postData.title,
          url: postData.url,
          is_video: postData.is_video,
          permalink: postData.permalink
        };

        // Save this post immediately
        savePostToFile(filteredPost, id);

        results.push(filteredPost);
        success = true;

      } catch (error) {
        console.error(`Error processing post ${id}:`, error);
        console.log("Retrying in 5 seconds...");
        const startTime = new Date().getTime();
        while (new Date().getTime() - startTime < 5000) {
          // Wait 5 seconds before retry
        }
        // Loop will continue and retry
      }
    }

    // Small delay between successful posts
    const startTime = new Date().getTime();
    while (new Date().getTime() - startTime < 2000) {
      // 1 second delay between posts
    }
  }

  return results;
}
