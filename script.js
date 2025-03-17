// DOM Elements
const basePriceElem = document.getElementById('base-price');
const biddingStatusElem = document.getElementById('bidding-status');
const priceLabelElem = document.getElementById('price-label');
const itemSelect = document.getElementById('item-select');
const manualPriceInput = document.getElementById('manual-price');
const justBidBtn = document.getElementById('just-bid-btn'); // New "Just Bid" button
const sendEmailBtn = document.getElementById('send-email-btn');

// Data Variables
let basePrices = {};
let teamImages = {};
let teamBudgets = {};
let teamLogos = {};
let teamPlayersSold = {}; // New object to track players sold per team
let auctionPrice = 0;
let currentBidder = '';
let biddingStarted = false;
let isFirstBid = true;
let soldItems = [];
let bidHistory = [];
let priceHistory = [];

// Initial image update on page load
updateImage();

// Function to read CSV data
function readCSV(file, callback) {
    Papa.parse(file, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function (results) {
            callback(results.data);
        },
    });
}

// Function to write CSV data
function writeCSV(file, data) {
    const csv = Papa.unparse(data, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file;
    link.click();
}

// Load items, base prices, image URLs, and ratings from CSV
readCSV('items.csv', function (data) {
    data.forEach((row) => {
        basePrices[row.Item] = {
            BasePrice: row.BasePrice,
            ImageURL: row.ImageURL,
            Sold: row.Sold === 'true', // Convert string to boolean
            Ratings: row.Ratings, // Add ratings to the basePrices object
            Category: row.Category, // Add category to the basePrices object
        };
        teamImages[row.Item] = row.ImageURL;
    });
    populateItemDropdown();
});

// Load teams from CSV
readCSV('teams.csv', function (data) {
    data.forEach((row) => {
        teamBudgets[row.Team] = row.Budget;
        teamLogos[row.Team] = row.LogoURL;
        teamPlayersSold[row.Team] = 0; // Initialize players sold to 0
    });
    populateTeamButtons(data);
    populateTeamBudgetsTable();
});

// Load teams from CSV
readCSV('teams.csv', function (data) {
    populateTeamButtons(data);
});

// Function to populate the item dropdown
function populateItemDropdown() {
    itemSelect.innerHTML = '<option value="">Select an item</option>';
    Object.keys(basePrices).forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = `${item} (${basePrices[item].Category})`; // Include category in the dropdown
        itemSelect.appendChild(option);
    });
}

// Function to populate team budgets table
function populateTeamBudgetsTable() {
    const teamBudgetsTable = document.getElementById('team-budgets').getElementsByTagName('tbody')[0];
    teamBudgetsTable.innerHTML = '';
    Object.keys(teamBudgets).forEach((team) => {
        const row = document.createElement('tr');
        const teamCell = document.createElement('td');
        teamCell.textContent = team;
        const budgetCell = document.createElement('td');
        budgetCell.id = `budget-${team}`;
        budgetCell.textContent = `${teamBudgets[team].toFixed(2)} CR`; // Format to 2 decimal places
        const playersSoldCell = document.createElement('td');
        playersSoldCell.id = `players-sold-${team}`;
        playersSoldCell.textContent = `${teamPlayersSold[team]} of 25`; // Use "of" instead of "/"
        row.appendChild(teamCell);
        row.appendChild(budgetCell);
        row.appendChild(playersSoldCell);
        teamBudgetsTable.appendChild(row);
    });
}

// Function to update players sold for a team
function updatePlayersSold(team) {
    teamPlayersSold[team] += 1; // Increment players sold for the team
    const playersSoldCell = document.getElementById(`players-sold-${team}`);
    if (playersSoldCell) {
        playersSoldCell.textContent = `${teamPlayersSold[team]} of 25`; // Use "of" instead of "/"
    }
}

