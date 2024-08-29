// ------------------------------- Login section

var global_username = ""


// performs conditional checks when registering a new user and posts information to the server for storage
function registerUser() {
    let username = document.getElementById("username-field").value;
    let password = document.getElementById("password-field").value;

    if (username === "" || password === "") {
        alert("Please provide both a username and password.");
    } else if (Number.isInteger(parseInt(username))) {
        alert('Please use a username that is not a number.');
    }
    else {
        fetch('/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: username, pass: password })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Server responded with status ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                alert("User registered successfully! Please log in.");
            })
            .catch(error => {
                console.error('Error:', error.message);
                if (error.message.includes('404')) {
                    alert("This username already exists. Please enter another username.");
                } else {
                    alert("An error occurred during registration. Please try again later.");
                }
            });
    }
}

// posts login information of the user to the server and calls functionns to show the next page and display scoreboard of the user 
function userLogin() {
    let username = document.getElementById("username-field").value;
    let password = document.getElementById("password-field").value;
    global_username = username;

    if (username === "" || password === "") {
        alert("Please provide both a username and password.");
    } else {
        fetch('/user/login', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        })
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status === 401) {
                    throw new Error('Incorrect password');
                } else if (res.status === 404) {
                    throw new Error('User not found');
                } else {
                    throw new Error('Failed to log in');
                }
            })
            .then(data => {
                login2GameSettings();
                getOngoingGames();
                displayScoreBoard();
            })
            .catch(error => {
                console.error('Error logging user in:', error.message);
                alert(error.message);
            });
    }
}

// logoff function which reloads the webpage in order to bring the user back to the login screen. this is assigned to the logoff button 
function reloadPage() {
    window.location.reload();
    document.getElementById("logoff-button").style.display = "none";
}

// displays the user's all time win, draws and loss statistics  
function displayScoreBoard() {
    fetch('/users')
        .then(response => response.json())
        .then(data => {
            document.getElementById('score-board').innerHTML = 'Username: ' + global_username + ' | Wins: ' + data.users[global_username].winner + ' | Draws: ' + data.users[global_username].drawer + ' | Loses: ' + data.users[global_username].loser;
        })
        .catch(error => {
            console.error('Error fetching user infomation', error);
        });
}

// takes the user from the login page to the game settings page when a user logs in
function login2GameSettings() {
    document.getElementById("login_page").style.display = "none";
    document.getElementById("game-settings").style.display = "block";
    document.getElementById("logoff-button").style.display = "block";
    document.getElementById("logoff-button").disabled = false;
}

// takes the user from the game settings page to the gameboard page when a game is started or joined
function gamesettings2Gameboard() {
    document.getElementById("game-settings").style.display = "none";
    document.getElementById("gameboard").style.display = "block";
    document.getElementById("logoff-button").disabled = true;
}

// takes the user from the gameboard page to the game settings page when a game is finished
function gameboard2Gamesetting() {
    document.getElementById("game-settings").style.display = "block";
    document.getElementById("gameboard").style.display = "none";
    document.getElementById("logoff-button").disabled = false;
    displayScoreBoard();
}


// ------------------------------- Game settings page


// continuous polling of all games on the server to be displayed to the user when selecting to start a new game or join an ongoing game
async function getOngoingGames() {
    while (true) {
        await pollOngoingGames()
        await wait()
    }
}

// fetch statement which retrieves all games from the server and calls the functions to populate the HTML
function pollOngoingGames() {

    fetch('/games')
        .then(response => response.json())
        .then(data => {
            populateOngoingGames(data.data.ongoing_games)
            populateFinishedGames(data.data.finished_games)
        })
        .catch(error => {
            console.error('Error fetching ongoing games:', error);
        });
}

// populate game settings page with the game IDs of currently ongoing games for users to join
function populateOngoingGames(data) {
    const gameContainer = document.getElementById("ongoing-games");

    gameContainer.innerHTML = '';

    data.forEach(game => {
        let game_container = document.createElement("div");

        let gameInfoContainer = document.createElement("div");
        let game_text = document.createElement("p");
        let join_button = document.createElement("button");

        gameInfoContainer.style.display = "flex"; 
        gameInfoContainer.style.alignItems = "center"; 
        gameInfoContainer.style.justifyContent = "center";

        game_text.innerHTML = game.gameID;
        join_button.innerHTML = "Join Game";
        join_button.addEventListener("click", () => joinGame(game.gameID));

        game_text.style.marginRight = "10px"; 

        gameInfoContainer.appendChild(game_text);
        gameInfoContainer.appendChild(join_button);

        game_container.appendChild(gameInfoContainer);
        gameContainer.appendChild(game_container);
    });
};



