// Defang function
function defangIndicator(indicator) {
    indicator = indicator.replace(/hxxp(s)?/gi, 'http$1');   // Convert hxxp(s) to http(s)
    indicator = indicator.replace(/\[\.\]|\{\.\}|\(\.\)/g, '.'); // Convert [.] or {.} or (.) to .
    indicator = indicator.replace(/\[:\]|\{:\}|\(:\)/g, ':');   // Convert [:] or {:} or (:) to :
    return indicator;
}

function determineType(ioc) {
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ioc)) {
        return "IP";
    } else if (/\.[a-zA-Z0-9]/.test(ioc)) {
        return "Domain";
    } else if (ioc.length === 32 || ioc.length === 64) {
        return "Hash";
    }
    return "Unknown";
}

// Initialize customUrls array to hold the custom URLs from storage
let customUrls = [];

// Load custom URLs from browser storage and update the context menu
function loadCustomUrls() {
    browser.storage.local.get('customUrls', function(data) {
        if (data.customUrls) {
            // Assuming the data is stored as a JSON string
            customUrls = JSON.parse(data.customUrls);
        } else {
            // Default to an empty array if no custom URLs are present
            customUrls = [];
        }
        updateCustomUrlsMenu();
    });
}

// Listen for changes to the customUrls storage
browser.storage.onChanged.addListener(function(changes, area) {
    if (area === 'local' && changes.customUrls) {
        // Parse the new custom URLs and update the context menu
        customUrls = JSON.parse(changes.customUrls.newValue || '[]');
        updateCustomUrlsMenu();
    }
});

// This function is called when the custom URLs are updated.
function updateCustomUrlsMenu() {
    browser.contextMenus.removeAll().then(() => {
        createStaticMenuItems(); // Re-add your static context menu items here

        // Add the updated custom URLs to the context menu
        customUrls.forEach((entry, index) => {
            browser.contextMenus.create({
                id: 'customUrl-' + index,
                title: entry.title, // Use the user-defined title
                contexts: ["selection"],
            });
        });
    });
}

// Call this function when your background script loads
loadCustomUrls();

async function addLog(ioc, url, service) {
    const now = new Date();
    // Adjust the timestamp to match the local timezone offset
    const localTimestamp = now.getTime() - (now.getTimezoneOffset() * 60000);

    // Create a unique identifier for the log entry
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    const log = {
		id: uniqueId,
        timestamp: localTimestamp,
        ioc: ioc,
		type: determineType(ioc),  // Use the determineType function
        url: url,
        service: service  // Add the service parameter to the log object
    };

    // Fetch current logs
    const data = await browser.storage.local.get('logs');
    const logs = data.logs || [];
    logs.push(log);

    // Store the updated logs
    await browser.storage.local.set({ logs: logs });
}

// Function to create your static context menu items
function createStaticMenuItems() {
	browser.contextMenus.create({
		id: "check-ip",
		title: "Check IP on AbuseIPDB",
		contexts: ["selection"],
		icons: {
			"16": "icons/abuseipdb.png"
		}
	});

	browser.contextMenus.create({
		id: "check-ioc",
		title: "Check any IOC on VirusTotal",
		contexts: ["selection"],
		icons: {
			"16": "icons/virustotal.png"
		}
	});

	browser.contextMenus.create({
		id: "check-threatfox",
		title: "Check IP/Domain on ThreatFox",
		contexts: ["selection"],
		icons: {
			"16": "icons/abusech.png"
		}
	});

	browser.contextMenus.create({
		id: "check-urlhaus",
		title: "Check IP/Domain/hash on URLhaus",
		contexts: ["selection"],
		icons: {
			"16": "icons/abusech.png"
		}
	});

	browser.contextMenus.create({
		id: "check-malwarebazaar",
		title: "Check Hash (md5/sha256) on MalwareBazaar",
		contexts: ["selection"],
		icons: {
			"16": "icons/abusech.png"
		}
	});

	browser.contextMenus.create({
		id: "mass-check",
		title: "Mass Check Selected IOC (IP/Domain/hash)",
		contexts: ["selection"],
		icons: {
			"16": "icons/nuke.png"
		}
	});

	browser.contextMenus.create({
		id: "cyberchef",
		title: "CyberChef",
		contexts: ["selection"],
		icons: {
			"16": "icons/cyberchef.png"
		}
	});

	browser.contextMenus.create({
		id: "cyberchef-base64-decode",
		parentId: "cyberchef",
		title: "Decode Base64",
		contexts: ["selection"]
	});

	browser.contextMenus.create({
		id: "cyberchef-extract-ip",
		parentId: "cyberchef",
		title: "Extract IP addresses from input",
		contexts: ["selection"]
	});
}