// Function to update the image and player details
function updateImage() {
    const selectedItem = document.getElementById('item-select').value;
    const itemPhoto = document.getElementById('item-photo');
    const teamLogo = document.getElementById('team-logo');
    const playerRating = document.getElementById('player-rating');
    const playerCategory = document.getElementById('player-category-display'); // New element for category

    if (selectedItem) {
        itemPhoto.src = teamImages[selectedItem] || 'logo auction.png';
        playerRating.textContent = `Rating: ${basePrices[selectedItem].Ratings || '-'}`; // Display ratings
        playerCategory.textContent = `Category: ${basePrices[selectedItem].Category || '-'}`; // Display category
    } else {
        itemPhoto.src = 'logo auction.png'; // Set to the initial logo
        playerRating.textContent = 'Rating: -'; // Reset ratings
        playerCategory.textContent = 'Category: -'; // Reset category
    }

    // Hide team logo if no bid is placed
    if (!currentBidder) {
        teamLogo.src = ''; // Clear the team logo
        teamLogo.alt = '';
    }
}

// Function to populate team buttons
function populateTeamButtons(teams) {
    const teamButtonsContainer = document.querySelector('.team-buttons');
    teamButtonsContainer.innerHTML = '';
    teams.forEach((team) => {
        const button = document.createElement('button');
        button.id = `team-${team.Team}`;
        button.textContent = `${team.Team} Bid`;
        button.onclick = () => placeBid(team.Team);
        teamButtonsContainer.appendChild(button);
    });
}