// populate game settings page with the game IDs of finished games such that players cannot join these games  
function populateFinishedGames(data) {
    const gameContainer = document.getElementById("finished-games");

    gameContainer.innerHTML = '';

    data.forEach(game => {
        let game_container = document.createElement("div");
        let game_text = document.createElement("p");

        game_text.innerHTML = game.gameID;

        game_container.appendChild(game_text);
        gameContainer.appendChild(game_container);
    });
};

// function which is added to the Join Game button which joins the desired game when clicked 
function joinGame(gameID) {

    data = {
        gameID: gameID,
        username: global_username
    }

    fetch(`/games/${gameID}/${global_username}/joingame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(joinedgame => {
            if (typeof joinedgame === "string") {
                alert(joinedgame);
            } else {
                gamesettings2Gameboard()
                createGameboard(joinedgame.gameboard, gameID)
                createLeaveButton(joinedgame.gameID);
                document.getElementById("home-button").disabled = true;
                pollServer(joinedgame.gameID)
            }
        })
        .catch(error => {
            console.error("Error adding user to game", error);
        });
}


// ------------------------------- Start a new game


// creates a new game by posting the game information to the server and calls functions to show the user the gameboard page
function startNewGame() {

    data = getGameSettings()

    fetch('/game/createnewgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(newGame => {
            gamesettings2Gameboard();
            createGameboard(newGame.gameboard, newGame.gameID)
            createLeaveButton(newGame.gameID);
            document.getElementById("home-button").disabled = true;
            pollServer(newGame.gameID)
        })
        .catch(error => {
            console.error("Error creating game", error);
        });
}

// retrieves the game settings that the user has selected in the drop down menus
function getGameSettings() {

    let numberOfPlayers = document.getElementById("no_players").value;
    let gridShape = document.getElementById("grid_shape").value;
    let gridHeight = document.getElementById("grid_height").value;
    let gridLength = document.getElementById("grid_length").value;
    let landType = document.getElementById("land_types").value

    let username = global_username

    let data = {
        user: username,
        numberOfPlayers: numberOfPlayers,
        landType: landType,
        gridShape: gridShape,
        gridHeight: gridHeight,
        gridLength: gridLength,
    }
    return data
}


// ------------------------------- Gameboard


// converts the 2d game array into visible HTML gameboard 
function createGameboard(array, gameID) {

    let gameboard_container = document.getElementById('gb-container');
    gameboard_container.innerHTML = '';
    numColumns = array[0].length
    numRows = array.length

    let templateColumns = ""
    let templateRows = ""

    for (let i = 0; i < numColumns; i++) {
        if (i % 2 === 0) {
            templateColumns += '50px ';
        } else {
            templateColumns += '150px ';
        }
    }

    for (let i = 0; i < numRows; i++) {
        if (i % 2 === 0) {
            templateRows += '50px ';
        } else {
            templateRows += '100px ';
        }
    }

    gameboard_container.style.gridTemplateColumns = templateColumns
    gameboard_container.style.gridTemplateRows = templateRows

    array.forEach((row, rowIndex) => {
        row.forEach((element, colIndex) => {
            const cell = document.createElement('div');
            if (element == 1) {
                cell.classList.add('empty1');
            }
            if (element === 2) {
                cell.classList.add('edge1');
                cell.addEventListener('click', async function () {
                    const isTurn = await checkTurn(gameID);
                    if (isTurn) {
                        cell.style.backgroundColor = 'red';
                        array[rowIndex][colIndex] = 4;
                        sendMoves(gameID, array);
                    } else {
                        alert("It is not your turn!");
                    }
                });
            }
            if (element == 3) {
                cell.classList.add('box1');
            }
            if (element == 4) {
                cell.classList.add("fence1");
            }
            if (isNaN(element)) {
                cell.classList.add("claimed-land");
                const name = document.createElement('p')
                name.innerHTML = element;
                cell.appendChild(name)
            }
            if (element == 5) {
                cell.classList.add("copper");
            }
            if (element == 6) {
                cell.classList.add("silver");
            }
            if (element == 7) {
                cell.classList.add("gold");
            }
            gameboard_container.appendChild(cell);
        });
    });
}


// updates the gameboard array by fetching the most recent gameboard from the server and updating the current score of the game
function updateGameboard(gameID) {

    fetch(`/games/${gameID}/updategameboard`)
        .then(response => response.json())
        .then(data => {
            gameboard_array = data.gameboard
            createGameboard(gameboard_array, gameID);
            updateScores(data.score);
        })
        .catch(error => {
            console.error('Error fetching gameboard:', error);
        });

}

// updates the users' scores
function updateScores(score) {

    let scoresContainer = document.getElementById('scores-container');
    scoresContainer.innerHTML = '';

    Object.keys(score).forEach(username => {
        let userDiv = document.createElement('div');
        userDiv.innerHTML = `<strong>${username}</strong>: ${score[username]}`;
        scoresContainer.appendChild(userDiv);
    });
}


// ------------------------------- Leave game


// creates the leave game button and assigns it the functionality of the leaveGame function
function createLeaveButton(gameID) {

    let leave_button = document.createElement("button")
    let button_container = document.getElementById("game-buttons")
    leave_button.setAttribute("id", "leave-button")

    leave_button.innerHTML = "Leave Game"
    leave_button.addEventListener("click", () => leaveGame(gameID))

    button_container.appendChild(leave_button)

}

// posts the username and game id of the user leaving the current game session
function leaveGame(gameID) {

    alert("leaving game...")

    data = {
        gameID: gameID,
        username: global_username
    }

    fetch(`/games/${gameID}/${global_username}/leave-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
    })
        .then(res => res.text())
        .then(txt => console.log(txt))
}


