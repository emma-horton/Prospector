// set up initial config settings for the server
const express = require('express');
const app = express();
const API_PORT = 24474;

app.use(express.urlencoded({ extended: true })) // optional but useful for url encoded data
app.use(express.json())



// ------------------------------- Game and Player Object Creation


// calculates random integer to assign as unique GameID
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// class to create the game object which stores all information related to the game
class Game {
    constructor() {
        this.gameID = getRandomInt(999999);
        this.gameboard = "";
        this.users = [];
        this.turn = {};
        this.score = {};
        this.outcome = {};
        this.leaver = [];
        this.state = 0;
        this.numberofplayers = 0
    }

    //methods 
    addUser(user_id) {
        this.users.push(user_id);
        this.score[user_id] = 0;
        if (this.users.length === 1) {
            this.turn[user_id] = true;
        } else {
            this.turn[user_id] = false;
        }
    }
    addGameboard(board) {
        this.gameboard = board;
    }
    addNumberofPlayers(number) {
        this.numberofplayers = number;
    }
    addLeaver(username) {
        this.leaver.push(username);
    }
    changeState(number) {
        this.state = number;
    }
    getScores() {
        return this.score;
    }
    getOutcome() {
        return this.outcome;
    }
    getGameState() {
        return this.state;
    }
}

// creation of games object to hold all individual game objects
const games = {}
games.ongoing_games = {}
games.finished_games = {}

//methods
games.getOngoingGames = function (gameID) {
    if (gameID) {
        return games.ongoing_games[gameID]
    } else {
        return games.ongoing_games;
    }
}
games.addOngoingGames = function (gameID, gameObject) {
    games.ongoing_games[gameID] = gameObject
}

// class to create player when user registers 
class Player {
    constructor(user_id, password) {
        this.user_id = user_id;
        this.password = password;
        this.winner = 0;
        this.drawer = 0;
        this.loser = 0;
    }
    addWinner() {
        this.winner++;
    }
    addDrawer() {
        this.drawer++;
    }
    addLoser() {
        this.loser++;
    }
}


// global user object to store all users in the database
let users = { users: {} };


// ------------------------------- Login section


// endpoints related to registering a new user which also checks for conditions regarding whether the user already exists and whether username is eligible 
app.post('/user/register', function (req, res) {
    let { user, pass } = req.body;
    let userAlreadyExists = false;
    for (key of Object.keys(users.users)) {
        if (user === key) {
            userAlreadyExists = true;
            res.status(404).json({ message: "User already exists" });
        }
    }
    if (userAlreadyExists === false) {
        let newPlayer = new Player(user, pass)
        users.users[user] = newPlayer;
        console.log("User added:", users.users);
        res.status(200).json({ message: "User added successfully" });
    }
});

// retrieves the username and password from the client and checks whether these exist in the object 
app.post('/user/login', function (req, res) {
    let { username, password } = req.body;

    if (users.users.hasOwnProperty(username)) {
        if (users.users[username].password === password) {
            console.log("User successfully logged in as ", username);
            res.status(200).json({ message: "User successfully logged in as", username });
        } else {
            console.log("Incorrect password for user:", username);
            res.status(401).json({ message: "Incorrect password" });
        }
    } else {
        console.log("User not found:", username);
        res.status(404).json({ message: "User not found" });
    }
})

// sends all users to the client 
app.get('/users', function (req, res) {
    res.json(users)
})


// ------------------------------- Finished and ongoing games 


// send a list of all currently ongoing and finished games to the client 
app.get('/games', function (req, res) {

    let games1 = games.getOngoingGames()
    let finished_games = []
    let running_games = []

    if (typeof games1 === 'object' && Object.keys(games1).length > 0) {
        for (let gameID in games1) {
            let game = games1[gameID];
            if (game.state === 0) {
                running_games.push(game);
            } else if (game.state === 1) {
                finished_games.push(game);
            }
        }
    } else {
        console.error("empty object");
    }

    let list_of_games = {
        ongoing_games: running_games,
        finished_games: finished_games
    }

    res.json({ data: list_of_games });
});


