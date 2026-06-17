document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let releases = [];
    let activeReleaseId = null;
    let searchQuery = '';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const exportBtn = document.getElementById('export-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
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

    // Helper: Copy individual release note to clipboard
    function copyItemToClipboard(item, btn) {
        const dateStr = formatDate(item.updated);
        const tagInfo = determineTag(item.title, item.content);
        const textContent = stripHtml(item.content).trim();
        
        const formattedText = `BigQuery Release Note (${dateStr}) [${tagInfo.label}]
Title: ${item.title}
Link: ${item.link}

Description:
${textContent}`;

        navigator.clipboard.writeText(formattedText).then(() => {
            // Success animation
            const icon = btn.querySelector('i');
            icon.setAttribute('data-lucide', 'check');
            btn.style.backgroundColor = 'var(--tag-feature-bg)';
            btn.style.color = 'var(--tag-feature)';
            btn.style.borderColor = 'var(--tag-feature)';
            lucide.createIcons();

            setTimeout(() => {
                icon.setAttribute('data-lucide', 'copy');
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.style.borderColor = '';
                lucide.createIcons();
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // Helper: Export releases to CSV
    function exportToCSV() {
        if (releases.length === 0) {
            alert('No data available to export.');
            return;
        }

        const headers = ['Date', 'Title', 'Tag', 'Link', 'Description'];
        const rows = releases.map(item => {
            const dateStr = formatDate(item.updated);
            const tagInfo = determineTag(item.title, item.content);
            const plainContent = stripHtml(item.content).trim().replace(/\s+/g, ' ');
            
            return [
                dateStr,
                item.title,
                tagInfo.label,
                item.link,
                plainContent
            ];
        });

        // Helper: Escape CSV cells
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            let stringVal = val.toString();
            stringVal = stringVal.replace(/"/g, '""');
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
                stringVal = `"${stringVal}"`;
            }
            return stringVal;
        };

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'bigquery_release_notes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Helper: Toggle theme between light and dark modes
    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        updateThemeIcon(isLight);
    }

    function updateThemeIcon(isLight) {
        if (isLight) {
            themeIcon.setAttribute('data-lucide', 'moon');
            themeToggle.title = 'Switch to Dark Mode';
        } else {
            themeIcon.setAttribute('data-lucide', 'sun');
            themeToggle.title = 'Switch to Light Mode';
        }
        lucide.createIcons();
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
                <button class="btn-copy-card" title="Copy to Clipboard">
                    <i data-lucide="copy"></i>
                </button>
            `;

            const copyBtn = li.querySelector('.btn-copy-card');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card selection
                copyItemToClipboard(item, copyBtn);
            });

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
    exportBtn.addEventListener('click', exportToCSV);
    themeToggle.addEventListener('click', toggleTheme);
    retryBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderList();
    });

    tweetTextarea.addEventListener('input', updateCharCount);
    tweetBtn.addEventListener('click', handleTweet);

    // Initial Theme Check from Storage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }

    // Initial Fetch
    fetchReleases();
});
