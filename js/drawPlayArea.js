/*global $ */
var mainApp;

function TableData() {
    'use strict';
    var self = this;
    this.room = null;
    this.player = { id: null,
                    name: null,
                    backgroundImageUrl: null,
                    zones: [] };
    this.players = {};
    this.decks = {};
    this.tableRadius = 750;
    this.markerHistory = [];

    this.setRoom = function (roomName) {
        this.room = roomName;
        $.post('tableState.php',
                {
                    action: 'set_room',
                    roomName: this.room
                });
    };
    this.setPlayer = function (playerId) {
        // this might not find a newly added or renamed player, but
        // setPlayer will get called again after the player update arrives
        for (var i = 0; i < this.players.length; i++) {
            if(this.players[i].id == playerId) {
                this.player = this.players[i];
                $('#deckBox').show();
                $('#createMarkerBox').show();
                break;
            }
        }
        $('#tableImageUrl').val(this.player.backgroundImageUrl);
        $('#tableImageScale').val(this.player.backgroundImageScale);

        // rearrange player array to start with the selected player
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].id === playerId) {
                var frontPlayers = this.players.splice(0, i);
                this.players = this.players.concat(frontPlayers);
                break;
            }
        }
    };
    this.addPlayer = function (playerName) {
        if (playerName !== '') {
            $.post('tableState.php',
                    {
                        action: 'add_player',
                        playerName: playerName
                    });
        }
    };
    this.renamePlayer = function (playerId, newName) {
        $.post('tableState.php',
                {
                    action: 'update_player_name',
                    playerId: playerId,
                    newName: newName,
                });
    };
    this.setTableImageUrl = function (tableImageUrl) {
        if (tableImageUrl !== this.player.imageUrl) {
            $.post('tableState.php',
                    {
                        action: 'update_table_image_url',
                        playerId: this.player.id,
                        imageUrl: tableImageUrl,
                    });
        }
    };
    this.setTableImageScaleAndDistance = function (imageScale, imageDistance) {
        $.post('tableState.php',
                {
                    action: 'update_table_image_scale_and_distance',
                    playerId: this.player.id,
                    imageScale: imageScale,
                    imageDistance: imageDistance,
                });
    };
    this.setDeckDealPoint = function (x, y) {
        $.post('tableState.php',
                {
                    action: 'set_deck_deal_point',
                    playerId: this.player.id,
                    x: x,
                    y: y,
                });
    };
    this.updatePlayerScore = function (id, score) {
        $.post('tableState.php',
                {
                    action: 'update_player_score',
                    playerId: id,
                    score: score
                });
    };
    this.updateCardGeometry = function (card) {
        $.post('tableState.php',
                {
                    action: 'update_card_geometry',
                    id: card.id,
                    x: card.x,
                    y: card.y,
                    rotation: card.rotation,
                    ordering: card.ordering
                });
    };
    this.updateMarkerGeometry = function (marker) {
        $.post('tableState.php',
                {
                    action: 'update_marker_geometry',
                    id: marker.id,
                    x: marker.x,
                    y: marker.y
                });
    };
    this.removePlayer = function (playerId) {
        $.post('tableState.php',
                {
                    action: 'remove_player',
                    playerId: playerId
                });
    };

    this.processRoomState = function (newData) {
        // replace data
        this.players = newData.results.players;
        this.decks = newData.results.decks;

        this.setPlayer(this.player.id);
    };

    this.addDeckFromCSV = function (deckName, isShared, deckCSV) {
        var cardsWithCounts = $.csv.toObjects(deckCSV);

        var cardNames = [],
            cardImageUrls = [],
            ownerId = null;
        if (!isShared) {
            ownerId = this.player.id;
        };
        for (var i = 0; i < cardsWithCounts.length; i++) {
            var card = cardsWithCounts[i];
            for (var j = 0; j < card.count; j++) {
                cardNames.push(card.name);
                cardImageUrls.push(card.image_url);
            }
        }

        $.post('tableState.php',
                {
                    action: 'add_deck',
                    deckName: deckName,
                    ownerId: ownerId,
                    'cardNames[]': cardNames,
                    'cardImageUrls[]': cardImageUrls
                });
    };
    this.createMarker = function (text) {
        if (this.player.id !== null) {
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

            $.post('tableState.php',
                    {
                        action: 'add_marker',
                        playerId: this.player.id,
                        text: text,
                        x: this.player.deckDealXPos,
                        y: this.player.deckDealYPos,
                        color: null
                    });
        }
    };
    this.resetPlayer = function () {
        $.post('tableState.php',
                {
                    action: 'reset_player',
                    playerId: this.player.id,
                });
        this.shuffleDeck();
    };
    this.shuffleDeck = function (deckId) {
        $.post('tableState.php',
                {
                    action: 'shuffle_deck',
                    deckId: deckId
                });
    };
    this.returnCardsToDeck = function (deckId) {
        $.post('tableState.php',
                {
                    action: 'return_cards_to_deck',
                    deckId: deckId
                });
    };
    this.removeDeck = function (deckId) {
        $.post('tableState.php',
                {
                    action: 'remove_deck',
                    deckId: deckId
                });
    };
    this.setDeckSharedStatus = function (deckId, isShared) {
        var ownerId = null;
        if (!isShared) {
            ownerId = this.player.id;
        }
        $.post('tableState.php',
                {
                    action: 'update_deck_owner',
                    deckId: deckId,
                    ownerId: ownerId
                });
    };
    this.drawCard = function (deckId) {
        $.post('tableState.php',
                {
                    action: 'draw_card',
                    deckId: deckId,
                    playerId: this.player.id
                });
    };
    this.drawCardById = function (cardId) {
        this.updateCardZone(cardId, 'hand');
    };
    this.updateCardZone = function (cardId, targetZone, topOrBottom) {
        if (typeof(topOrBottom) === 'undefined') {
            topOrBottom = 'top';
        }
        var playerId = null;
        if (targetZone !== 'deck') {
            playerId = this.player.id;
        }
        $.post('tableState.php',
                {
                    action: 'update_card_zone',
                    cardId: cardId,
                    playerId: playerId,
                    zone: targetZone,
                    topOrBottom: topOrBottom
                });
    };
    this.updateCardRotation = function (cardId, rotation) {
        $.post('tableState.php',
                {
                    action: 'update_card_rotation',
                    id: cardId,
                    rotation: rotation
                });
    };
    this.rotateLeft = function (card) {
        card.rotation = (card.rotation - 90) % 360;
        this.updateCardRotation(card.id, card.rotation);
    };
    this.rotateRight = function (card) {
        card.rotation = (card.rotation + 90) % 360;
        this.updateCardRotation(card.id, card.rotation);
    };
    this.unrotatePlayerCards = function () {
        $.post('tableState.php',
                {
                    action: 'unrotate_player_cards',
                    playerId: this.player.id
                });
    };
    // get the decks owned by this.player and shared decks
    this.getDeckArray = function () {
        var deckArray = [],
            i = 0;
        for (var i = 0; i < this.decks.length; i++) {
            var deck = this.decks[i];
            // playerId is null for shared decks
            if (deck.playerId == this.player.id ||
                deck.playerId == null) {
                deckArray.push(deck);
            }
        }
        return deckArray;
    };
    this.playerExists = function (playerName) {
        var playerExists = false;
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].name === playerName) {
                playerExists = true;
                break;
            }
        }
        return playerExists;
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

    this.deckActionTargetId = null;
    this.playerActionTargetId = null;
    this.deckActionTargetRow = null;
    this.playerActionTargetRow = null;

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
            drugObject = d3.select('[player="' + d.playerId + '"]' +
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
                        rotation = -1 * self.playerRotations[d.playerId].degrees;
                    return 'rotate(' + rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                });

            // move source card beneath enlarged
            drugObject = d3.select('[player="' + d.playerId + '"]' +
                                   '[card_id="' + d.id + '"]')
        }

        if (drugObject.classed('marker')) {
            var markerRect = drugObject.select('rect'),
                markerText = drugObject.select('text');
            markerRect.attr('x', d.x)
                .attr('y', d.y);
            markerText.attr('x', d.x + self.markerSize * 1.5)
                .attr('y', d.y + self.markerSize * 14);
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
            if (drugObject.classed('marker')) {
                self.tableData.updateMarkerGeometry(d);
            } else {
                self.tableData.updateCardGeometry(d);
            }
        }
        mainApp.updateFromServer();
    });
    this.drawTable = function () {
        var playerArray = this.tableData.players;
        var players = d3.select('#tableGraphic').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g').append('image');
        players
            .attr('transform', function (d, i) {
                var rotation = 360 / playerArray.length * i,
                    yOffset = -1 * self.tableData.tableRadius * (playerArray.length);

                return 'rotate(' + rotation + ' 0 ' + yOffset + ')';
            });
        players.select('image')
            .attr('xlink:href', function (d) {
                // this will be a broken link for unset players
                return d.backgroundImageUrl;
            })
            .style('display', function (d) {
                // this is a crude filter for unset values (which will be '0')
                if (d.backgroundImageUrl != null) {
                    return ""
                } else {
                    return "none"
                }
            })
            .attr('x', function (d) {
                return -2250 * d.backgroundImageScale;
            })
            .attr('y', function (d) {
                return -1200 * d.backgroundImageScale;
            })
            .attr('width', function (d) {
                return 4500 * d.backgroundImageScale;
            })
            .attr('height', function (d) {
                return 2400 * d.backgroundImageScale;
            });
        players.exit().remove();
    };
    this.drawCards = function () {
        var playerArray = this.tableData.players;
        var players = d3.select('#players').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d, i) {
                var rotation = 360 / playerArray.length * i,
                    yOffset = -1 * self.tableData.tableRadius * (playerArray.length);
                self.playerRotations[d.id] = {
                    degrees: rotation,
                    radians: rotation  * (Math.PI / 180)};

                return 'rotate(' + rotation + ' 0 ' + yOffset + ')';
            });
        players.exit().remove();

        var zones = players.selectAll('g')
            .data(function (d) {
                    var zones = [];
                    if (d.id == self.tableData.player.id) {
                        zones = d.zones;
                    } else {
                        // don't draw other player's hands
                        for (var zone in d.zones) {
                            if (zone != 'hand') {
                                    zones.push({
                                        name: d.zones[zone].name,
                                        cards: d.zones[zone].cards});
                            }
                        }
                    }
                    return zones;
                },
                function (d) { return d.name; });
        zones.enter().append('g')
            .classed('cards_in_hand',
                    function (d) { return d.name === 'hand'; });
        zones.exit().remove();

        var cards = zones.selectAll('image')
            .data(function (d) {
                    return d.cards;
                },
                function (d) {
                    return d.id;
                });

        cards.enter().append('image')
            .attr('player', function (d) {
                return d.playerId;
            })
            .attr('card_id', function (d) {
                return d.id;
            })
            .attr('xlink:href', function (d) {
                if (d.zone !== 'inPlayFaceDown' ||
                    d.playerId === self.tableData.player.id) {
                    return d.imageUrl;
                } else {
                    return 'cardback.png';
                }
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
        var playerArray = this.tableData.players;
        var players = d3.select('#markers').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d, i) {
                var rotation = 360 / playerArray.length * i,
                    yOffset = -1 * self.tableData.tableRadius * (playerArray.length);

                return 'rotate(' + rotation + ' 0 ' + yOffset + ')';
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
                return d.y + self.markerSize * 14;
                // return d.y + (18 / self.scale);
            });

        markers.each(function (d) {
            var textSize = d3.select(this).select('text').node().getBBox();
            d3.select(this).select('rect')
                .attr("width", textSize.width + self.markerSize * 3.5)
                .attr("height", textSize.height - self.markerSize * 1.2);
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
                    .data([d], function (d) {return d.imageUrl; });
            mainApp.enlargedCard = newCardData.enter().append('image');
            mainApp.enlargedCard
                .classed('enlarged', true)
                .attr('transform', function (d) {
                    var imgCenterX = d.x + d.width / 2,
                        imgCenterY = d.y + d.height / 2,
                        rotation = -1 * self.playerRotations[d.playerId].degrees;
                    return 'rotate(' + rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                })
                .attr('xlink:href', function (d) {
                    return d.imageUrl;
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
        if(self.tableData.player.id === d.playerId)
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
                playFaceDown: {
                    text: 'Play Face Down',
                    x: 19,
                    y: 50,
                    width: 62,
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
                    buttonData.playFaceDown,
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
                    buttonData.deckBottom,
                    buttonData.playFaceDown,
                ];
            } else if (d.zone === 'inPlayFaceDown') {
                buttons = [
                    buttonData.rotateLeft,
                    buttonData.play,
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
                    } else if (d.text === 'R') {
                        self.tableData.rotateRight(card);
                    } else if (d.text === 'T') {
                        self.tableData.updateCardZone(card.id,
                                                      'deck',
                                                      'top');
                    } else if (d.text === 'B') {
                        self.tableData.updateCardZone(card.id,
                                                      'deck',
                                                      'bottom');
                    } else if (d.text === 'Play') {
                        self.tableData.updateCardZone(card.id,
                                                      'inPlay');
                    } else if (d.text === 'Play Face Down') {
                        self.tableData.updateCardZone(card.id,
                                                      'inPlayFaceDown');
                    } else if (d.text === 'Hand') {
                        self.tableData.updateCardZone(card.id,
                                                      'hand');
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
        var playerArray = this.tableData.players;

        var players = d3.select('#scoreBoard tbody').selectAll('tr')
            .data(playerArray,
                  function (d) {
                    return d.id;
                });
        var newPlayers = players.enter().append('tr')
            .classed('player', true);

        newPlayers.each(function (d) {
            var playerRow = d3.select(this);
            playerRow.append('td')
                .classed('name', true)
                .html(function (d) {
                    return d.name;
                });
            playerRow.append('td').append('span')
                .classed('cardCount', true);
            playerRow.append('td').append('button')
                .classed('decrementScore', true)
                .html('-')
                .on('click', function (d) {
                    d.score -= 1;
                    self.tableData.updatePlayerScore(d.id, d.score);
                });
            playerRow.append('td').append('input')
                .classed('score', true)
                .attr('size', 1)
                .on('input', function (d) {
                    d.score = parseInt(this.value);
                    self.tableData.updatePlayerScore(d.id, d.score);
                });
            playerRow.append('td').append('button')
                .classed('incrementScore', true)
                .html('+')
                .on('click', function (d) {
                    d.score += 1;
                    self.tableData.updatePlayerScore(d.id, d.score);
                });
            playerRow.append('td').append('button')
                .html('▼')
                .on('click', function (d) {
                    d3.event.stopPropagation();
                    // can't just assign 'd' because it is statically fixed
                    // by the each() so the cards won't update
                    self.playerActionTargetId = d.id;
                    self.playerActionTargetRow = playerRow;
                    // move box on-screen
                    self.hideActionBoxes();
                    d3.select('#playerActionBox')
                        .style('left', d3.event.pageX + 'px')
                        .style('top', d3.event.pageY + 'px');
                    // $('#playerName').val(d.name);
                    // $('#playerName').trigger('input');
                });
        });

        players.each(function (d) {
            var row = d3.select(this);
            row.select('.score')
                .attr('value', d.score);

            row.select('.cardCount')
                .html(function (d) {
                    var cardCount = 0;
                    for (var i = 0; i < d.zones.length; i++) {
                        if(d.zones[i].name === 'hand') {
                            cardCount = d.zones[i].cards.length;
                            break;
                        }
                    }
                    return cardCount;
                });
        });
        players.exit().remove();
    };
    this.drawDeckList = function () {
        var deckArray = this.tableData.getDeckArray();

        var decks = d3.select('#deckTable tbody').selectAll('tr')
            .data(deckArray, function (d) {
                return d.id;
            });
        var newDecks = decks.enter().append('tr');

        newDecks.each(function (d) {
            var deckRow = d3.select(this);
            deckRow.append('td')
                .classed('name', true)
                .html(function (d) {
                    return d.name;
                });
            deckRow.append('td').append('span')
                .classed('cardCount', true);
            deckRow.append('td').append('button')
                .classed('drawCardFromDeck', true)
                .html('Draw')
                .on('click', function () {
                    d3.select('#enlargedCard').selectAll("*").remove();
                    self.tableData.drawCard(d.id);
                });
            deckRow.append('td').append('button')
                .html('▼')
                .on('click', function (d) {
                    d3.event.stopPropagation();
                    // can't just assign 'd' because it is statically fixed
                    // by the each() so the cards won't update
                    self.deckActionTargetId = d.id;
                    self.deckActionTargetRow = deckRow;
                    if (d.playerId === null) {
                        d3.select('#deckIsShared input')
                            .property('checked', 'checked')
                    } else {
                        d3.select('#deckIsShared input')
                            .property('checked', '')
                    }
                    // move box on-screen
                    self.hideActionBoxes();
                    d3.select('#deckActionBox')
                        .style('left', d3.event.pageX + 'px')
                        .style('top', d3.event.pageY + 'px');
                });
        });

        decks.each(function (d) {
            var row = d3.select(this);

            row.select('.cardCount')
                .html(function (d) {
                    return d.cards.length;
                });
        });
        decks.exit().remove();
    };
    this.drawCardList = function () {
        if (this.deckActionTargetId !== null) {
            var sortedDeck = [];
            for (var i = 0; i < self.tableData.decks.length; i++) {
                if(self.tableData.decks[i].id === this.deckActionTargetId) {
                    cards = self.tableData.decks[i].cards;
                    break;
                }
            }

            var cards = d3.select('#deckList').selectAll('option')
                .data(cards, function (d) {
                       return d.id;
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

            cards.sort(function (a, b) {
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
        }
    };
    this.drawMarkerHistory = function () {
        // populate marker history with current player's markers
        if (this.tableData.markerHistory.length === 0 &&
            this.tableData.player.id !== null) {
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
        history.sort(function (a, b) {
                return b.count - a.count;
        });
    };
    this.hideActionBoxes = function () {
        d3.selectAll('.actionBox').each(function () {
            d3.select(this)
                .style('left', '-1000px')
                .style('top', '-1000px');
        })
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
        var zoomFactor = 1.1;
        this.scale *= zoomFactor;
        this.viewBox.left += (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top += (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.applyViewBox();
        // self.scaleSelectedCard();
    };
    this.zoomOut = function (pageX, pageY) {
        var zoomFactor = 1 / 1.1;
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
        this.updateFromServer(true);
    };

    this.updateFromServer = function (initial) {
        if (this.playAreaSVG.tableData.room !== null
            & this.sleeping) {
            this.sleeping = false;
            var args = {
                action: 'get_state',
                roomName: this.playAreaSVG.tableData.room
            }
            if (initial) {
                args.lastUpdateId = -1;
            }
            $.post('tableState.php',
                    args,
                    function (data) {
                        // don't update while something is being drug
                        if (self.playAreaSVG.dragInProgress) {
                            self.sleeping = true;
                        } else {
                            if (!data.hasOwnProperty('no_changes') &&
                                !self.playAreaSVG.dragInProgress) {
                                self.noChangesCount = 0;
                                self.playAreaSVG.tableData.processRoomState(data);
                                self.redraw();
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
    this.redraw = function () {
        self.playAreaSVG.drawTable();
        self.playAreaSVG.drawCards();
        self.playAreaSVG.drawMarkers();
        self.playAreaSVG.drawScoreBoard();
        self.playAreaSVG.drawDeckList();
        self.playAreaSVG.drawCardList();
        self.playAreaSVG.drawMarkerHistory();
    }
    this.setCoordDisplay = function (x, y) {
        this.coordDisplay.html('x: ' + x + ' y: ' + y);
    };
    this.startMouse = function (pageX, pageY) {
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

    $('#deckBox').hide();
    $('#createMarkerBox').hide();
    $('#deckListBox').hide();
    $('#showDeckList').on('click', function showLoadDeckForm() {
        $('#deckListBox').toggle();
    });
    $('#addPlayerBox').hide();
    $('#addPlayerHeader').on('click', function showLoadDeckForm() {
        $('#addPlayerBox').toggle();
        if ($.trim($(this).text()) == 'Add Player') {
            $(this).text('Hide Form');
        } else {
            $(this).text('Add Player');
        }
    });
    $('#addPlayer').on('click', function passCSVToTableData() {
        var playerName = $('#playerName').val();
        mainApp.playAreaSVG.tableData.addPlayer(playerName);
        $('#addPlayerBox').hide();
    });

    $('#addDeckBox').hide();
    $('#addDeckHeader').on('click', function showLoadDeckForm() {
        $('#addDeckBox').toggle();
        if ($.trim($(this).text()) == 'Add Deck') {
            $(this).text('Hide Form');
        } else {
            $(this).text('Add Deck');
        }
    });
    $('#addDeck').on('click', function passCSVToTableData() {
        var deckName = $('#deckName').val(),
            isShared = $('#newDeckIsShared').prop('checked'),
            deckCSV = $('#deckCSV').val();
        mainApp.playAreaSVG.tableData.addDeckFromCSV(deckName,
                                                     isShared,
                                                     deckCSV);
        $('#addDeckBox').hide();
    });

    $('#settingsBox').hide();
    $('#settingsHeader').on('click', function showLoadDeckForm() {
        $('#settingsBox').toggle();
    });
    $('#settingsBox').hide();
    $('#markerHistoryHeader').on('click', function showLoadDeckForm() {
        $('#markerHistory').toggle();
    });

    $('#drawSelectedCard').on('click', function drawCard() {
        var selectedCardId = d3.select('#deckList').property('value');
        mainApp.playAreaSVG.tableData.drawCardById(selectedCardId);
    });

    $('#setRoom').on('click', function setRoom() {
        mainApp.playAreaSVG.tableData.setRoom($('#roomName').val());
    });

    $('#setTableImageUrl').on('click', function setTableImageUrl() {
        mainApp.playAreaSVG.tableData.setTableImageUrl($('#tableImageUrl').val());
    });
    $('#setTableScaleAndDistance').on('click', function setTableRadius() {
        mainApp.playAreaSVG.tableData.setTableImageScaleAndDistance(
            $('#tableImageScale').val(),
            $('#tableDistance').val());
    });
    $('#createMarker').on('click', function createMarker() {
        mainApp.playAreaSVG.tableData.createMarker($('#markerText').val());
    });
    $('#setMarkerSize').on('click', function setMarkerSize() {
        mainApp.playAreaSVG.markerSize = $('#markerSize').val();
        mainApp.playAreaSVG.drawMarkers();
    });
    $('#setCardSize').on('click', function setCardSize() {
        mainApp.playAreaSVG.cardSize = $('#cardSize').val();
    });
    $('#setDeckDealPoint').on('click', function setCardSize() {
        mainApp.playAreaSVG.tableData.setDeckDealPoint($('#deckDealX').val(),
                                                       $('#deckDealY').val());
    });

// hide action boxes when anything is clicked on (except the summoning element)
    d3.select('body').on('click.hideActionBox', function hideDeckActions() {
        mainApp.playAreaSVG.hideActionBoxes();
    });
    // undo checkbox toggles, the enclosing div click handler will do it
    d3.select('.actionBox input').on('click', function logCheckboxClick(d) {
        var checkbox = d3.select(this);
        if (checkbox.property('checked')) {
            checkbox.property('checked', false);
        } else {
            checkbox.property('checked', true);
        }
    });

// deck actions
    d3.select('#shuffleDeck').on('click', function shuffleDeck() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId;
        mainApp.playAreaSVG.tableData.shuffleDeck(deckId);
    });
    d3.select('#listDeck').on('click', function listDeck() {
        mainApp.playAreaSVG.drawCardList();
        $('#deckListBox').show();
    });
    d3.select('#hideCardList').on('click', function hideCardList() {
        $('#deckListBox').hide();
    });
    d3.select('#returnCardsToDeck').on('click', function returnCardsToDeck() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId;
        mainApp.playAreaSVG.tableData.returnCardsToDeck(deckId);
    });
    d3.select('#removeDeck').on('click', function removeDeck() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId;
        mainApp.playAreaSVG.tableData.removeDeck(deckId);
    });
    d3.select('#deckIsShared').on('click', function changeDeckSharing(d) {
        var deckId = mainApp.playAreaSVG.deckActionTargetId,
            isSharedCheckbox = d3.select('#deckIsShared input'),
        // toggle the checkgox
            isShared = !isSharedCheckbox.property('checked');
        isSharedCheckbox.property('checked', isShared);
        mainApp.playAreaSVG.tableData.setDeckSharedStatus(deckId, isShared);
    });

// player actions
    d3.select('#selectPlayer').on('click', function selectPlayer() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId;
        mainApp.playAreaSVG.tableData.setPlayer(playerId);
        mainApp.redraw();
    });
    d3.select('#resetPlayer').on('click', function resetPlayer() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId;
        mainApp.playAreaSVG.tableData.resetPlayer(playerId);
    });
    d3.select('#renamePlayer').on('click', function showPlayerRenameForm() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId,
            playerRow = mainApp.playAreaSVG.playerActionTargetRow,
            nameCell = playerRow.select('td.name'),
            currentName = nameCell.text();
        nameCell.html('');
        nameCell.append('input')
            .attr('value', currentName)
            .on('input', function () {
                if (mainApp.playAreaSVG.tableData.playerExists(this.value)) {
                    nameCell.select('button.setName').attr('disabled', 'disabled');
                } else {
                    nameCell.select('button.setName').attr('disabled', null);
                }
            });
        nameCell.append('button')
            .classed('setName', true)
            .text('Set')
            .attr('disabled', 'disabled')
            .on('click', function () {
                var newName = nameCell.select('input').property('value');
                mainApp.playAreaSVG.tableData.renamePlayer(playerId, newName);
                nameCell.text(newName);
            });
        nameCell.append('button')
            .text('Cancel')
            .on('click', function () {
                nameCell.text(currentName);
            });
    });
    d3.select('#removePlayer').on('click', function removePlayer() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId;
        mainApp.playAreaSVG.tableData.removePlayer(playerId);
    });
});