// ------------------------------- Game settings


// retrieve information from client and create a new game 
app.post('/game/createnewgame', function (req, res) {

    game_data = req.body
    console.log(game_data)

    //call function to generate the gameboard based on the data received from the client 
    function createGrid(game_data) {
        let game_array = []

        let numberOfPlayers = game_data.numberOfPlayers;
        let landType = game_data.landType;
        let gridShape = game_data.gridShape;
        let gridHeight = game_data.gridHeight;
        let gridLength = game_data.gridLength;

        for (let i = 0; i < (2 * gridHeight + 1); i++) {
            let row = (i % 2 === 0) ? createRow(gridLength, 1) : createRow3(gridLength, 2);
            game_array.push(row);
        }

        modified_array = modifyGrid(game_array, landType);
        console.log("the selected landtype is", landType)
        return modified_array
    }


    game_data_array = createGrid(game_data)
    console.log(game_data_array)

    const newGame = new Game();
    newGame.addGameboard(req.body.gameboard)
    newGame.addUser(req.body.user)
    newGame.addGameboard(game_data_array)
    newGame.addNumberofPlayers(game_data.numberOfPlayers)

    games.addOngoingGames(newGame.gameID, newGame)

    console.log(games)

    res.status(200).json(newGame)


    //helper functions 
    function modifyGrid(array, landType) {
        console.log("array received from creategrid", array)

        if (landType === 'standard') {
            return array
        } else if (landType === 'standard1') {
            array_bronze = replace3WithValue(array, 5);
            return array_bronze
        } else if (landType === 'standard2') {
            array_silver = replace3WithValue(array, 6);
            array_bronze = replace3WithValue(array_silver, 5);
            return array_bronze
        } else if (landType === 'standard3') {
            let array_gold = replace3WithValue(array, 7);
            array_silver = replace3WithValue(array_gold, 6);
            array_bronze = replace3WithValue(array_silver, 5);
            return array_bronze
        }
        function replace3WithValue(array2D, value) {
            let indices = [];

            for (let i = 0; i < array2D.length; i++) {
                for (let j = 0; j < array2D[i].length; j++) {
                    if (array2D[i][j] === 3) {
                        indices.push([i, j]); // or use {row: i, column: j} for object representation
                    }
                }
            }
            if (indices.length < 1) {
                return array2D;
            } else {
                let index = Math.floor(Math.random() * indices.length);
                let randomElement = indices[index];
                array2D[randomElement[0]][randomElement[1]] = value;
                return array2D;
            }
        }
    }

    function createRow(length, start_number) {
        let count = 0
        let array = []
        while (count < (2 * length + 1)) {
            array.push(start_number)
            start_number = 3 - start_number
            count++
        }
        return array
    }

    function createRow3(length, start_number) {
        let count = 0
        let array = []
        while (count < (2 * length + 1)) {
            array.push(start_number)
            start_number = 5 - start_number
            count++
        }
        return array
    }
});


// endpoint for when user joins a game and sends the data back to the user 
app.post('/games/:gameID/:username/joingame', function (req, res) {

    let username = req.params.username;
    let gameID = req.params.gameID;
    let gameData = games.getOngoingGames(gameID)

    let numberOfPlayers = gameData.numberofplayers
    let numberOfJoinedPlayers = gameData.users.length

    if (parseInt(numberOfPlayers) <= parseInt(numberOfJoinedPlayers)) {
        res.json("Sorry, this game is full. Please join another game.")
    } else {
        gameData.addUser(username);
        res.json(gameData);
    }
})

