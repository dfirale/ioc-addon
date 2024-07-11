document.addEventListener("DOMContentLoaded", function () {
	let logs = []; // Declare logs in the outer scope
    let comments = {}; // Declare comments in the outer scope as well
	
    // Get logs from local storage and display them
    browser.storage.local.get(['logs', 'comments'], function (data) {
        logs = data.logs || [];
        logs.sort((a, b) => b.timestamp - a.timestamp); // sort logs by newest first
        comments = data.comments || {}; // Initialize as an object
        const logTable = document.getElementById("logTable");

		// Insert a checkbox in the header for select all
		const selectAllCheckbox = document.getElementById('selectAllRows');
		selectAllCheckbox.addEventListener('change', function (event) {
			// Stop propagation to prevent the event from bubbling up
			event.stopPropagation();
			// Corrected query selector - make sure this matches your actual HTML structure.
			document.querySelectorAll('#logTable tr').forEach(row => { // If no <tbody>, just use '#logTable tr'
				if (row.style.display !== 'none') { // Only check visible rows
					const checkbox = row.querySelector('input[type="checkbox"]');
					if (checkbox) {
						checkbox.checked = this.checked;
					}
				}
			});
		});

		// Add checkboxes to each row dynamically
		function addCheckboxToRow(row) {
			const checkboxCell = row.insertCell(0);
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkboxCell.appendChild(checkbox);
		}

        logs.forEach(log => {
            const row = logTable.insertRow();
			row.dataset.logId = log.id; // Store the unique ID on the row for later retrieval
            addCheckboxToRow(row); // Add checkbox to the row
            row.insertCell().textContent = new Date(log.timestamp).toISOString().replace('Z', '').replace('T', ' ');
            row.insertCell().textContent = log.ioc;
            const typeCell = row.insertCell();
            typeCell.textContent = log.type;
            row.insertCell().textContent = log.service;

            const linkCell = row.insertCell();
            const link = document.createElement('a');
            link.href = log.url;
            link.textContent = "View Query";
            link.rel = "noopener noreferrer";
            link.addEventListener('click', function(event) {
                event.preventDefault();
                browser.tabs.create({ url: this.href, active: false });
            });
            linkCell.appendChild(link);

			const commentCell = row.insertCell();
			const commentTextarea = document.createElement('textarea');
			commentTextarea.style.resize = 'none'; // Disables manual resizing
			commentTextarea.style.overflowY = 'hidden'; // Prevents vertical scrollbar
			commentTextarea.rows = '1'; // Starts as a single row
			commentTextarea.style.minHeight = '25px'; // Sets a default minimum height
			commentTextarea.style.width = '95%'; // Sets the width to 95% of the column's width
			commentTextarea.value = comments[log.id] || ''; // Use log.id as a key for comments

			// Function to auto-resize the textarea
			function autoResize(textarea) {
				textarea.style.height = 'auto'; // Reset the height
				textarea.style.height = (textarea.scrollHeight) + 'px';
			}

			// Call autoResize for every textarea
			autoResize(commentTextarea);

			commentTextarea.addEventListener('input', function() {
				autoResize(this); // Adjusts size on content change
				comments[log.id] = this.value; // Store the new comment using log.id
				browser.storage.local.set({ comments }); // Save the updated comments
			});

			commentCell.appendChild(commentTextarea);
		});
        makeSortable(document.getElementById('logsTable'));
    });

	// Export to CSV function
	function exportToCSV(rows) {
		if (rows.length === 0) {
			alert('Please select at least one row to export.');
			return;
		}

		let csvContent = "data:text/csv;charset=utf-8,";

		// Header row
		csvContent += Array.from(document.querySelectorAll('#logsTable th'))
		  .map(th => th.textContent.trim()) // Trim each header text
		  .filter(text => text.length > 0)  // Filter out empty headers
		  .join(',') + "\r\n";

		// Data rows
		rows.forEach(row => {
		  const rowData = Array.from(row.querySelectorAll('td'))
			.slice(1) // Exclude the first cell which contains the checkbox
			.map(td => {
			  // Check if the cell contains a link with "View Query" text
			  if (td.querySelector('a') && td.textContent.includes("View Query")) {
				return `"${td.querySelector('a').href}"`; // Use the href attribute
			  } else if (td.querySelector('textarea')) { // Check if the cell contains a textarea
				return `"${td.querySelector('textarea').value.replace(/"/g, '""')}"`; // Use textarea's value and handle quotes
			  } else {
				return `"${td.textContent.replace(/"/g, '""')}"`; // Handle quotes
			  }
			})
			.join(',');
		  csvContent += rowData + "\r\n";
		});

		// Create a link and download the CSV
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "query_logs.csv");
		document.body.appendChild(link); // Required for Firefox
		link.click(); // Trigger the download
		document.body.removeChild(link); // Clean up
	}

    // Checkbox to toggle all row selections
    const exportCsvButton = document.getElementById('exportCsv');
	exportCsvButton.addEventListener('click', function () {
		// Only select rows that are visible (display is not 'none')
		const rows = document.querySelectorAll('#logTable tr');
		const selectedRows = Array.from(rows).filter(row => row.style.display !== 'none' && row.querySelector('input[type="checkbox"]').checked);
		exportToCSV(selectedRows);
	});
	
	const deleteSelectedButton = document.getElementById('deleteSelected');
	deleteSelectedButton.addEventListener('click', function () {
		// Show confirmation dialog before deleting
		if (confirm('Are you sure you want to delete the selected rows?')) {
			deleteSelectedRows();
		}
	});

	function deleteSelectedRows() {
		const selectedCheckboxes = document.querySelectorAll('#logTable input[type="checkbox"]:checked');

		// If no checkboxes are selected, alert the user and do not proceed
		if (selectedCheckboxes.length === 0) {
			alert("Please select at least one row to delete.");
			return;
		}

		// Gather all the ids of the selected rows to delete.
		const idsToDelete = Array.from(selectedCheckboxes).map(checkbox => {
			const row = checkbox.closest('tr');
			return row.dataset.logId; // Using data-log-id attribute from the row.
		});

		// Filter out the logs with the ids that are selected for deletion.
		logs = logs.filter(log => !idsToDelete.includes(log.id));

		// Also, delete associated comments using the ids collected.
		idsToDelete.forEach(idToDelete => {
			delete comments[idToDelete];
		});

		// Update the local storage with the new logs array and the updated comments.
		browser.storage.local.set({ logs, comments }, function() {
			console.log('Logs and comments updated after deletion.');
		});

		// Remove the selected rows from the view.
		selectedCheckboxes.forEach(checkbox => {
			checkbox.closest('tr').remove();
		});
	}

    function makeSortable(table) {
        const headers = table.querySelectorAll('th');
        let currentSortColumn = null;
        let sortDirection = 'ascending';

        function sortTableByColumn(table, column, asc = true) {
            const dirModifier = asc ? 1 : -1;
            const tBody = table.tBodies[0];
            const rows = Array.from(tBody.querySelectorAll("tr"));

            // Sort each row
            const sortedRows = rows.sort((a, b) => {
                const aColText = column === 6 // if it's the comment column
                    ? a.querySelector('td textarea').value.trim() // Use textarea value for sorting
                    : a.querySelector(`td:nth-child(${ column + 1 })`).textContent.trim();

                const bColText = column === 6 // if it's the comment column
                    ? b.querySelector('td textarea').value.trim() // Use textarea value for sorting
                    : b.querySelector(`td:nth-child(${ column + 1 })`).textContent.trim();

                return aColText > bColText ? (1 * dirModifier) : (-1 * dirModifier);
            });

            // Remove all existing TRs from the table
            while (tBody.firstChild) {
                tBody.removeChild(tBody.firstChild);
            }

            // Re-add the newly sorted rows
            tBody.append(...sortedRows);

            // Remember how the column is currently sorted
            table.querySelectorAll('th').forEach(th => th.classList.remove('ascending', 'descending'));
            table.querySelector(`th:nth-child(${ column + 1 })`).classList.toggle('ascending', asc);
            table.querySelector(`th:nth-child(${ column + 1 })`).classList.toggle('descending', !asc);
        }

        headers.forEach((header, index) => {
            header.addEventListener('click', () => {
                const isAscending = header.classList.contains('ascending');
                sortTableByColumn(table, index, !isAscending);
                if(currentSortColumn !== index) {
                    currentSortColumn = index;
                    sortDirection = 'ascending';
                } else {
                    sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
                }
            });
        });
    }
	
	function filterTable(event) {
		const filter = event.target.value.toUpperCase();
		const rows = document.querySelector("#logTable").rows;
		
		let colIndex;
		switch (event.target.id) {
			case "searchIoc":
				colIndex = 2; // Assuming "IOC" is the 3rd column
				break;
			case "searchType":
				colIndex = 3; // Assuming "Type" is the 4th column
				break;
			case "searchService":
				colIndex = 4; // Assuming "Service" is the 5th column
				break;
			case "searchComments":
				colIndex = 6; // Assuming "Comments" is the 7th column (0-based index is 6)
				break;
			default:
				colIndex = 0; // Just in case there's an ID that doesn't match
		}
		
		for (let i = 0; i < rows.length; i++) { // Start from 0 if the first row is headers
			let col;
			if (colIndex === 6) {
				// For the "Comments" column, which contains a textarea
				col = rows[i].cells[colIndex].querySelector('textarea');
			} else {
				// For all other columns
				col = rows[i].cells[colIndex];
			}
			
			if (col) {
				let txtValue = colIndex === 6 ? col.value.toUpperCase() : col.textContent.toUpperCase();
				rows[i].style.display = txtValue.indexOf(filter) > -1 ? "" : "none";
			}
		}
	}

	document.getElementById('searchIoc').addEventListener('keyup', filterTable, false);
	document.getElementById('searchType').addEventListener('keyup', filterTable, false);
	document.getElementById('searchService').addEventListener('keyup', filterTable, false);
	document.getElementById('searchComments').addEventListener('keyup', filterTable, false);
	
	// "Refresh Page" Button
	var refreshButton = document.getElementById('refreshPage');
	if (refreshButton) {
		refreshButton.addEventListener('click', function() {
			window.location.reload(true); // Force reload from the server
		});
	}

});
