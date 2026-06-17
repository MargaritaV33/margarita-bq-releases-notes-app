import os
import requests
import feedparser
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ALTERNATIVE_FEED_URL = "https://cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    
    # Parse the feed content using feedparser
    feed = feedparser.parse(response.content)
    return feed

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Try fetching the primary feed
        try:
            feed = fetch_and_parse_feed(FEED_URL)
        except Exception as e:
            print(f"Error fetching primary feed: {e}. Trying alternative feed.")
            feed = fetch_and_parse_feed(ALTERNATIVE_FEED_URL)
            
        releases = []
        for entry in feed.entries:
            # GCP release notes typically contain 'content' and/or 'summary'
            content_html = ""
            if "content" in entry:
                content_html = entry.content[0].value
            elif "summary" in entry:
                content_html = entry.summary
            
            # Format date
            updated_str = entry.get("updated", entry.get("published", ""))
            
            releases.append({
                "id": entry.get("id", entry.get("link", "")),
                "title": entry.get("title", "No Title"),
                "link": entry.get("link", ""),
                "updated": updated_str,
                "content": content_html
            })
            
        return jsonify({
            "status": "success",
            "feed_title": feed.feed.get("title", "BigQuery Release Notes"),
            "feed_link": feed.feed.get("link", ""),
            "releases": releases
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