// calls the end game functions when prompted that a user has left the game by the client
app.post('/games/:gameID/:username/leave-game', function (req, res) {

    let username = req.params.username;
    let gameID = req.params.gameID;
    let gameData = games.getOngoingGames(gameID)

    gameData.addLeaver(username);
    endGame(gameID)
    res.json(`${username} has left the game ${gameData}`)
})

// function to end the game on the server given its id 
function endGame(gameID) {

    let gameData = games.getOngoingGames(gameID)

    gameData.changeState(1)

    //assign the leaver as the loser of the game and all other players as winners 
    if (gameData.leaver.length > 0) {
        gameData.outcome['loser'] = gameData.leaver[0]
        gameData.outcome["winner"] = []
        for (let user of gameData.users) {
            if (user !== gameData.leaver[0]) {
                gameData.outcome['winner'].push(user);
                console.log(gameData.outcome)
            }
        }
    } else {

        //iterate through scores of the game and assign winners and losers 
        let scores = gameData.getScores()
        maxValue = 0

        for (value of Object.values(scores)) {
            if (value > maxValue) {
                maxValue = value
            }
        }

        let keysWithHighestValues = Object.keys(scores).filter(key => scores[key] === maxValue)
        if (keysWithHighestValues.length > 1) {
            gameData.outcome['drawer'] = keysWithHighestValues;
            gameData.outcome['winner'] = [];
        } else {
            gameData.outcome['winner'] = keysWithHighestValues;
            gameData.outcome['drawer'] = [];
        }

        losers = []
        for (key of Object.keys(scores)) {
            if (gameData.outcome["drawer"].includes(key) | gameData.outcome["winner"].includes(key)) {
            } else {
                losers.push(key)
            }
        }
        gameData.outcome['loser'] = losers;

    }
    updateUserScoreInfomation(gameData)
}


// function updates users profile statistics depending on whether they won, drew or lost the game 
function updateUserScoreInfomation(gameData) {

    let scores = gameData.getScores()
    let outcome = gameData.getOutcome()

    for (let key in outcome) {
        if (outcome.hasOwnProperty(key)) {
            for (let userKey of Object.keys(scores)) {
                if (outcome[key].includes(userKey)) {
                    switch (key) {
                        case 'winner':
                            users.users[userKey].addWinner();
                            break;
                        case 'drawer':
                            users.users[userKey].addDrawer();
                            break;
                        case 'loser':
                            users.users[userKey].addLoser();
                            break;
                        default:
                            console.log("Invalid outcome key:", key);
                    }
                }
            }
        }
    }
}


// ------------------------------- Functions related to the continuous polling done by the client 

// sends the game status back to the client indicating whether the game has started or not 
app.get('/games/:gameID/gamestatus', function (req, res) {

    let gameID = req.params.gameID;
    let gameData = games.getOngoingGames(gameID);

    let numberOfPlayers = gameData.numberofplayers
    let numberOfJoinedPlayers = gameData.users.length


    if (gameData.state === 1) {
        res.json(gameData)
    } else if (parseInt(numberOfPlayers) != parseInt(numberOfJoinedPlayers)) {
        res.json("Waiting for game to start...")
    } else {
        res.json(gameData);
    }
})

// sends data back to the client indicating that the game has finished 
app.get('/games/:gameID/gamefinished', function (req, res) {

    let gameID = req.params.gameID;
    let gameData = games.getOngoingGames(gameID);
    res.json(gameData)

})

// updates the gameboard and sends it back to the client 
app.get('/games/:gameID/updategameboard', function (req, res) {
    const gameID = req.params.gameID;
    const game_data = games.getOngoingGames(gameID)
    res.json(game_data)
})