// ------------------------------- Continuous polling from server

// polling server continuously until the current game is finished 
async function pollServer(gameID) {
    var game_finished = false;
    while (!game_finished) {
        //console.log("Im polling!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        await updateGameboard(gameID)
        await checkTurn(gameID)
        await wait();
    }
}


// checks the status of the game, i.e., whether the game has started yet or is finished. if the game is ongoing it also checks and displays whether it is the user's turn
function checkTurn(gameID) {
    let current_user = global_username;
    let gameStatus = document.getElementById("game-status");

    return new Promise((resolve, reject) => {
        fetch(`/games/${gameID}/gamestatus`, {
            method: "GET",
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(data => {

                if (data.state === 1) {
                    let winner = data.outcome.winner
                        let drawer = data.outcome.drawer
                        game_finished = true
                        document.getElementById("leave-button").remove()
                        document.getElementById("home-button").disabled = false;

                        console.log("GAME IS FINISHED")

                        if (winner === undefined) {
                            gameStatus.innerHTML = "Game over! There is no winner."
                        } else if (winner.length > 0) {
                            gameStatus.innerHTML = `Game finished! Winner : ${winner}`
                        } else if (drawer.length > 0) {
                        gameStatus.innerHTML = `Game finished! It's a draw! : ${drawer}`
                    }
                } else if (typeof data === "string") {
                    gameStatus.innerHTML = data;
                    resolve(false)
                } else if (data.turn[current_user] === true) {
                    gameStatus.innerHTML = "It is your turn"
                    resolve(true)
                } else {
                    gameStatus.innerHTML = "It is not your turn"
                    resolve(false)
                }            
            })
        .catch(error => {
            console.error("Error retrieving whose turn it is", error);
            reject(error);
        });
});
}

// posts the moves that have been performed on the gameboard to the server 
async function sendMoves(gameID, gameboardArray) {
    try {
        const response = await fetch(`/games/${gameID}/updatemoves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameboard: gameboardArray })
        });
        const data = await response.json();
    } catch (error) {
        console.error("Error updating moves on server:", error);
    }
}

// utility function to wait for 1 second
async function wait() {
    return new Promise(resolve => { setTimeout(() => { resolve("wait") }, 500) });
}