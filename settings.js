// Function to save a given setting
function saveSetting(settingKey, settingValue) {
    let setting = {};
    setting[settingKey] = settingValue;
    browser.storage.local.set(setting).then(() => {
        showSaveConfirmation();
    });
}

// Function to show save confirmation
function showSaveConfirmation() {
    const confirmation = document.getElementById('saveConfirmation');
    confirmation.style.display = 'block';
    
    // Hide the confirmation message after 3 seconds
    setTimeout(function() {
        confirmation.style.display = 'none';
    }, 3000);
}

// When the settings page loads, get the current settings and update the UI
document.addEventListener('DOMContentLoaded', function() {
    browser.storage.local.get(['openInNewWindow', 'cyberChefLocation'], function(data) {
        document.getElementById('openInNewWindow').checked = data.openInNewWindow || false;
        const cyberChefLocation = data.cyberChefLocation || 'https://gchq.github.io/CyberChef/';
        const cyberChefLocationSelect = document.getElementById('cyberChefLocationSelect');
        const cyberChefLocationInput = document.getElementById('cyberChefLocation');

        cyberChefLocationSelect.value = cyberChefLocation.startsWith('https://gchq.github.io/CyberChef/') ? 'https://gchq.github.io/CyberChef/' : 'custom';
        
        if (cyberChefLocationSelect.value === 'custom') {
            cyberChefLocationInput.style.display = 'block';
            cyberChefLocationInput.value = cyberChefLocation;
        }
    });
    // Load custom URLs setting and format them as 'Title:URL' on separate lines
    browser.storage.local.get('customUrls', function(data) {
        if (data.customUrls) {
            // Parse the JSON string back into an array of objects
            const customUrlObjects = JSON.parse(data.customUrls);
            // Map each object to a string 'Title:URL'
            const customUrlStrings = customUrlObjects.map(obj => `${obj.title}:${obj.url}`);
            // Join all strings into one, separated by newlines
            const customUrlsText = customUrlStrings.join('\n');
            // Set the textarea value to the formatted text
            document.getElementById('customUrls').value = customUrlsText;
        }
    });
});

document.getElementById('saveCustomUrls').addEventListener('click', function() {
    const customUrlsInput = document.getElementById('customUrls').value.trim();
    if (!customUrlsInput) {
        // Handle the case where no custom URLs are provided
        saveSetting('customUrls', JSON.stringify([]));
        return;
    }
    const lines = customUrlsInput.split('\n').filter(line => line);

    const customUrls = lines.map(line => {
        // Find the index of the first colon which should be at the end of the title
        const colonIndex = line.indexOf(':');
        const title = line.substring(0, colonIndex).trim();
        const url = line.substring(colonIndex + 1).trim(); // Get the rest of the string as URL
        return { title, url };
    });
    console.log(customUrls);
    saveSetting('customUrls', JSON.stringify(customUrls));
});

// Event listener for the cyberChefLocationSelect dropdown change
document.getElementById('cyberChefLocationSelect').addEventListener('change', function() {
    const cyberChefLocationInput = document.getElementById('cyberChefLocation');
    if (this.value === 'custom') {
        cyberChefLocationInput.style.display = 'block';
    } else {
        cyberChefLocationInput.style.display = 'none';
    }
});

// Save all settings when the "Save Settings" button is clicked
document.getElementById('saveSettings').addEventListener('click', function() {
    // Save the 'openInNewWindow' setting
    const openInNewWindow = document.getElementById('openInNewWindow').checked;
    saveSetting('openInNewWindow', openInNewWindow);

    // Determine the appropriate value to save based on the dropdown selection
    const cyberChefLocationSelect = document.getElementById('cyberChefLocationSelect');
    let cyberChefLocation = cyberChefLocationSelect.value;
    if (cyberChefLocation === 'custom') {
        cyberChefLocation = document.getElementById('cyberChefLocation').value.trim();
    }
    saveSetting('cyberChefLocation', cyberChefLocation);
});
