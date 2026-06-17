# BigQuery Release Notes Tracker

A sleek, responsive, and modern Python Flask web application that aggregates, categorizes, and displays the latest BigQuery release notes. It parses the official Google Cloud feed directly and provides an interactive Twitter (X) composer to share updates with a single click.

---

## ✨ Features

- **Master-Detail Flow:** A split-pane design that allows you to easily scroll and filter updates on the left while previewing detailed release notes on the right.
- **Smart Automated Tagging:** Categorizes updates as **Feature**, **Changed**, or **Deprecated** using intelligent client-side keyword heuristics.
- **Live Search & Filtering:** Instantly filter release notes by title or description content as you type.
- **Twitter Web Intent Integration:** Pre-composes a tweet with the update's title, a snippet summary, hashtags (`#BigQuery #GCP`), and the official GCP documentation link, complete with a live 280-character boundary counter.
- **Asynchronous Refresh & Spinner:** Pulls updates on-demand using a background AJAX call and plays a CSS rotating spinner while loading.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.14+, Flask, `requests`, `feedparser`
- **Frontend:** HTML5 (Semantic elements), CSS3 (Flexbox, Grid, custom properties), Vanilla ES6 JavaScript
- **Icons:** Lucide Icons (CDN)
- **Fonts:** Inter (UI) & JetBrains Mono (Codeblocks) from Google Fonts

---

## 🚀 Installation & Running Locally

Follow these instructions to run the application on your computer:

### 1. Clone or Open the Workspace
Open a terminal in the project directory:
```bash
cd bq-releases-notes
```

### 2. Setup a Python Virtual Environment
Initialize a virtual environment to manage dependencies:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install the required packages from [requirements.txt](requirements.txt):
```bash
pip install -r requirements.txt
```

### 4. Start the Application Server
Run the Flask server:
```bash
python app.py
```

The web server will start running on: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**. Open this address in your browser.

---

## 📂 File Directory Structure

* [app.py](app.py) — Flask server, routes, and XML feed parser engine.
* [requirements.txt](requirements.txt) — List of required Python libraries.
* [templates/index.html](templates/index.html) — HTML template specifying page hierarchy.
* [static/css/style.css](static/css/style.css) — Custom stylesheet containing color tokens and animations.
* [static/js/main.js](static/js/main.js) — Main client logic: APIs, search, tagging, and tweet draft composer.
* [.gitignore](.gitignore) — Configured to ignore local environments, logs, and cache.

---

## 📄 License
This project is open-source and available under the MIT License.
