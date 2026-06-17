document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let releases = [];
    let activeReleaseId = null;
    let searchQuery = '';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const lastUpdatedText = document.getElementById('last-updated-text');
    
    // States
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    const retryBtn = document.getElementById('retry-btn');
    const releasesList = document.getElementById('releases-list');
    
    // Details Pane
    const noSelectionState = document.getElementById('no-selection-state');
    const detailContent = document.getElementById('detail-content');
    const detailTitle = document.getElementById('detail-title');
    const detailDate = document.getElementById('detail-date');
    const detailTag = document.getElementById('detail-tag');
    const detailLink = document.getElementById('detail-link');
    const detailBody = document.getElementById('detail-body');
    
    // Tweet Composer
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const tweetBtn = document.getElementById('tweet-btn');

    // Initialize Lucide Icons
    lucide.createIcons();

    // Helper: Strip HTML tags and return clean text
    function stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    // Helper: Create a short text snippet from the release note content
    function createTextSnippet(html, maxLength = 110) {
        const text = stripHtml(html).trim();
        // Remove multiple spaces/newlines
        const cleanText = text.replace(/\s+/g, ' ');
        if (cleanText.length <= maxLength) return cleanText;
        return cleanText.substring(0, maxLength) + '...';
    }

    // Helper: Determine tag type based on release note title or content
    function determineTag(title, content) {
        const text = (title + ' ' + content).toLowerCase();
        if (text.includes('deprecated') || text.includes('deprecation')) {
            return { label: 'Deprecated', class: 'badge-deprecated' };
        } else if (text.includes('feature') || text.includes('new feature') || text.includes('support for')) {
            return { label: 'Feature', class: 'badge-feature' };
        } else if (text.includes('change') || text.includes('updated') || text.includes('modify')) {
            return { label: 'Changed', class: 'badge-changed' };
        }
        return { label: 'General', class: 'badge-general' };
    }

    // Helper: Format ISO date string to a human-readable date
    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown Date';
        try {
            const date = new Date(dateStr);
            // Check if valid date
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    // Fetch Release Notes from API
    async function fetchReleases() {
        // Show loading state
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        releasesList.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`Failed to fetch releases: ${response.statusText}`);
            }
            const data = await response.json();
            
            if (data.status === 'success') {
                releases = data.releases;
                
                // Update header status
                const now = new Date();
                lastUpdatedText.textContent = `Updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                
                renderList();
            } else {
                throw new Error(data.message || 'API returned an error state');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            document.getElementById('error-message').textContent = `Error: ${error.message}`;
            errorState.classList.remove('hidden');
            loadingState.classList.add('hidden');
        } finally {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // Render left-side list
    function renderList() {
        releasesList.innerHTML = '';
        
        // Filter releases based on search query
        const filteredReleases = releases.filter(item => {
            const searchLower = searchQuery.toLowerCase();
            const titleMatch = item.title.toLowerCase().includes(searchLower);
            const contentMatch = stripHtml(item.content).toLowerCase().includes(searchLower);
            return titleMatch || contentMatch;
        });

        // Hide loading
        loadingState.classList.add('hidden');

        if (filteredReleases.length === 0) {
            emptyState.classList.remove('hidden');
            releasesList.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        releasesList.classList.remove('hidden');

        filteredReleases.forEach(item => {
            const tagInfo = determineTag(item.title, item.content);
            const li = document.createElement('li');
            li.className = `release-item ${activeReleaseId === item.id ? 'active' : ''}`;
            li.dataset.id = item.id;
            
            const snippet = createTextSnippet(item.content, 90);
            const displayDate = formatDate(item.updated);

            li.innerHTML = `
                <div class="item-meta">
                    <span class="item-date">${displayDate}</span>
                    <span class="badge ${tagInfo.class}">${tagInfo.label}</span>
                </div>
                <div class="item-title">${item.title}</div>
                <div class="item-snippet">${snippet}</div>
            `;

            li.addEventListener('click', () => selectRelease(item.id));
            releasesList.appendChild(li);
        });

        // Auto-select first item if nothing is selected yet
        if (!activeReleaseId && filteredReleases.length > 0) {
            selectRelease(filteredReleases[0].id);
        } else if (activeReleaseId) {
            // Check if currently active release is still in the filtered list
            const stillExists = filteredReleases.some(item => item.id === activeReleaseId);
            if (!stillExists && filteredReleases.length > 0) {
                selectRelease(filteredReleases[0].id);
            }
        }
    }

    // Select a specific release to show details
    function selectRelease(id) {
        activeReleaseId = id;
        
        // Update active class in list items
        document.querySelectorAll('.release-item').forEach(item => {
            if (item.dataset.id === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        const release = releases.find(item => item.id === id);
        if (!release) return;

        // Show details panel
        noSelectionState.classList.add('hidden');
        detailContent.classList.remove('hidden');

        // Populate details
        detailTitle.textContent = release.title;
        detailDate.textContent = formatDate(release.updated);
        
        const tagInfo = determineTag(release.title, release.content);
        detailTag.textContent = tagInfo.label;
        detailTag.className = `detail-tag ${tagInfo.class}`;
        
        detailLink.href = release.link;
        detailBody.innerHTML = release.content || '<p>No content preview available for this update.</p>';

        // Re-init lucide icons that might be rendered
        lucide.createIcons();

        // Populate tweet composer
        initTweetComposer(release);
    }

    // Initialize Tweet Composer with template
    function initTweetComposer(release) {
        const dateStr = formatDate(release.updated);
        const snippet = createTextSnippet(release.content, 110);
        
        // Build default tweet structure
        let tweetText = `📢 BigQuery Update (${dateStr}):\n`;
        tweetText += `"${release.title}"\n\n`;
        tweetText += `${snippet}\n\n`;
        tweetText += `Read more: ${release.link}\n`;
        tweetText += `#BigQuery #GCP`;

        // Crop if it somehow exceeds 280
        if (tweetText.length > 280) {
            const diff = tweetText.length - 280;
            // Shorten snippet to fit
            const shortenedSnippet = createTextSnippet(release.content, 110 - diff);
            tweetText = `📢 BigQuery Update (${dateStr}):\n`;
            tweetText += `"${release.title}"\n\n`;
            tweetText += `${shortenedSnippet}\n\n`;
            tweetText += `Read more: ${release.link}\n`;
            tweetText += `#BigQuery #GCP`;
        }

        tweetTextarea.value = tweetText;
        updateCharCount();
    }

    // Update Tweet character counter
    function updateCharCount() {
        const len = tweetTextarea.value.length;
        const remaining = 280 - len;
        charCounter.textContent = remaining;

        // Visual alerts for character count
        charCounter.classList.remove('warning', 'danger');
        if (remaining <= 20 && remaining > 0) {
            charCounter.classList.add('warning');
        } else if (remaining <= 0) {
            charCounter.classList.add('danger');
        }

        // Enable/disable tweet button
        if (len === 0 || remaining < 0) {
            tweetBtn.disabled = true;
            tweetBtn.style.opacity = 0.5;
            tweetBtn.style.cursor = 'not-allowed';
        } else {
            tweetBtn.disabled = false;
            tweetBtn.style.opacity = 1;
            tweetBtn.style.cursor = 'pointer';
        }
    }

    // Open Twitter Web Intent
    function handleTweet() {
        const text = tweetTextarea.value;
        if (!text || text.length > 280) return;
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    }

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderList();
    });

    tweetTextarea.addEventListener('input', updateCharCount);
    tweetBtn.addEventListener('click', handleTweet);

    // Initial Fetch
    fetchReleases();
});