// Handle menu item click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
	const selectedText = info.selectionText.trim();
	const defangedText = defangIndicator(selectedText);  // Use defangIndicator function

	if (info.menuItemId === "cyberchef-base64-decode") {
		// Fetch the CyberChef location from storage
		const data = await browser.storage.local.get('cyberChefLocation');
		const cyberChefLocation = data.cyberChefLocation || "https://gchq.github.io/CyberChef/";
		
		// Base64 encode the already base64 'selectedText'
		const base64EncodedInput = btoa(selectedText);
		
		// URL encode the doubly base64 encoded input
		const base64Input = encodeForUrl(base64EncodedInput); 
		
		const cyberChefUrl = `${cyberChefLocation}#recipe=From_Base64('A-Za-z0-9%2B/%3D',true,false)Remove_null_bytes()&input=${base64Input}`;

		// Open the CyberChef URL in a new tab
		browser.tabs.create({ url: cyberChefUrl });
	}
	
	if (info.menuItemId === "cyberchef-extract-ip") {
		// Fetch the CyberChef location from storage
		const data = await browser.storage.local.get('cyberChefLocation');
		const cyberChefLocation = data.cyberChefLocation || "https://gchq.github.io/CyberChef/";
		
		// By default JavaScript built-in functions btoa and atob do not support Unicode strings https://base64.guru/developers/javascript/examples/unicode-strings
		function utoa(data) {
		return btoa(unescape(encodeURIComponent(data)));
		}
		
		// Base64 encode the already base64 'selectedText'
		const ip_base64EncodedInput = utoa(selectedText);
		
		// URL encode the doubly base64 encoded input
		const ip_base64Input = encodeForUrl(ip_base64EncodedInput); 
		
		const cyberChefUrl = `${cyberChefLocation}#recipe=Find_/_Replace(%7B'option':'Regex','string':'%5C%5C%5B%7C%5C%5C(%7C%7B'%7D,'',true,false,true,false)Find_/_Replace(%7B'option':'Regex','string':'%5C%5C%5D%7C%5C%5C)%7C%5C%5C%7D'%7D,'',true,false,true,false)Extract_IP_addresses(true,false,false,true,true,true)Defang_IP_Addresses(/disabled)&input=${ip_base64Input}`;
		
		// Open the CyberChef URL in a new tab
		browser.tabs.create({ url: cyberChefUrl });
	}

	// Handling custom URLs
	if (info.menuItemId.startsWith('customUrl-')) {
		const index = parseInt(info.menuItemId.replace('customUrl-', ''), 10);
		// Access the URL property of the custom URL object at the given index
		const customUrlObject = customUrls[index];
		const customUrlTemplate = customUrlObject.url; // Now using the url property of the object

		// Apply the defangIndicator function on the selected text
		const defangedText = defangIndicator(selectedText);

		// Replace the placeholder in the URL template with the defanged and encoded selected text
		// This assumes the placeholder you instruct users to use in their URLs is "%s"
		const finalUrl = customUrlTemplate.replace("%s", encodeURIComponent(defangedText));

		// Open the final URL in a new tab
		browser.tabs.create({ url: finalUrl });
	}


	function encodeForUrl(input) {
		return encodeURIComponent(input).replace(/[!'()*]/g, function(c) {
			// Also encode !'()* characters
			return '%' + c.charCodeAt(0).toString(16);
		});
	}

	switch (info.menuItemId) {
		case "check-ip":
		const abuseIpdbUrl = `https://www.abuseipdb.com/check/${defangedText}`;
		browser.tabs.create({ url: abuseIpdbUrl, active: false });
		await addLog(defangedText, abuseIpdbUrl, "AbuseIPDB");  // Add this line to log the query
		break;

		case "check-ioc":
		let virusTotalUrl;
		if (/\.[a-zA-Z0-9]/.test(defangedText)) {  // Likely a domain
			const encodedDomainForVT = encodeURIComponent(encodeURIComponent(defangedText));
			virusTotalUrl = `https://www.virustotal.com/gui/search/${encodedDomainForVT}`;
		} else {
			virusTotalUrl = `https://www.virustotal.com/gui/search/${defangedText}`;
		}
		browser.tabs.create({ url: virusTotalUrl, active: false });
		await addLog(defangedText, virusTotalUrl, "VirusTotal");
		break;

		case "check-threatfox":
		const threatFoxUrl = `https://threatfox.abuse.ch/browse.php?search=ioc%3A${defangedText}`;
		browser.tabs.create({ url: threatFoxUrl, active: false });
		await addLog(defangedText, threatFoxUrl, "ThreatFox");
		break;

		case "check-urlhaus":
		const urlhausUrl = `https://urlhaus.abuse.ch/browse.php?search=${defangedText}`;
		browser.tabs.create({ url: urlhausUrl, active: false });
		await addLog(defangedText, urlhausUrl, "URLhaus");
		break;

		case "check-malwarebazaar":
		let malwareBazaarUrl;
		if (defangedText.length === 32) {
			malwareBazaarUrl = `https://bazaar.abuse.ch/browse.php?search=md5%3A${defangedText}`;
		} else if (defangedText.length === 64) {
			malwareBazaarUrl = `https://bazaar.abuse.ch/browse.php?search=sha256%3A${defangedText}`;
		} else {
			alert("Selected hash is neither MD5 nor SHA256");
			return; // Exit the listener since it's not a recognized hash
		}
		browser.tabs.create({ url: malwareBazaarUrl, active: false });
		await addLog(defangedText, malwareBazaarUrl, "MalwareBazaar");
		break;

		case "mass-check":
		let services = [];  // Define services array outside the conditional blocks

		if (/^(\d{1,3}\.){3}\d{1,3}$/.test(defangedText)) {  // IP address pattern
			services = [
			`https://www.abuseipdb.com/check/${defangedText}`,
			`https://www.virustotal.com/gui/search/${defangedText}`,
			`https://threatfox.abuse.ch/browse.php?search=ioc%3A${defangedText}`,
			`https://urlhaus.abuse.ch/browse.php?search=${defangedText}`
			];
		} else if (/\.[a-zA-Z0-9]/.test(defangedText)) {  // Likely a domain
			const encodedDomainForVT = encodeURIComponent(encodeURIComponent(defangedText));
			services = [
			`https://www.virustotal.com/gui/search/${encodedDomainForVT}`,
			`https://threatfox.abuse.ch/browse.php?search=ioc%3A${defangedText}`,
			`https://urlhaus.abuse.ch/browse.php?search=${defangedText}`
			];
		} else {  // Potentially a hash
			let hashServiceURL;
			if (defangedText.length === 32) {
			hashServiceURL = `https://bazaar.abuse.ch/browse.php?search=md5%3A${defangedText}`;
			} else if (defangedText.length === 64) {
			hashServiceURL = `https://bazaar.abuse.ch/browse.php?search=sha256%3A${defangedText}`;
			}
			else {
				alert("Selected hash is neither MD5 nor SHA256");
				return; // Exit the listener since it's not a recognized hash
			}

			services = [
				`https://www.virustotal.com/gui/search/${defangedText}`,
				`https://threatfox.abuse.ch/browse.php?search=ioc%3A${defangedText}`,
				`https://urlhaus.abuse.ch/browse.php?search=${defangedText}`,
				hashServiceURL
			];
		}

		browser.storage.local.get('openInNewWindow', function(data) {
			if (data.openInNewWindow) {
				// Open the first service in a new window and capture its window ID
				browser.windows.create({ url: services[0] }).then((windowInfo) => {
					const windowId = windowInfo.id;
					// Open other services in the same new window
					for (let i = 1; i < services.length; i++) {
						browser.tabs.create({ url: services[i], windowId: windowId, active: false })
							.catch(error => console.error("Error creating new tab:", error));  // Log errors from creating tabs
					}
				}).catch(error => console.error("Error creating new window:", error));
			} else {
				services.forEach(url => {
					browser.tabs.create({ url, active: false });
				});
			}
		});

		// When logging each service in a loop:
		for (let url of services) {
			let serviceName = ""; // You'll need to determine the service name based on the URL or logic used when adding URLs to the services array
			// Some logic to set the serviceName based on the url
			if (url.includes("abuseipdb.com")) {
				serviceName = "AbuseIPDB";
			} else if (url.includes("virustotal.com")) {
				serviceName = "VirusTotal";
			} else if (url.includes("threatfox.abuse.ch")) {
				serviceName = "ThreatFox";
			} else if (url.includes("urlhaus.abuse.ch")) {
				serviceName = "URLhaus";
			} else if (url.includes("bazaar.abuse.ch")) {
				serviceName = "MalwareBazaar";
			}
			await addLog(defangedText, url, serviceName);
		}
		break;
	}
});

// Call loadCustomUrls to initialize the custom URLs in the context menu
loadCustomUrls();

