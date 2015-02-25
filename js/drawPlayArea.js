/*global $ */
var mainApp;

function Zone(name) {
    'use strict';
    this.name = name;
    this.cards = [];
}

function Player(name) {
    'use strict';
    this.name = name;
    this.zones = {
        deck: new Zone('deck'),
        hand: new Zone('hand')
    };
    this.nextMarkerId = 0;
    this.markers = [];
    this.cardCount = 0;
    // this.score = 0;
    this.imageUrl = '';
    this.imageScale = 1;

    this.getZonesAsArray = function () {
        var zoneArray = [];
        for (var zone in this.zones) {
            if (this.zones.hasOwnProperty(zone) &&
                zone !== 'deck' &&
                (zone !== 'hand' ||
                 this.name === mainApp.playAreaSVG.tableData.playerName ||
                 mainApp.playAreaSVG.tableData.playerName === '')) {
                zoneArray.push(this.zones[zone]);
            }
        }
        return zoneArray;
    };
}

function TableData() {
    'use strict';
    var self = this;
    this.deckCSV = null;
    this.room = null;
    this.playerName = null;
    this.player = null;
    this.players = {};
    this.playerCount = 0;
    this.lastUpdateId = -1;
    this.tableRadius = 750;
    this.markerHistory = [];

    this.setRoom = function (roomName) {
        this.room = roomName;
        this.lastUpdateId = -1;
        $.post('tableState.php',
                {
                    action: 'change_room',
                    room: this.room
                });
        mainApp.updateFromServer();
    };
    this.setPlayer = function (playerName) {
        if (!this.players.hasOwnProperty(playerName)) {
            this.players[playerName] = new Player(playerName);
        }

        this.playerName = playerName;
        this.player = this.players[playerName];
        d3.select('#tableImageUrl')
            .property('value', this.player.imageUrl);
        d3.select('#tableImageScale')
            .property('value', this.player.imageScale.toString());
    };
    this.addPlayer = function (playerName) {
        if (playerName !== '') {
            $.post('tableState.php',
                    {
                        action: 'addPlayer',
                        room: this.room,
                        player: playerName,
                        // storing score in rotation
                        rotation: '0',
                        ordering: this.playerCount
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
            this.playerCount += 1;
        }
    };
    this.renamePlayer = function (playerName) {
        // check if its a different name
        if (playerName !== this.playerName &&
            !this.players.hasOwnProperty(playerName)) {
            // change name on server
            $.post('tableState.php',
                    {
                        action: 'updatePlayerName',
                        room: this.room,
                        new_player: playerName,
                        old_player: this.playerName,
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
        this.setPlayer(playerName);
    };
    this.setTableImageUrl = function (tableImageUrl) {
        if (tableImageUrl !== this.player.imageUrl) {
            // change name on server
            $.post('tableState.php',
                    {
                        action: 'update_table_image_url',
                        room: this.room,
                        player: this.playerName,
                        image_url: tableImageUrl,
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.setTableImageScaleAndDistance = function (tableImageScale,
                                                   tableImageDistance) {
        // change name on server
        $.post('tableState.php',
                {
                    action: 'update_table_image_scale_and_distance',
                    room: this.room,
                    player: this.playerName,
                    image_scale: tableImageScale,
                    image_distance: tableImageDistance,
                },
                function (data) {
                    self.lastUpdateId = data.last_update_id;
                },
                'json');
    };
    this.setDeckDealPoint = function (x, y) {
        // change name on server
        $.post('tableState.php',
                {
                    action: 'set_deck_deal_point',
                    room: this.room,
                    player: this.playerName,
                    x: x,
                    y: y,
                },
                function (data) {
                    self.lastUpdateId = data.last_update_id;
                },
                'json');
    };
    this.updatePlayerScore = function (name, score) {
        $.post('tableState.php',
                {
                    action: 'updatePlayerScore',
                    room: this.room,
                    player: name,
                    // storing score in rotation
                    rotation: score
                },
                function (data) {
                    self.lastUpdateId = data.last_update_id;
                },
                'json');
    };
    this.dbAddObjects = function (objectType, objects, zone) {
        if (this.room !== null && this.player !== null) {
            var objectIds = [],
                names = [],
                imageUrls = [],
                xPositions = [],
                yPositions = [];
            for (var i = 0; i < objects.length; i++) {
                objectIds.push(objects[i].id);
                names.push(objects[i].name);
                imageUrls.push(objects[i].image_url);
                xPositions.push(objects[i].x);
                yPositions.push(objects[i].y);
            }
            $.post('tableState.php',
                    {
                        action: 'add',
                        room: this.room,
                        player: this.playerName,
                        zone: zone,
                        type: objectType,
                        'id[]': objectIds,
                        'name[]': names,
                        'image_url[]': imageUrls,
                        'x_pos[]': xPositions,
                        'y_pos[]': yPositions
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbUpdateObject = function (object) {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php',
                    {
                        action: 'update',
                        room: this.room,
                        player: object.playerName,
                        zone: object.zone,
                        type: object.type,
                        id: object.id,
                        x_pos: object.x,
                        y_pos: object.y,
                        rotation: object.rotation,
                        ordering: object.ordering
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbUpdateDeckOrdering = function () {
        if (this.room !== null && this.player !== null) {
            var deck = this.player.zones['deck'].cards,
                objectIds = [],
                orderings = [];
            for (var i = 0; i < deck.length; i++) {
                objectIds.push(deck[i].id);
                orderings.push(deck[i].ordering);
            }
            $.post('tableState.php',
                    {
                        action: 'update_deck_order',
                        room: this.room,
                        player: this.playerName,
                        'id[]': objectIds,
                        'ordering[]': orderings
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbRemoveObject = function (object) {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php',
                    {
                        action: 'remove',
                        room: this.room,
                        player: object.playerName,
                        type: object.type,
                        id: object.id
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbRemovePlayerObjects = function (playerName) {
        if (this.room !== null) {
            delete this.players[playerName];
            $.post('tableState.php',
                    {
                        action: 'remove_player_objects',
                        room: this.room,
                        player: playerName
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbRemovePlayer = function (playerName) {
        if (this.room !== null) {
            delete this.players[playerName];
            $.post('tableState.php',
                    {
                        action: 'remove_player',
                        room: this.room,
                        player: playerName
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };

    this.processRoomState = function (newData) {
        // clear old data
        this.players = {};
        this.playerCount = 0;
        this.lastUpdateId = newData.change_id;
        for (var i = 0; i < newData.results.length; i++) {
            var object = newData.results[i];
            if (!this.players.hasOwnProperty(object.player)) {
                this.players[object.player] = new Player(object.player);
                this.playerCount += 1;
            }
            var player = this.players[object.player];
            if (!player.zones.hasOwnProperty(object.zone)) {
                player.zones[object.zone] = new Zone(object.zone);
            }

            if (object.type === 'card') {
                this.players[object.player].cardCount += 1;
                var zone = player.zones[object.zone];
                zone.cards.push({
                    type: object.type,
                    zone: object.zone,
                    id: object.id,
                    image_url: object.imageUrl,
                    name: object.name,
                    x: object.xPos,
                    y: object.yPos,
                    playerName: object.player,
                    rotation: object.rotation,
                    ordering: object.ordering
                });
            } else if (object.type === 'marker') {
                player.markers.push({
                    type: object.type,
                    id: object.id,
                    text: object.imageUrl,
                    x: object.xPos,
                    y: object.yPos,
                    playerName: object.player
                });
                if (object.id >= player.nextMarkerId) {
                    player.nextMarkerId = object.id + 1;
                }
            } else if (object.type === 'player') {
                player.score = parseInt(object.rotation);
                player.ordering = parseInt(object.ordering);
                player.imageUrl = object.imageUrl
                player.imageScale = object.name;
                player.deckDealX = object.xPos;
                player.deckDealY = object.yPos;
                if (player.name === this.playerName) {
                    d3.select('#tableImageUrl')
                        .property('value', object.imageUrl);
                }
            } else if (object.type === 'room') {
                this.tableRadius = object.name;
                d3.select('#tableDistance')
                    .property('value', this.tableRadius);
            }
        }
        // sort cards (in each zone of each player)
        for (var playerName in this.players) {
            if (this.players.hasOwnProperty(playerName)) {
                for (var zoneName in this.players[playerName].zones) {
                    if (this.players[playerName].zones.hasOwnProperty(zoneName)) {
                        this.players[playerName].zones[zoneName].cards.sort(
                            function (a, b) {
                                return  a.ordering - b.ordering;
                            });
                    }
                }
            }
        }
        this.setPlayer(this.playerName);
    };

    this.loadDeckFromCSV = function (deckCSV) {
        this.deckCSV = deckCSV;
        this.dbRemovePlayerObjects(this.playerName);
        this.player.zones = {};
        this.player.zones['deck'] = new Zone('deck');
        this.player.zones['deck'].cards = $.csv.toObjects(deckCSV);

        var duplicateCards = [],
            deck = this.player.zones['deck'].cards;
        for (var i = 0; i < deck.length; i++) {
            var card = deck[i];
            // assign an id to each card
            card.id = i;
            card.zone = 'deck';
            card.type = 'card';
            card.rotation = 0;

            // create extra copies of duplicate cards
            for (var j = 1; j < card.count; j++) {
                duplicateCards.push({
                    name: card.name,
                    image_url: card.image_url,
                    count: card.count,
                    id: deck.length + duplicateCards.length,
                    zone: 'deck',
                    type: 'card',
                    rotation: 0
                });
            }
        }
        deck = deck.concat(duplicateCards);
        this.player.zones['deck'].cards = deck;
        this.dbAddObjects('card', deck, 'deck');
        $('#deckCount').text(deck.length);
    };
    this.createMarker = function (text) {
        var textFound = false;
        for (var i = 0; i < this.markerHistory.length; i++) {
            if(this.markerHistory[i].text === text) {
                this.markerHistory[i].count += 1;
                textFound = true;
                break;
            }
        }
        if (!textFound) {
            this.markerHistory.push({
                text: text,
                count: 1
            });
        }
        this.markerHistory.sort(function (a, b) {
            return b.count - a.count;
        })
        var newMarker = {
            id: this.player.nextMarkerId,
            text: text,
            // to cram it in the same table as cards
            image_url: text,
            x: this.player.deckDealX,
            y: this.player.deckDealY,
            player: this.playerName,
            type: 'marker',
            ordering: 0
        };
        this.player.markers.push(newMarker);
        this.player.nextMarkerId += 1;
        this.dbAddObjects('marker',
                           [newMarker],
                           'ontop');
    };
    this.resetPlayer = function () {
        var deckCards = this.player.zones['deck'].cards;
        for (var zoneName in this.player.zones) {
            if (this.player.zones.hasOwnProperty(zoneName) &&
                zoneName !== 'deck') {
                var zoneCards = this.player.zones[zoneName].cards;

                for (var i = 0; i < zoneCards.length; i++) {
                    zoneCards[i].zone = 'deck';
                    zoneCards[i].x = this.player.deckDealX;
                    zoneCards[i].y = this.player.deckDealY;
                    zoneCards[i].rotation = 0;
                    zoneCards[i].ordering = 0;
                    deckCards.push(zoneCards[i]);
                }

                this.player.zones[zoneName].cards = [];
            }
        }
        this.player.markers = [];
        $.post('tableState.php',
                {
                    action: 'reset_player',
                    room: this.room,
                    player: this.player.name,
                    x: this.player.deckDealX,
                    y: this.player.deckDealY
                },
                function (data) {
                    self.lastUpdateId = data.last_update_id;
                },
                'json');
        this.shuffleDeck();
    };
    this.shuffleDeck = function () {
        var deck = this.player.zones['deck'].cards;
        for (var i = deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }
        for (var i = deck.length - 1; i > 0; i--) {
            deck[i].ordering = i;
        }
        this.dbUpdateDeckOrdering();
    };
    this.drawCard = function () {
        var deck = this.player.zones['deck'].cards;
        if (deck.length > 0) {
            deck[deck.length - 1].x = this.player.deckDealX;
            deck[deck.length - 1].y = this.player.deckDealY;
            this.changeCardZone(deck[deck.length - 1],
                                'hand');
        }
    };
    this.drawCardById = function (id) {
        var deck = this.player.zones['deck'].cards,
            card = null;
        for (var i = 0; i < deck.length; i++) {
            if (deck[i].id == id) {
                this.changeCardZone(deck[i],
                                    'hand');
                break;
            }
        }
    };
    this.changeCardZone = function (card, targetZone, end) {
        if (this.player.zones[card.zone].cards.length > 0) {
            // remove from old zone
            var sourceCards = this.player.zones[card.zone].cards;
            for (var i = 0; i < sourceCards.length; i++) {
                if (sourceCards[i].id == card.id) {
                    sourceCards.splice(i, 1);
                    break;
                }
            }

            // add to new zone
            if (!this.player.zones.hasOwnProperty(targetZone)) {
                this.player.zones[targetZone] = new Zone(targetZone);
            }
            var targetCards = this.player.zones[targetZone].cards,
                newOrdering = 0;
            if (targetZone === 'deck' &&
                end === 'bottom') {
                for (i = 0; i < targetCards.length; i++) {
                    if (targetCards[i].ordering <= newOrdering) {
                        newOrdering = targetCards[i].ordering - 1;
                    }
                }
            } else {
                for (i = 0; i < targetCards.length; i++) {
                    if (targetCards[i].ordering >= newOrdering) {
                        newOrdering = targetCards[i].ordering + 1;
                    }
                }
            }

            targetCards.push(card);
            // update server
            card.zone = targetZone;
            card.ordering = newOrdering;
            this.dbUpdateObject(card);
        }
    };
    this.rotateLeft = function (card) {
        card.rotation = (card.rotation - 90) % 360;
        this.dbUpdateObject(card);
    };
    this.rotateRight = function (card) {
        card.rotation = (card.rotation + 90) % 360;
        this.dbUpdateObject(card);
    };
    this.unrotatePlayerCards = function () {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php',
                    {
                        action: 'unrotate_player_cards',
                        room: this.room,
                        player: this.playerName
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.getPlayerArray = function () {
        var playerArray = [],
            i = 0;
        for (var playerName in this.players) {
            if (this.players.hasOwnProperty(playerName)) {
                if (this.players[playerName].name !== '') {
                // if (this.players[playerName].cardCount > 0 ||
                //     this.players[playerName].markers.length > 0) {
                    playerArray.push(this.players[playerName]);
                }
            }
        }
        playerArray.sort(function (a, b) {
            return a.ordering - b.ordering;
        });
        for (i = 0; i < playerArray.length; i++) {
            if (playerArray[i].name === this.playerName ||
                this.playerName === '') {
                var frontPlayers = playerArray.splice(0, i);
                playerArray = playerArray.concat(frontPlayers);
                break;
            }
        }
        for (i = 0; i < playerArray.length; i++) {
            playerArray[i].order = i;
        }
        return playerArray;
    };
}

function PlayAreaSVG() {
    'use strict';
    var self = this;
    // set in init()
    this.svg = null;
    this.x = null;
    this.y = null;
    this.svgWidth = null;
    this.svgHeight = null;
    this.tableData = null;

    this.viewBox = {left: 0,
                    top: 0,
                    width: 0,
                    height: 0};

    this.scale = 1;
    this.markerSize = 5;
    this.cardSize = 1;
    this.noChangesCount = 0;
    this.sleeping = true;
    this.dragInProgress = false;
    this.playerRotations = {};
    // point that all players are rotated around.
    // y varies based on number of players
    this.playerRotationPoint = {x: 0,
                                y: 0};

    this.init = function () {
        var canvasOffset;
        this.svg = d3.select('#playAreaSVG');
        this.resizeSVG();
        window.onresize = this.resizeSVG;
        canvasOffset = $('#playAreaSVG').offset();
        this.x = canvasOffset.left;
        this.y = canvasOffset.top;
        this.tableData = new TableData();
        this.tableData.setRoom($('#roomName').val());
        this.tableData.setPlayer($('#playerName').val());
    };

    this.drag = d3.behavior.drag();
    this.drag.on('dragstart', function(d) {
        self.dragInProgress = true;
        self.dragOffset = {x: null,
                           y: null};
        d3.event.sourceEvent.stopPropagation();
        var drugObject = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        if (drugObject.classed('enlarged')) {
            d.clicked = true;
            drugObject = d3.select('[player="' + d.playerName + '"]' +
                                   '[card_id="' + d.id + '"]')
            parent = d3.select($(drugObject[0][0]).parent()[0]);
        } else {
            d3.select('#enlargedCard image').remove();
        }
        d3.select('#cardButtons').selectAll("*").remove();
        // put the card on top of other cards in its group
        var newOrdering = 0,
            siblings = parent.selectAll('image');
            siblings.each(function (d) {
            if (d.ordering >= newOrdering) {
                newOrdering = d.ordering + 1;
            }
        });

        d.ordering = newOrdering;

        siblings.sort(function(a, b) {
            return a.ordering - b.ordering;
        });
    });
    this.drag.on('drag', function (d) {
        // d3.event.sourceEvent.stopPropagation();
        // d3.select('#cardButtons').selectAll("*").remove();
        d.clicked = false;
        var drugObject = d3.select(this);
        if (self.dragOffset.x === null) {
            self.dragOffset = {
                x: d.x - d3.event.x,
                y: d.y - d3.event.y,
                enlargedX: d.enlargedX - d3.event.x,
                enlargedY: d.enlargedY - d3.event.y,
            };
        }

        d.x = d3.event.x + self.dragOffset.x;
        d.y = d3.event.y + self.dragOffset.y;

        $('#motionDisplay').html('dx: ' + d3.event.dx + ' dy: ' + d3.event.dy);
        mainApp.setCoordDisplay(d3.event.x, d3.event.y);

        if (drugObject.classed('enlarged')) {
            drugObject.style('opacity', '0.0');

            d.enlargedX = d3.event.x + self.dragOffset.enlargedX;
            d.enlargedY = d3.event.y + self.dragOffset.enlargedY;

            drugObject
                .attr('x', d.enlargedX)
                .attr('y', d.enlargedY)
                .attr('transform', function (d) {
                    var imgCenterX = d.x + d.width / 2,
                        imgCenterY = d.y + d.height / 2,
                        rotation = -1 * self.playerRotations[d.playerName].degrees;
                    return 'rotate(' + rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                });

            // move source card beneath enlarged
            drugObject = d3.select('[player="' + d.playerName + '"]' +
                                   '[card_id="' + d.id + '"]')
        }

        if (drugObject.classed('marker')) {
            var markerRect = drugObject.select('rect'),
                markerText = drugObject.select('text');
            markerRect.attr('x', d.x)
                .attr('y', d.y);
            markerText.attr('x', d.x + 3)
                .attr('y', d.y + 26);
        } else {
            var imgCenterX = d.x + d.width / 2,
                imgCenterY = d.y + d.height / 2;
            drugObject
                .attr('x', d.x)
                .attr('y', d.y)
                .attr('transform', function (d) {
                    return 'rotate(' + d.rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                });
        }
    });
    this.drag.on('dragend', function (d) {
        self.dragInProgress = false;
        var drugObject = d3.select(this);
        if (drugObject.classed('enlarged')) {
            drugObject.style('opacity', '1.0');
            d.originCard
        }
        if (!d.clicked) {
            self.tableData.dbUpdateObject(d);
        }
        mainApp.updateFromServer();
    });
    this.drawCard = function () {
        this.tableData.drawCard();
        this._drawCards();
    };
    this.drawSelectedCard = function () {
        var selectedCardId = d3.select('#deckList').property('value');
        this.tableData.drawCardById(selectedCardId);
        this._drawCards();
    };
    this.drawTable = function () {
        var playerArray = this.tableData.getPlayerArray();
        var players = d3.select('#tableGraphic').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g').append('image');
        players
            .attr('transform', function (d, i) {
                d.rotation = 360 / playerArray.length * i;
                d.yOffset = -1 * self.tableData.tableRadius * (playerArray.length);

                return 'rotate(' + d.rotation + ' 0 ' + d.yOffset + ')';
            });
        players.select('image')
            .attr('xlink:href', function (d) {
                // this will be a broken link for unset players
                return d.imageUrl;
            })
            .style('display', function (d) {
                // this is a crude filter for unset values (which will be '0')
                if (d.imageUrl.length > 5) {
                    return ""
                } else {
                    return "none"
                }
            })
            .attr('x', function (d) {
                return -2250 * self.tableData.players[d.name].imageScale;
            })
            .attr('y', function (d) {
                return -1200 * self.tableData.players[d.name].imageScale;
            })
            .attr('width', function (d) {
                return 4500 * self.tableData.players[d.name].imageScale;
            })
            .attr('height', function (d) {
                return 2400 * self.tableData.players[d.name].imageScale;
            });
        players.exit().remove();
    };
    this._drawCards = function () {
        var currentPlayer = this.tableData.player;
        if (currentPlayer.zones.hasOwnProperty('deck')) {
            $('#deckCount').text(currentPlayer.zones['deck'].cards.length);
        }
        this.drawDeckList();

        var playerArray = this.tableData.getPlayerArray();
        this.playerRotationPoint = {x: 0,
                                    y: -1 * self.tableData.tableRadius *
                                    (playerArray.length)};
        var players = d3.select('#players').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d) {
                var rotation = 360 / playerArray.length * d.order;
                self.playerRotations[d.name] = {
                    degrees: rotation,
                    radians: rotation  * (Math.PI / 180)};

                return 'rotate(' + rotation + ' ' +
                               self.playerRotationPoint.x + ' ' +
                               self.playerRotationPoint.y + ')';
            });
        players.exit().remove();

        var zones = players.selectAll('g')
            .data(function (d) { return d.getZonesAsArray(); },
                  function (d) { return d.name; });
        zones.enter().append('g')
            .classed('cards_in_hand',
                    function (d) { return d.name === 'hand'; });
        zones.exit().remove();

        var cards = zones.selectAll('image')
            .data(function (d) { return d.cards; },
                  function (d) { return d.id; });

        cards.enter().append('image')
            .attr('player', function (d) {
                return d.playerName;
            })
            .attr('card_id', function (d) {
                return d.id;
            })
            .attr('xlink:href', function (d) {
                // if (d.zone !== 'hand' ||
                //     d.playerName === self.tableData.playerName) {
                    return d.image_url;
                // } else {
                //     return 'cardback.png';
                // }
            })
            .attr('x', function (d, i) {
                if (!d.hasOwnProperty('x')) {
                    d.x = 0;
                }
                return d.x;
            })
            .attr('y', function (d) {
                if (!d.hasOwnProperty('y')) {
                    d.y = 0;
                }
                return d.y;
            })
            .attr('width', function (d) {
                if (!d.hasOwnProperty('width')) {
                    d.width = 223;
                }
                return d.width;
            })
            .attr('height', function (d) {
                if (!d.hasOwnProperty('height')) {
                    d.height = 310;
                }
                return d.height;
            })
            .attr('transform', function (d) {
                var imgCenterX = d.x + d.width / 2,
                    imgCenterY = d.y + d.height / 2;
                return 'rotate(' + d.rotation + ' ' +
                                   imgCenterX + ' ' +
                                   imgCenterY + ')';
            })
            .call(this.drag);
        cards.exit().remove();
        cards.sort(function (a, b) {
            return a.ordering - b.ordering;
        });
        cards.on('click.enlarge', self.drawEnlargedCard);
        cards.on('click.buttons', self.drawCardButtons);
    };
    this.drawMarkers = function () {
        var playerArray = this.tableData.getPlayerArray();
        var players = d3.select('#markers').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d, i) {
                d.rotation = 360 / playerArray.length * i;
                d.yOffset = -1 * self.tableData.tableRadius * (playerArray.length);

                return 'rotate(' + d.rotation + ' 0 ' + d.yOffset + ')';
            });
        players.exit().remove();

        var markers = players.selectAll('g')
            .data(function (d) { return d.markers; },
                  function (d) { return d.id; });
        markers.enter().append('g')
            .classed('marker', true);
        markers.exit().remove();

        markers.append('rect')
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('rx', 5)
            .attr('ry', 5);
        markers.append('text')
            .html(function (d) {
                return d.text;
            })
            .style('font-size', function (d) {
                var size = self.markerSize;
                // var size = 1 / self.scale;
                return size + 'em';
            })
            .attr('x', function (d) {
                return d.x + self.markerSize * 1.5;
                // return d.x + (2 / self.scale);
            })
            .attr('y', function (d) {
                return d.y + self.markerSize * 16;
                // return d.y + (18 / self.scale);
            });

        markers.each(function (d) {
            var textSize = d3.select(this).select('text').node().getBBox();
            d3.select(this).select('rect')
                .attr("width", textSize.width + 4)
                .attr("height", textSize.height + 4);
        });
        markers.call(self.drag);
    };
    this.drawEnlargedCard = function (d) {
        d3.event.stopPropagation(); // silence other listeners
        var originCard = d3.select(this);
        d.originCard = originCard;

        // if (self.scale < 0.8) {
            var enlargedScale = self.scale / self.cardSize,
                enlargedCardZone = d3.select('#enlargedCard'),
                player = d3.select(d.originCard[0][0].parentNode.parentNode);

            enlargedCardZone
                .attr('transform', function (d) {
                    return player.attr('transform');
                });
            var newCardData = enlargedCardZone.selectAll('image')
                    .data([d], function (d) {return d.image_url; });
            mainApp.enlargedCard = newCardData.enter().append('image');
            mainApp.enlargedCard
                .classed('enlarged', true)
                .attr('transform', function (d) {
                    var imgCenterX = d.x + d.width / 2,
                        imgCenterY = d.y + d.height / 2,
                        rotation = -1 * self.playerRotations[d.playerName].degrees;
                    return 'rotate(' + rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                })
                .attr('xlink:href', function (d) {
                    return d.image_url;
                })
                .attr('x', function (d) {
                    d.enlargedX = d.x + (d.width * enlargedScale - d.width) / (2 * enlargedScale);
                    return d.enlargedX;
                })
                .attr('y', function (d) {
                    d.enlargedY = d.y + (d.height * enlargedScale - d.height) / (2 * enlargedScale);
                    return d.enlargedY;
                })
                .attr('width', function (d) {
                    d.enlargedWidth = d.width / enlargedScale;
                    return d.enlargedWidth;
                })
                .attr('height', function (d) {
                    d.enlargedHeight = d.height / enlargedScale;
                    return d.enlargedHeight;
                });
            mainApp.enlargedCard.call(self.drag);
            newCardData.exit().remove();

            mainApp.enlargedCard.call(self.drawCardButtons);
            // mainApp.enlargedCard.on('click.enlarge', self.drawEnlargedCard);
            mainApp.enlargedCard.on('click.enlarge', function () {
                d3.event.stopPropagation();
            });
            mainApp.enlargedCard.on('click.buttons', self.drawCardButtons);
            // });
        // }
    };
    this.drawCardButtons = function (d) {
        // d3.event.stopPropagation(); // silence other listeners
        d3.select('#cardButtons').selectAll("*").remove();
        if(self.tableData.playerName === d.playerName)
        {
            // show buttons for own cards
            var card = d;
            // x/y/width/height are percentages of enlarged card width
            var buttonData = {
                rotateLeft: {
                    text: 'L',
                    x: 10,
                    y: 20,
                    width: 10,
                    height: 10
                },
                rotateRight: {
                    text: 'R',
                    x: 80,
                    y: 20,
                    width: 10,
                    height: 10
                },
                play: {
                    text: 'Play',
                    x: 30,
                    y: 20,
                    width: 40,
                    height: 10
                },
                hand: {
                    text: 'Hand',
                    x: 26,
                    y: 20,
                    width: 47,
                    height: 10
                },
                deckBottom: {
                    text: 'B',
                    x: 10,
                    y: 35,
                    width: 10,
                    height: 10
                },
                unrotate: {
                    text: 'Unrotate All',
                    x: 26,
                    y: 35,
                    width: 47,
                    height: 10
                },
                deckTop: {
                    text: 'T',
                    x: 80,
                    y: 35,
                    width: 10,
                    height: 10
                }
            },
                buttons = [];

            if (d.zone === 'hand') {
                buttons = [
                    buttonData.play,
                    buttonData.deckTop,
                    buttonData.deckBottom
                ];
            } else if (d.zone === 'inPlay') {
                buttons = [
                    buttonData.rotateLeft,
                    buttonData.hand,
                    buttonData.rotateRight,
                    buttonData.deckTop,
                    buttonData.unrotate,
                    buttonData.deckBottom
                ];
            }

            var cardButtons = d3.select('#cardButtons').selectAll('g')
                .data(buttons, function (d) { return d.text });
            cardButtons.enter().append('g')
                .classed('button', true)
                .on('click', function (d) {
                    if (d.text === 'L') {
                        self.tableData.rotateLeft(card);
                        self._drawCards();
                    } else if (d.text === 'R') {
                        self.tableData.rotateRight(card);
                        self._drawCards();
                    } else if (d.text === 'T') {
                        self.tableData.changeCardZone(card,
                                                      'deck',
                                                      'top');
                        self._drawCards();
                    } else if (d.text === 'B') {
                        self.tableData.changeCardZone(card,
                                                      'deck',
                                                      'bottom');
                        self._drawCards();
                    } else if (d.text === 'Play') {
                        self.tableData.changeCardZone(card,
                                                      'inPlay');
                        self._drawCards();
                    } else if (d.text === 'Hand') {
                        self.tableData.changeCardZone(card,
                                                      'hand');
                        self._drawCards();
                    } else if (d.text === 'Unrotate All') {
                        self.tableData.unrotatePlayerCards();
                    }
                    d3.select('#cardButtons').selectAll("*").remove();
                    // d3.select('#enlargedCard').selectAll("*").remove();
                });
            cardButtons.append('rect')
                .attr('x', function (d) {
                    return card.enlargedX + card.enlargedWidth / 100 * d.x;
                })
                .attr('y', function (d) {
                    return card.enlargedY + card.enlargedWidth / 100 * d.y;
                })
                .attr('width', function (d) {
                    return card.enlargedWidth / 100 * d.width;
                })
                .attr('height', function (d) {
                    return card.enlargedWidth / 100 * d.height;
                })
                .attr('rx', 5)
                .attr('ry', 5);
            cardButtons.append('text')
                .html(function (d) {
                    return d.text;
                })
                .style('font-size', function (d) {
                    var size = 1 / self.scale
                    return size + 'em';
                })
                .attr('x', function (d) {
                    return card.enlargedX + card.enlargedWidth / 100 * (d.x + 2);
                })
                .attr('y', function (d) {
                    return card.enlargedY + card.enlargedWidth / 100 * (d.y + 7);
                });
        }
    }
    this.drawScoreBoard = function () {
        var playerArray = this.tableData.getPlayerArray();

        var players = d3.select('#scoreBoard tbody').selectAll('tr')
            .data(playerArray,
                  function (d) {
                    return d.name;
                });
        var newPlayers = players.enter().append('tr')
            .classed('player', true);

        newPlayers.each(function (d) {
            var playerRow = d3.select(this);
            playerRow.append('td').append('button')
                .classed('playerOptionToggle', true)
                .html('▼')
                .on('click', function (d) {
                    $('#playerSelect').val(d.name);
                    $('#playerName').val(d.name);
                    $('#setRemoveBox').toggle();
                    $('#addRenameBox').toggle();
                });
            playerRow.append('td').html(function (d) { return d.name; });
            playerRow.append('td').append('span')
                .classed('handCount', true)
                .html(function () {
                    return d.zones['hand'].cards.length;
                });
            playerRow.append('td').append('button')
                .classed('decrementScore', true)
                .html('-')
                .on('click', function () {
                    d.score -= 1;
                    self.tableData.updatePlayerScore(d.name, d.score);
                });
            playerRow.append('td').append('input')
                .classed('score', true)
                .attr('size', 1)
                .on('input', function () {
                    d.score = parseInt(this.value);
                    self.tableData.updatePlayerScore(d.name, d.score);
                });
            playerRow.append('td').append('button')
                .classed('incrementScore', true)
                .html('+')
                .on('click', function () {
                    d.score += 1;
                    self.tableData.updatePlayerScore(d.name, d.score);
                });
        });

        players.each(function (d) {
            var row = d3.select(this);
            row.select('.score')
                .property('value', d.score);

            row.select('.handCount')
                .html(d.zones['hand'].cards.length);
            });

        players.exit().remove();
    };
    this.drawPlayerSelect = function () {
        var playerArray = this.tableData.getPlayerArray();
        playerArray.unshift({name: ''});

        var players = d3.select('#playerSelect').selectAll('option')
            .data(playerArray,
                  function (d) {
                    return d.name;
                });
        var newPlayers = players.enter().append('option')
            .html(function (d) {
                    return d.name;
                })
            .property('value',
                  function (d) {
                    return d.name;
                });

        players.exit().remove();
    };
    this.drawDeckList = function () {
        var deck = this.tableData.player.zones['deck'].cards,
            sortedDeck = [];

        for (var i = 0; i < deck.length; i++) {
            sortedDeck.push({
                    type: deck[i].type,
                    zone: deck[i].zone,
                    id: deck[i].id,
                    image_url: deck[i].image_url,
                    name: deck[i].name,
                    x: deck[i].x,
                    y: deck[i].y,
                    playerName: deck[i].playerName,
                    rotation: deck[i].rotation,
                    ordering: deck[i].ordering
                });
        }
        sortedDeck.sort(function (a, b) {
            // if (a.id < b.id) {
            if (a.name < b.name) {
                return -1;
            // } else if (a.id > b.id) {
            } else if (a.name > b.name) {
                return 1;
            } else {
                return 0;
            }
        });

        var cards = d3.select('#deckList').selectAll('option')
            .data(sortedDeck, function (d) {
                   return d.playerName + d.id;
               });
        cards.enter().append('option')
            .attr('value', function (d) {
                return d.id;
            })
            .html(function (d) {
                // return d.id;
                return d.name;
            });

        cards.exit().remove();
    };
    this.drawMarkerHistory = function () {
        // populate marker history with current player's markers
        if (this.tableData.markerHistory.length === 0) {
            for (var i = 0; i < this.tableData.player.markers.length; i++) {
                var marker = this.tableData.player.markers[i],
                    textFound = false;
                for (var j = 0; j < this.tableData.markerHistory.length; j++) {
                    if(this.tableData.markerHistory[j].text === marker.text) {
                        this.tableData.markerHistory[j].count += 1;
                        textFound = true;
                        break;
                    }
                }
                if (!textFound) {
                    this.tableData.markerHistory.push({
                        text: marker.text,
                        count: 1
                    });
                }
            }
            this.tableData.markerHistory.sort(function (a, b) {
                return b.count - a.count;
            });
        }
        var history = d3.select('#markerHistory').selectAll('tr')
            .data(this.tableData.markerHistory, function (d) {
                   return d.text;
               });
        var newHistory = history.enter().append('tr');

        newHistory.each(function (d) {
            var playerRow = d3.select(this);
            playerRow.append('td').html(function (d) { return d.text; });
            playerRow.append('td').append('button')
                .classed('insertMarker', true)
                .html('+')
                .on('click', function () {
                    self.tableData.createMarker(d.text);
                });
        });

        history.exit().remove();
        history.order();
    };
    this.resizeSVG = function () {
        // http://stackoverflow.com/a/16265661/225730
        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        self.svgWidth = (w.innerWidth || e.clientWidth || g.clientWidth) - 2;
        self.svgHeight = (w.innerHeight || e.clientHeight || g.clientHeight) - 2;

        self.svg.attr('width', self.svgWidth)
                   .attr('height', self.svgHeight);
        // check that map is initialized, which it should be
        if (self.scale !== 0) {
            self.viewBox.left -= (self.svgWidth / self.scale - self.viewBox.width) / 2;
            self.viewBox.top -= (self.svgHeight / self.scale - self.viewBox.height) / 2;
            self.viewBox.width = self.svgWidth / self.scale;
            self.viewBox.height = self.svgHeight / self.scale;
            self.svg.attr('viewBox', function() {
                return self.viewBox.left + ' ' +
                       self.viewBox.top + ' ' +
                       self.viewBox.width + ' ' +
                       self.viewBox.height;
            });
        }
    };
    this.applyViewBox = function () {
        self.svg.attr('viewBox', function() {
            return self.viewBox.left + ' ' +
                   self.viewBox.top + ' ' +
                   self.viewBox.width + ' ' +
                   self.viewBox.height;
        });
    };
    this.startPan = function (pageX, pageY) {
        this.startTranslation = {
            x: pageX,
            y: pageY
        };
        this.viewBoxStart = {
            left: this.viewBox.left,
            top: this.viewBox.top
        };
    };
    this.continuePan = function (pageX, pageY) {
        var mouseDelta = {
            x: pageX - this.startTranslation.x,
            y: pageY - this.startTranslation.y};
        this.viewBox.left = this.viewBoxStart.left - mouseDelta.x / this.scale;
        this.viewBox.top = this.viewBoxStart.top - mouseDelta.y / this.scale;
        self.applyViewBox();
    };
    this.endPan = function (pageX, pageY) {
        this.lastTranslation = {
            x: pageX - this.x - this.startTranslation.x,
            y: pageY - this.y - this.startTranslation.y
        };
    };
    this.zoomIn = function (pageX, pageY) {
        var zoomFactor = 1.35;
        this.scale *= zoomFactor;
        this.viewBox.left += (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top += (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.applyViewBox();
        // self.scaleSelectedCard();
    };
    this.zoomOut = function (pageX, pageY) {
        var zoomFactor = 1 / 1.35;
        this.scale *= zoomFactor;
        this.viewBox.left = this.viewBox.left + (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top = this.viewBox.top + (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.applyViewBox();
        // self.scaleSelectedCard();
    };
    this.centerOn = function (x, y) {
        this.viewBox.left = x - self.viewBox.width / 2;
        this.viewBox.top = y - self.viewBox.height / 2;
        this.applyViewBox();
    };
    this.getSVGCoordinates = function (pageX, pageY) {
        return {
            x: Math.round(this.viewBox.left + pageX / this.scale),
            y: Math.round(this.viewBox.top + pageY / this.scale)
        };
    };
}

function MainApp() {
    'use strict';
    var self = this;
    this.playAreaSVG = null;
    this.coordDisplay = null;
    this.enlargedCard = null;
    this.mouseIsDown = false;
    this.sleeping = true;
    this.noChangesCount = 0;

    // cache data when feature is clicked
    this.infoCache = {};

    this.init = function () {
        this.playAreaSVG = new PlayAreaSVG();
        this.playAreaSVG.init();
        this.coordDisplay = $('#coordDisplay');
        this.enlargedCard = $('#enlargedCard');
        this.updateFromServer();
    };

    this.updateFromServer = function () {
        if (this.playAreaSVG.tableData.room !== null
            & this.sleeping) {
            this.sleeping = false;
            $.post('tableState.php',
                    {
                        action: 'get_state',
                        room: this.playAreaSVG.tableData.room,
                        last_update_id: this.playAreaSVG.tableData.lastUpdateId
                    },
                    function (data) {
                        // don't update while something is being drug
                        if (self.playAreaSVG.dragInProgress) {
                            self.sleeping = true;
                        } else {
                            if (!data.hasOwnProperty('no_changes') &&
                                !self.playAreaSVG.dragInProgress) {
                                self.noChangesCount = 0;
                                self.playAreaSVG.tableData.processRoomState(data);
                                self.playAreaSVG.drawTable();
                                self.playAreaSVG._drawCards();
                                self.playAreaSVG.drawMarkers();
                                self.playAreaSVG.drawScoreBoard();
                                self.playAreaSVG.drawPlayerSelect();
                            } else {
                                self.noChangesCount += 1;
                            }
                            // sleep after 20 minutes of inactivity
                            // wake by dragging a card
                            // XXX mention all this somewhere on the page
                            self.sleeping = true;
                            if (self.noChangesCount < 20) {
                                self.updateFromServer();
                            }
                        }
                    },
                    'json')
            .fail(function () {
                self.sleeping = true;
                self.updateFromServer();
            });
        }
    };
    this.setCoordDisplay = function (x, y) {
        this.coordDisplay.html('x: ' + x + ' y: ' + y);
    };
    this.startMouse = function (pageX, pageY) {
        var mousePos;
        // check this in case the cursor was released outside the document
        // in which case the event would have been missed
        if (this.mouseIsDown) {
            this.playAreaSVG.endPan(pageX, pageY);
        }
        this.mouseIsDown = true;
        this.playAreaSVG.startPan(pageX, pageY);
    };
    this.moveMouse = function (pageX, pageY) {
        var mousePos = {x: 0, y: 0},
            nearbyFeature = null;
        // pan the map
        if (this.mouseIsDown) {
            this.playAreaSVG.continuePan(pageX, pageY);
        // update cursor coordinates
        } else {
            mousePos = this.playAreaSVG.getSVGCoordinates(pageX,
                                                          pageY);
            this.setCoordDisplay(mousePos.x, mousePos.y);
        }
    };
    this.endMouse = function (pageX, pageY) {
        // check that the click started on the canvas
        if (this.mouseIsDown) {
            this.mouseIsDown = false;
            this.playAreaSVG.endPan(pageX, pageY);
        }
    };
}


$(document).ready(function initialSetup() {
    'use strict';
    mainApp = new MainApp();
    mainApp.init();

    $('#playAreaSVG').on({
        'mousedown': function canvasMouseButtonPressed(event) {
            mainApp.startMouse(event.pageX, event.pageY);
        },
        // provided by jquery.mousewheel.js
        'mousewheel': function canvasMouseScrolled(event) {
            if (event.deltaY > 0) {
                mainApp.playAreaSVG.zoomIn(event.pageX,
                                         event.pageY);
            } else {
                mainApp.playAreaSVG.zoomOut(event.pageX,
                                          event.pageY);
            }
        },
        'click': function hideButtons(event) {
            d3.select('#cardButtons').selectAll("*").remove();
            d3.select('#enlargedCard').selectAll("*").remove();
        }
    });
    $(document.body).on({
        'mousemove': function bodyMouseover(event) {
            mainApp.moveMouse(event.pageX, event.pageY);
        },
        'mouseup': function bodyMouseup(event) {
            mainApp.endMouse(event.pageX, event.pageY);
        },
        'mouseleave': function bodyMouseup(event) {
            mainApp.endMouse(event.pageX, event.pageY);
        }
    });

    $('#updateData').on('click', mainApp.playAreaSVG.tableData.update);
    $('#zoomOut').on('click', function zoomOut() {
        mainApp.playAreaSVG.zoomOut(mainApp.playAreaSVG.svgWidth / 2,
                                  mainApp.playAreaSVG.svgHeight / 2);
    });
    $('#zoomIn').on('click', function zoomIn() {
        mainApp.playAreaSVG.zoomIn(mainApp.playAreaSVG.svgWidth / 2,
                                  mainApp.playAreaSVG.svgHeight / 2);
    });

    $('#deckListBox').hide();
    $('#showDeckList').on('click', function showLoadDeckForm() {
        $('#deckListBox').toggle();
    });
    $('#loadDeckForm').hide();
    $('#loadDeckHeader').on('click', function showLoadDeckForm() {
        $('#loadDeckForm').toggle();
        if ($.trim($(this).text()) == 'Load') {
            $(this).text('Hide');
        } else {
            $(this).text('Load');
        }
    });
    $('#settingsBox').hide();
    $('#settingsHeader').on('click', function showLoadDeckForm() {
        $('#settingsBox').toggle();
    });
    $('#settingsBox').hide();
    $('#markerHistoryHeader').on('click', function showLoadDeckForm() {
        $('#markerHistory').toggle();
    });
    $('#loadDeck').on('click', function passCSVToTableData() {
        var deckCSV = $('#deckCSV').val();
        mainApp.playAreaSVG.tableData.loadDeckFromCSV(deckCSV);
        $('#loadDeckForm').hide();
    });
    $('#setRemoveBox').hide();
    $('#shuffleDeck').on('click', function shuffleDeck() {
        mainApp.playAreaSVG.tableData.shuffleDeck();
    });
    $('#drawCard').on('click', function drawCard() {
        mainApp.playAreaSVG.drawCard();
    });
    $('#drawSelectedCard').on('click', function drawCard() {
        mainApp.playAreaSVG.drawSelectedCard();
    });
    $('#setRoom').on('click', function setRoom() {
        mainApp.playAreaSVG.tableData.setRoom($('#roomName').val());
    });
    $('#setPlayer').on('click', function setPlayer() {
        var selectedPlayer = d3.select('#playerSelect').property('value');
        $('#playerName').val(selectedPlayer);
        mainApp.playAreaSVG.tableData.setPlayer(selectedPlayer);
        mainApp.playAreaSVG.drawTable();
        mainApp.playAreaSVG._drawCards();
        mainApp.playAreaSVG.drawMarkers();
        mainApp.playAreaSVG.drawDeckList();
        mainApp.playAreaSVG.drawScoreBoard();
        mainApp.playAreaSVG.drawMarkerHistory();
    });
    $('#playerName').on('input', function addPlayer() {
        // can rename if player is set
        if (mainApp.playAreaSVG.tableData.playerName !== '') {
            $('#renamePlayer').attr('disabled', false);
        } else {
            $('#renamePlayer').attr('disabled', 'disabled');
        }
        // can't rename if new name is already in use, but can select that player
        if (mainApp.playAreaSVG.tableData.players.hasOwnProperty($('#playerName').val())) {
            $('#renamePlayer').attr('disabled', 'disabled');
            $('#addPlayer').text('Select');
        } else {
            $('#addPlayer').text('Add');
        }
    });
    $('#addPlayer').on('click', function addPlayer() {
        var newPlayer = $('#playerName').val();
        mainApp.playAreaSVG.tableData.addPlayer(newPlayer);
        mainApp.playAreaSVG.tableData.setPlayer(newPlayer);
        mainApp.playAreaSVG.drawTable();
        mainApp.playAreaSVG._drawCards();
        mainApp.playAreaSVG.drawMarkers();
        mainApp.playAreaSVG.drawDeckList();
        mainApp.playAreaSVG.drawPlayerSelect();
        mainApp.playAreaSVG.drawScoreBoard();
        d3.select('#playerSelect').property('value', newPlayer);
    });
    $('#removePlayer').on('click', function removePlayer() {
        var playerName = $('#playerSelect').val();
        mainApp.playAreaSVG.tableData.dbRemovePlayer(playerName);
        mainApp.playAreaSVG.drawTable();
        mainApp.playAreaSVG._drawCards();
        mainApp.playAreaSVG.drawMarkers();
        mainApp.playAreaSVG.drawDeckList();
        mainApp.playAreaSVG.drawScoreBoard();
        $('#setRemoveBox').toggle();
        $('#addRenameBox').toggle();
    });
    $('#renamePlayer').on('click', function renamePlayer() {
        mainApp.playAreaSVG.tableData.renamePlayer($('#playerName').val());
        mainApp.playAreaSVG._drawCards();
        mainApp.playAreaSVG.drawMarkers();
        mainApp.playAreaSVG.drawDeckList();
        $('#setRemoveBox').toggle();
        $('#addRenameBox').toggle();
    });
    $('#setTableImageUrl').on('click', function setTableImageUrl() {
        mainApp.playAreaSVG.tableData.setTableImageUrl($('#tableImageUrl').val());
        mainApp.playAreaSVG.drawTable();
    });
    $('#setTableScaleAndDistance').on('click', function setTableRadius() {
        mainApp.playAreaSVG.tableData.setTableImageScaleAndDistance(
            $('#tableImageScale').val(),
            $('#tableDistance').val());
        mainApp.playAreaSVG.drawTable();
    });
    $('#createMarker').on('click', function createMarker() {
        mainApp.playAreaSVG.tableData.createMarker($('#markerText').val());
        mainApp.playAreaSVG.drawMarkers();
        mainApp.playAreaSVG.drawMarkerHistory();
    });
    $('#resetPlayer').on('click', function resetPlayer() {
        mainApp.playAreaSVG.tableData.resetPlayer();
        mainApp.playAreaSVG._drawCards();
        mainApp.playAreaSVG.drawMarkers();
        mainApp.playAreaSVG.drawDeckList();
    });
    $('#setMarkerSize').on('click', function setMarkerSize() {
        mainApp.playAreaSVG.markerSize = $('#markerSize').val();
        mainApp.playAreaSVG.drawMarkers();
    });
    $('#setCardSize').on('click', function setCardSize() {
        mainApp.playAreaSVG.cardSize = $('#cardSize').val();
        mainApp.playAreaSVG.drawMarkers();
    });
    $('#setDeckDealPoint').on('click', function setCardSize() {
        mainApp.playAreaSVG.tableData.setDeckDealPoint($('#deckDealX').val(),
                                                       $('#deckDealY').val());
    });
});