// Function to update sold items list
function updateSoldItemsList() {
    const soldItemsList = document.getElementById('sold-items-list');
    soldItemsList.innerHTML = '';
    soldItems.reverse().forEach((item) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.Item} (${basePrices[item.Item].Category}) - ${item.Buyer} - ${item.Price}`; // Include category
        soldItemsList.appendChild(listItem);
    });

    // Mark unsold items
    Object.keys(basePrices).forEach((item) => {
        if (!basePrices[item].Sold) {
            const listItem = document.createElement('li');
            listItem.textContent = `${item} (${basePrices[item].Category}) - Not Sold Yet!`; // Include category
            listItem.style.color = 'red'; // Highlight unsold items
            soldItemsList.appendChild(listItem);
        }
    });
}

// Function to place a bid
function placeBid(team) {
    if (teamPlayersSold[team] >= 25) {
        alert(`${team} has already bought the maximum number of players (25).`);
        return;
    }

    // Determine the bid increment based on the current auction price
    let increment;
    if (auctionPrice < 4) {
        increment = 0.25; // 25 lakh
    } else if (auctionPrice >= 4 && auctionPrice < 8) {
        increment = 0.4; // 40 lakh
    } else {
        increment = 0.5; // 50 lakh
    }

    // Check if the team has enough budget to place the bid
    if (teamBudgets[team] >= auctionPrice + (isFirstBid ? 0 : increment)) {
        if (isFirstBid) {
            isFirstBid = false;
            biddingStarted = true;
            priceLabelElem.textContent = 'Current Price:';
        } else {
            auctionPrice = parseFloat((auctionPrice + increment).toFixed(2)); // Format to 2 decimal places
            priceHistory.push(auctionPrice);
        }
        basePriceElem.textContent = `${auctionPrice.toFixed(2)} CR`; // Display with 2 decimal places
        currentBidder = team;
        biddingStatusElem.textContent = `Current highest bid by: ${currentBidder}`;
        bidHistory.unshift(`${team} bids ${auctionPrice.toFixed(2)} CR for ${itemSelect.value}`);
        updateBiddingHistory();

        // Update the team logo
        const teamLogo = document.getElementById('team-logo');
        teamLogo.src = teamLogos[team];
        teamLogo.alt = `${team} Logo`;
    } else {
        alert(`${team} does not have enough budget to place a bid.`);
    }
}

// Event listener for "Just Bid" button
justBidBtn.addEventListener('click', function () {
    // Determine the bid increment based on the current auction price
    let increment;
    if (auctionPrice < 4) {
        increment = 0.25; // 25 lakh
    } else if (auctionPrice >= 4 && auctionPrice < 8) {
        increment = 0.4; // 40 lakh
    } else {
        increment = 0.5; // 50 lakh
    }

    if (isFirstBid) {
        isFirstBid = false;
        biddingStarted = true;
        priceLabelElem.textContent = 'Current Price:';
    } else {
        auctionPrice = parseFloat((auctionPrice + increment).toFixed(2)); // Format to 2 decimal places
        priceHistory.push(auctionPrice);
    }
    basePriceElem.textContent = `${auctionPrice.toFixed(2)} CR`; // Display with 2 decimal places
    currentBidder = ''; // No team associated with this bid
    biddingStatusElem.textContent = `Bid increased to ${auctionPrice.toFixed(2)} CR`;
    bidHistory.unshift(`Bid increased to ${auctionPrice.toFixed(2)} CR`);
    updateBiddingHistory();

    // Hide team logo
    const teamLogo = document.getElementById('team-logo');
    teamLogo.src = '';
    teamLogo.alt = '';
});

// Event listener for sell button
document.getElementById('sell-btn').addEventListener('click', function () {
    const selectedItemName = itemSelect.value;

    // Check if an item is selected
    if (!selectedItemName) {
        alert('Please select an item to sell.');
        return;
    }

    // Determine the final price
    let finalPrice;
    if (manualPriceInput.value) {
        finalPrice = parseFloat(manualPriceInput.value);
        if (isNaN(finalPrice) || finalPrice <= 0) {
            alert('Please enter a valid manual price.');
            return;
        }
    } else if (currentBidder) {
        finalPrice = auctionPrice;
    } else {
        alert('Please select a team to bid or enter a manual price.');
        return;
    }

    // Check if the team has enough budget
    if (currentBidder && teamBudgets[currentBidder] < finalPrice) {
        alert(`${currentBidder} does not have enough budget to buy this item.`);
        return;
    }

    // Proceed with selling the item
    if (currentBidder) {
        teamBudgets[currentBidder] -= finalPrice;
        document.getElementById(`budget-${currentBidder}`).textContent = `${teamBudgets[currentBidder].toFixed(2)} CR`; // Format to 2 decimal places
    }

    // Add the sold item to the soldItems array
    soldItems.push({
        Item: selectedItemName,
        Buyer: currentBidder || 'Manual Sale',
        Price: `${finalPrice.toFixed(2)} CR` // Format to 2 decimal places
    });

    // Update players sold for the team
    if (currentBidder) {
        updatePlayersSold(currentBidder);
    }

    // Mark the item as sold
    basePrices[selectedItemName].Sold = true;
    updateSoldItemsList();

    // Reset the UI
    basePriceElem.innerHTML = `<span class="sold-item-name">${selectedItemName}</span>`;
    priceLabelElem.textContent = '';
    auctionPrice = basePrices[selectedItemName].BasePrice;
    priceHistory.push(auctionPrice);
    currentBidder = ''; // Reset currentBidder AFTER the item is sold
    biddingStarted = false;
    isFirstBid = true;
    manualPriceInput.value = '';
});

// Function to update sold items list
function updateSoldItemsList() {
    const soldItemsList = document.getElementById('sold-items-list');
    soldItemsList.innerHTML = '';
    soldItems.reverse().forEach((item) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.Item} (${basePrices[item.Item].Category}) - ${item.Buyer} - ${item.Price}`; // Include category
        soldItemsList.appendChild(listItem);
    });

    // Mark unsold items
    Object.keys(basePrices).forEach((item) => {
        if (!basePrices[item].Sold) {
            const listItem = document.createElement('li');
            listItem.textContent = `${item} (${basePrices[item].Category}) - Not Sold Yet!`; // Include category
            listItem.style.color = 'red'; // Highlight unsold items
            soldItemsList.appendChild(listItem);
        }
    });
}

// Function to update bidding history
function updateBiddingHistory() {
    const biddingStatusHistoryElem = document.getElementById('bidding-status-history');
    biddingStatusHistoryElem.innerHTML = '';
    bidHistory.forEach((bid) => {
        const listItem = document.createElement('li');
        listItem.textContent = bid;
        biddingStatusHistoryElem.appendChild(listItem);
    });
}

// Event listener for item selection
itemSelect.addEventListener('change', function () {
    const selectedItem = this.value;
    if (selectedItem) {
        auctionPrice = basePrices[selectedItem].BasePrice;
        priceHistory = [auctionPrice];
        basePriceElem.textContent = `${auctionPrice} CR`; // Add "CR" to the base price
        priceLabelElem.textContent = 'Base Price:';
        biddingStatusElem.textContent = 'No bids yet.';
        currentBidder = '';
        biddingStarted = false;
        isFirstBid = true;
        manualPriceInput.value = '';
        bidHistory = [];
        updateBiddingHistory();
        updateImage();
    } else {
        // If no item is selected, reset to the initial logo
        updateImage();
    }
});