// retrieves the updated gameboard from the client and calculates whether any land has been claimed by the previous move 
app.post('/games/:gameID/updatemoves', function (req, res) {
    const gameID = req.params.gameID;
    const updatedGameboard = req.body.gameboard;

    try {
        var game = games.getOngoingGames(gameID);
        claimLand(updatedGameboard)
        game.gameboard = updatedGameboard;
        console.log(game.gameboard)

        // helper functions
        function isValidPos(i, j, n, m) {
            return i >= 0 && j >= 0 && i < n && j < m;
        }

        // get array of all adjacent tiles of an element 
        function getAdjacent(arr, i, j) {
            const n = arr.length;
            const m = arr[0].length;
            const v = [];

            if (isValidPos(i - 1, j, n, m))
                v.push(arr[i - 1][j]);
            if (isValidPos(i, j - 1, n, m))
                v.push(arr[i][j - 1]);
            if (isValidPos(i, j + 1, n, m))
                v.push(arr[i][j + 1]);
            if (isValidPos(i + 1, j, n, m))
                v.push(arr[i + 1][j]);

            return v;

        }

        // get all adjacent tiles to all threes (boxes) placed on the gameboard
        function getAllAdjacentToThrees(arr) {
            const n = arr.length;
            const m = arr[0].length;
            const result = [];

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < m; j++) {
                    if (arr[i][j] === 3 | 5 | 6 | 7) {
                        const adjTiles = getAdjacent(arr, i, j);
                        result.push({ position: [i, j], adjacent: adjTiles });
                    }
                }
            }

            return result;
        }

        // function to check whether land has been claimed by client
        function claimLand(array) {
            const adjacentToThrees = getAllAdjacentToThrees(array);

            for (let i = 0; i < adjacentToThrees.length; i++) {
                let sum = 0;
                console.log('position ', adjacentToThrees[i].position)
                for (let j = 0; j < adjacentToThrees[i].adjacent.length; j++) {
                    // console.log(adjacentToThrees[i].adjacent[j])
                    sum += adjacentToThrees[i].adjacent[j];
                }
                if (sum === 16) {
                    // Increase players score when land is claimed 
                    for (let key in game.turn) {
                        let index = adjacentToThrees[i].position;
                        let row = index[0]
                        let col = index[1]
                        if (game.turn[key] === true) {
                            if (array[row][col] === 3) {
                                game.score[key] += 100;
                                array[row][col] = key;
                            } else if (array[row][col] === 5) {
                                game.score[key] += 200;
                                array[row][col] = key;
                            } else if (array[row][col] === 6) {
                                game.score[key] += 300;
                                array[row][col] = key;
                            } else if (array[row][col] === 7) {
                                game.score[key] += 400;
                                array[row][col] = key;
                            }
                        }
                        console.log('score: ', game.score);
                    }
                }
            }
            // end the game if all land has been claimed
            if (checkIfAllLandClaimed(array) === true) {
                console.log('End game');
                endGame(gameID);
            }
        }

        // function checks whether all land has been claimed on the whole gameboard
        function checkIfAllLandClaimed(array) {
            allClaimed = true
            for (let i = 0; i < array.length; i++) {
                if (array[i].includes(3) | array[i].includes(5) | array[i].includes(6) | array[i].includes(7)) {
                    allClaimed = false
                }
            }
            return allClaimed

        }

        // toggle the turn to the next player once a player has performed their move
        for (let userId of game.users) {
            if (game.turn[userId] === true) {
                game.turn[userId] = false;

                let nextUserIndex = (game.users.indexOf(userId) + 1) % game.users.length;
                let nextUserId = game.users[nextUserIndex];
                game.turn[nextUserId] = true;
                break;
            }
        }


        console.log("Updated game data:", game.gameboard);
        res.status(200).json("Fence placed!");
    } catch (error) {
        console.error("Error updating game board:", error);
        res.status(500).json({ error: "Failed to update game board" });
    }


});


// ------------------------------- Other

// tell server to use content folder
app.use(express.static('content'));

// tell the server to listen on the given port and log a message to the console (so we can see our server is doing something!)
app.listen(API_PORT, () => {
    console.log(`Listening on localhost:${API_PORT}`)
});