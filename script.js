document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const tableBody = document.getElementById("fxgTable").querySelector("tbody");
    const checkAllBtn = document.getElementById("checkAllBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const addNewRowBtn = document.getElementById("addNewRowBtn");
    const resetTableBtn = document.getElementById("resetTableBtn");
    const exportCsvBtn = document.getElementById("exportCsvBtn");
    const undoBtn = document.getElementById("undoBtn");
    const processDataBtn = document.getElementById("processDataBtn");
    const goLiveDateInput = document.getElementById("goLiveDateInput");
    const searchInput = document.getElementById("searchInput");
    const pasteArea = document.getElementById("pasteArea");
    const tableHeader = document.getElementById("fxgTable").tHead;
    
    // --- State Management ---
    let undoStack = [];

    const saveState = () => {
        const currentState = {
            tableHTML: tableBody.innerHTML,
            goLiveDate: goLiveDateInput.value
        };
        undoStack.push(JSON.stringify(currentState));
        localStorage.setItem("checklistState", JSON.stringify(currentState));
    };

    const loadState = (state) => {
        tableBody.innerHTML = state.tableHTML;
        goLiveDateInput.value = state.goLiveDate;
    };

    const undo = () => {
        if (undoStack.length > 1) {
            undoStack.pop(); // Remove current state
            const prevState = JSON.parse(undoStack[undoStack.length - 1]);
            loadState(prevState);
            localStorage.setItem("checklistState", JSON.stringify(prevState));
        } else {
            alert("No more actions to undo.");
        }
    };

    // --- Core Functions ---
    const addNewRow = (alpha = "", id = "", checkboxes = []) => {
        const row = document.createElement("tr");
        const appHeaders = Array.from(tableHeader.querySelectorAll(".app-link")).map(a => a.textContent);
        
        let checkboxHTML = '';
        for (let i = 0; i < appHeaders.length; i++) {
            checkboxHTML += `<td class="checkbox-cell"><input type="checkbox" ${checkboxes[i] ? "checked" : ""}></td>`;
        }

        row.innerHTML = `
            <td class="fxg-alpha">
                <input type="text" value="${alpha.toUpperCase()}" maxlength="4" placeholder="ABCD">
                <div class="missing-summary"></div>
            </td>
            <td class="fxg-id">
                <input type="text" value="${id}" maxlength="4" placeholder="1234">
            </td>
            ${checkboxHTML}
        `;
        tableBody.appendChild(row);
        updateRowMissingSummary(row);
    };

    const updateRowMissingSummary = (row) => {
        const missingDiv = row.querySelector(".missing-summary");
        if (!missingDiv) return;

        const appHeaders = Array.from(tableHeader.querySelectorAll(".app-link")).map(a => a.textContent.trim());
        const checkboxes = row.querySelectorAll('input[type="checkbox"]');
        
        let missingApps = [];
        checkboxes.forEach((cb, index) => {
            if (!cb.checked) {
                missingApps.push(appHeaders[index]);
            }
        });

        if (missingApps.length > 0) {
            missingDiv.textContent = `Missing: ${missingApps.join(", ")}`;
            row.classList.add("highlight-row");
        } else {
            missingDiv.textContent = "";
            row.classList.remove("highlight-row");
        }
    };

    const processPastedData = () => {
        const data = pasteArea.value.trim();
        if (!data) return alert("Please paste data first.");

        const lines = data.split("\n");
        const existingData = new Set(
            Array.from(tableBody.querySelectorAll('.fxg-alpha input')).map(input => input.value.toUpperCase())
        );

        let addedCount = 0;
        lines.forEach(line => {
            const parts = line.split(/\s+/); // Split by any whitespace
            const alpha = parts[0]?.trim().toUpperCase().substring(0, 4) || "";
            const id = parts[1]?.trim().substring(0, 4) || "";

            if (/^[A-Z]{4}$/.test(alpha) && /^\d{4}$/.test(id) && !existingData.has(alpha)) {
                addNewRow(alpha, id);
                existingData.add(alpha); // Prevent duplicates from the same paste
                addedCount++;
            }
        });

        if (addedCount > 0) {
            pasteArea.value = "";
            saveState();
        } else {
            alert("No new, valid data found. Data should be in 'ABCD 1234' format, and duplicates are ignored.");
        }
    };

    const exportToCSV = () => {
        let csv = [];
        const headers = Array.from(tableHeader.rows[0].cells).map(cell => `"${cell.textContent.trim()}"`).join(',');
        csv.push(headers);

        tableBody.querySelectorAll("tr").forEach(row => {
            let rowData = [];
            rowData.push(`"${row.querySelector('.fxg-alpha input').value}"`);
            rowData.push(`"${row.querySelector('.fxg-id input').value}"`);
            row.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                rowData.push(cb.checked ? "Yes" : "No");
            });
            csv.push(rowData.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "N2.0_Rollout_Checklist.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortTable = (columnIndex) => {
        const rows = Array.from(tableBody.querySelectorAll("tr"));
        const isAsc = tableHeader.querySelector(`[data-column="${columnIndex}"]`).classList.toggle('asc');
        
        rows.sort((a, b) => {
            const valA = a.cells[columnIndex].querySelector('input')?.value.toLowerCase() || '';
            const valB = b.cells[columnIndex].querySelector('input')?.value.toLowerCase() || '';
            if (valA < valB) return isAsc ? -1 : 1;
            if (valA > valB) return isAsc ? 1 : -1;
            return 0;
        });

        rows.forEach(row => tableBody.appendChild(row));
        saveState();
    };

    const searchTable = () => {
        const filter = searchInput.value.toUpperCase();
        tableBody.querySelectorAll("tr").forEach(row => {
            const alpha = row.querySelector('.fxg-alpha input').value.toUpperCase();
            const id = row.querySelector('.fxg-id input').value.toUpperCase();
            row.style.display = (alpha.includes(filter) || id.includes(filter)) ? "" : "none";
        });
    };

    // --- Event Listeners ---
    checkAllBtn.addEventListener("click", () => {
        tableBody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        tableBody.querySelectorAll("tr").forEach(updateRowMissingSummary);
        saveState();
    });

    clearAllBtn.addEventListener("click", () => {
        tableBody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        tableBody.querySelectorAll("tr").forEach(updateRowMissingSummary);
        saveState();
    });
    
    resetTableBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to reset the entire table?")) {
            tableBody.innerHTML = "";
            goLiveDateInput.value = "";
            pasteArea.value = "";
            saveState();
        }
    });

    tableBody.addEventListener("change", (e) => {
        if (e.target.matches('input')) {
            const row = e.target.closest('tr');
            if (row) updateRowMissingSummary(row);
            saveState();
        }
    });

    tableHeader.addEventListener("click", (e) => {
        const headerCell = e.target.closest('th');
        if(headerCell && headerCell.dataset.column) {
            sortTable(parseInt(headerCell.dataset.column, 10));
        }
    });

    addNewRowBtn.addEventListener("click", () => {addNewRow(); saveState();});
    processDataBtn.addEventListener("click", processPastedData);
    exportCsvBtn.addEventListener("click", exportToCSV);
    undoBtn.addEventListener("click", undo);
    searchInput.addEventListener("keyup", searchTable);
    goLiveDateInput.addEventListener("change", saveState);

    // --- Initial Load ---
    const savedState = localStorage.getItem("checklistState");
    if (savedState) {
        const state = JSON.parse(savedState);
        loadState(state);
        undoStack.push(JSON.stringify(state)); // Prime the undo stack
    } else {
        // Start with one empty row if no data is saved
        addNewRow();
        saveState();
    }
});