// // Event listener for sell button
// document.getElementById('sell-btn').addEventListener('click', function () {
//     const selectedItemName = itemSelect.value;

//     // Check if an item is selected
//     if (!selectedItemName) {
//         alert('Please select an item to sell.');
//         return;
//     }

//     // Determine the final price
//     let finalPrice;
//     if (manualPriceInput.value) {
//         finalPrice = parseFloat(manualPriceInput.value);
//         if (isNaN(finalPrice) || finalPrice <= 0) {
//             alert('Please enter a valid manual price.');
//             return;
//         }
//     } else if (currentBidder) {
//         finalPrice = auctionPrice;
//     } else {
//         alert('Please select a team to bid or enter a manual price.');
//         return;
//     }

//     // Check if the team has enough budget (only if a team is bidding)
//     if (currentBidder && teamBudgets[currentBidder] < finalPrice) {
//         alert(`${currentBidder} does not have enough budget to buy this item.`);
//         return;
//     }

//     // Proceed with selling the item
//     if (currentBidder) {
//         teamBudgets[currentBidder] -= finalPrice;
//         document.getElementById(`budget-${currentBidder}`).textContent = `${teamBudgets[currentBidder].toFixed(1)} CR`;
//     }

//     // Add the sold item to the soldItems array
//     soldItems.push({
//         Item: selectedItemName,
//         Buyer: currentBidder || 'Manual Sale',
//         Price: `${finalPrice.toFixed(1)} CR`
//     });

//     // Update players sold for the team
//     if (currentBidder) {
//         updatePlayersSold(currentBidder);
//     }

//     // Mark the item as sold
//     basePrices[selectedItemName].Sold = true;
//     updateSoldItemsList();

//     // Reset the UI
//     basePriceElem.innerHTML = `<span class="sold-item-name">${selectedItemName}</span>`;
//     priceLabelElem.textContent = '';
//     auctionPrice = basePrices[selectedItemName].BasePrice;
//     priceHistory.push(auctionPrice);
//     currentBidder = ''; // Reset currentBidder AFTER the item is sold
//     biddingStarted = false;
//     isFirstBid = true;
//     manualPriceInput.value = '';
// });

document.getElementById('sold-items-header').addEventListener('click', function () {
    // Prepare data for CSV
    const data = soldItems.map((item) => ({
        Item: item.Item,
        Category: basePrices[item.Item].Category, // Include category
        Buyer: item.Buyer,
        Price: item.Price.replace(' CR', ''), // Remove "CR" from the price
    }));

    // Add unsold items to the data
    Object.keys(basePrices).forEach((item) => {
        if (!basePrices[item].Sold) {
            data.push({
                Item: item,
                Category: basePrices[item].Category, // Include category
                Buyer: 'Not Sold',
                Price: '0',
            });
        }
    });

    // Generate and download the CSV file
    writeCSV('sold_items.csv', data);
});

// Event listener for refresh button
document.getElementById('refresh-btn').addEventListener('click', function () {
    const selectedItem = itemSelect.value;
    auctionPrice = basePrices[selectedItem].BasePrice;
    priceHistory.push(auctionPrice);
    biddingStatusElem.textContent = 'No bids yet.';
    priceLabelElem.textContent = 'Base Price:';
    basePriceElem.textContent = `${auctionPrice} CR`; // Add "CR" to the base price
    manualPriceInput.value = '';
    currentBidder = '';
    biddingStarted = false;
    isFirstBid = true;
    bidHistory = [];
    updateBiddingHistory();
    updateImage(); // Reset to the initial logo
});

// Event listener for undo button
document.getElementById('undo-btn').addEventListener('click', function () {
    if (bidHistory.length > 0) {
        bidHistory.shift();
        updateBiddingHistory();
    }
    if (priceHistory.length > 1) {
        priceHistory.pop();
        auctionPrice = priceHistory[priceHistory.length - 1];
        basePriceElem.textContent = `${auctionPrice} CR`; // Add "CR" to the price
    } else if (priceHistory.length === 1) {
        const selectedItem = itemSelect.value;
        auctionPrice = basePrices[selectedItem].BasePrice;
        priceHistory = [auctionPrice];
        basePriceElem.textContent = `${auctionPrice} CR`; // Add "CR" to the base price
    }
    if (bidHistory.length === 0) {
        biddingStatusElem.textContent = 'No bids yet.';
        currentBidder = '';
        isFirstBid = true;
        priceLabelElem.textContent = 'Base Price:';
        updateImage(); // Reset to the initial logo
    } else {
        currentBidder = bidHistory[0].split(' ')[0];
        biddingStatusElem.textContent = `Current highest bid by: ${currentBidder}`;
    }
});

function updateImage() {
    const selectedItem = document.getElementById('item-select').value;
    const itemPhoto = document.getElementById('item-photo');
    const teamLogo = document.getElementById('team-logo');
    const playerRating = document.getElementById('player-rating');

    if (selectedItem) {
        itemPhoto.src = teamImages[selectedItem] || 'logo auction.png';
        playerRating.textContent = `Rating: ${basePrices[selectedItem].Ratings || '-'}`; // Display ratings
    } else {
        itemPhoto.src = 'logo auction.png'; // Set to the initial logo
        playerRating.textContent = 'Rating: -'; // Reset ratings
    }

    // Hide team logo if no bid is placed
    if (!currentBidder) {
        teamLogo.src = ''; // Clear the team logo
        teamLogo.alt = '';
    }
}

// Event listener for Team Budgets header
document.getElementById('team-budgets-header').addEventListener('click', function () {
    // Prepare data for CSV
    const data = Object.keys(teamBudgets).map((team) => ({
        Team: team,
        Budget: `${teamBudgets[team]} CR`, // Include "CR" in the budget
        Players_Sold: `${teamPlayersSold[team]} of 25`, // Use "of" instead of "/"
    }));

    // Generate and download the CSV file
    writeCSV('team_budgets.csv', data);
});

// Event listener for Sold Items header
document.getElementById('sold-items-header').addEventListener('click', function () {
    // Prepare data for CSV
    const data = soldItems.map((item) => ({
        Item: item.Item,
        Category: basePrices[item.Item].Category, // Include category
        Rating: basePrices[item.Item].Ratings, // Include rating
        Buyer: item.Buyer,
        Price: item.Price.replace(' CR', ''), // Remove "CR" from the price
    }));

    // Add unsold items to the data
    Object.keys(basePrices).forEach((item) => {
        if (!basePrices[item].Sold) {
            data.push({
                Item: item,
                Category: basePrices[item].Category, // Include category
                Rating: basePrices[item].Ratings, // Include rating
                Buyer: 'Not Sold',
                Price: '0',
            });
        }
    });

    // Generate and download the CSV file
    writeCSV('sold_items.csv', data);
});

// Initial image update on page load
updateImage();


// Toggle Admin Panel
function toggleAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
}

// Add or Update Team
function addOrUpdateTeam() {
    const teamName = document.getElementById('team-name').value;
    const teamBudget = parseFloat(document.getElementById('team-budget').value);

    if (teamName && !isNaN(teamBudget)) {
        teamBudgets[teamName] = teamBudget;
        updateTeamBudgetsCSV();
        populateTeamBudgetsTable();
        populateTeamButtons([{ Team: teamName }]);
        alert('Team saved successfully!');
    } else {
        alert('Please enter valid team name and budget.');
    }
}

// Add or Update Player
function addOrUpdatePlayer() {
    const playerName = document.getElementById('player-name').value;
    const playerCategory = document.getElementById('player-category').value;
    const playerBasePrice = parseFloat(document.getElementById('player-base-price').value);
    const playerImageURL = document.getElementById('player-image-url').value;

    if (playerName && playerCategory && !isNaN(playerBasePrice) && playerImageURL) {
        basePrices[playerName] = {
            BasePrice: playerBasePrice,
            ImageURL: playerImageURL,
            Category: playerCategory,
            Sold: false,
        };
        updateItemsCSV();
        populateItemDropdown();
        alert('Player saved successfully!');
    } else {
        alert('Please fill all fields correctly.');
    }
}

// Update Teams CSV
function updateTeamBudgetsCSV() {
    const data = Object.keys(teamBudgets).map((team) => ({
        Team: team,
        Budget: teamBudgets[team],
    }));
    writeCSV('team_budgets.csv', data);
}

// Update Items CSV
function updateItemsCSV() {
    const data = Object.keys(basePrices).map((item) => ({
        Item: item,
        Category: basePrices[item].Category,
        BasePrice: basePrices[item].BasePrice,
        ImageURL: basePrices[item].ImageURL,
        Sold: basePrices[item].Sold,
    }));
    writeCSV('items.csv', data);
}

// Write CSV File
function writeCSV(file, data) {
    console.log('Data to write to CSV:', data); // Debugging
    const csv = Papa.unparse(data, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file;
    link.click();
}





// Load data on page load
window.onload = function () {
    loadTeams();
    loadPlayers();
};

// Load Teams
function loadTeams() {
    readCSV('team_budgets.csv', function (data) {
        const teamsTable = document.getElementById('teams-table').getElementsByTagName('tbody')[0];
        teamsTable.innerHTML = '';
        data.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.Team}</td>
                <td>${row.Budget}</td>
                <td>
                    <button onclick="editTeam('${row.Team}')">Edit</button>
                    <button onclick="deleteTeam('${row.Team}')">Delete</button>
                </td>
            `;
            teamsTable.appendChild(tr);
        });
    });
}

// Load Players
function loadPlayers() {
    readCSV('items.csv', function (data) {
        const playersTable = document.getElementById('players-table').getElementsByTagName('tbody')[0];
        playersTable.innerHTML = '';
        data.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.Item}</td>
                <td>${row.Category}</td>
                <td>${row.BasePrice}</td>
                <td>${row.ImageURL}</td>
                <td>
                    <button onclick="editPlayer('${row.Item}')">Edit</button>
                    <button onclick="deletePlayer('${row.Item}')">Delete</button>
                </td>
            `;
            playersTable.appendChild(tr);
        });
    });
}

// Edit Team
function editTeam(teamName) {
    const newBudget = prompt(`Enter new budget for ${teamName}:`, teamBudgets[teamName]);
    if (newBudget && !isNaN(newBudget)) {
        teamBudgets[teamName] = parseFloat(newBudget);
        updateTeamBudgetsCSV();
        loadTeams(); // Refresh the table
    }
}

// Delete Team
function deleteTeam(teamName) {
    if (confirm(`Are you sure you want to delete ${teamName}?`)) {
        delete teamBudgets[teamName];
        updateTeamBudgetsCSV();
        loadTeams(); // Refresh the table
    }
}

// Edit Player
function editPlayer(playerName) {
    const player = basePrices[playerName];
    const newCategory = prompt(`Enter new category for ${playerName}:`, player.Category);
    const newBasePrice = prompt(`Enter new base price for ${playerName}:`, player.BasePrice);
    const newImageURL = prompt(`Enter new image URL for ${playerName}:`, player.ImageURL);

    if (newCategory && newBasePrice && newImageURL) {
        basePrices[playerName] = {
            BasePrice: parseFloat(newBasePrice),
            ImageURL: newImageURL,
            Category: newCategory,
            Sold: player.Sold,
        };
        updateItemsCSV();
        loadPlayers(); // Refresh the table
    }
}

// Delete Player
function deletePlayer(playerName) {
    if (confirm(`Are you sure you want to delete ${playerName}?`)) {
        delete basePrices[playerName];
        updateItemsCSV();
        loadPlayers(); // Refresh the table
    }
}

// Update Teams CSV
function updateTeamBudgetsCSV() {
    const data = Object.keys(teamBudgets).map((team) => ({
        Team: team,
        Budget: teamBudgets[team],
    }));
    writeCSV('team_budgets.csv', data);
}

// Update Items CSV
function updateItemsCSV() {
    const data = Object.keys(basePrices).map((item) => ({
        Item: item,
        Category: basePrices[item].Category,
        BasePrice: basePrices[item].BasePrice,
        ImageURL: basePrices[item].ImageURL,
        Sold: basePrices[item].Sold,
    }));
    writeCSV('items.csv', data);
}

// Write CSV File
function writeCSV(file, data) {
    const csv = Papa.unparse(data, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file;
    link.click();
}
