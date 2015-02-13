/*global $ */
var mainApp,
    // used for a popup for adding/editing wiki data
    handWindow = null;

function Boundary(centerX, centerY, width, height) {
    'use strict';
    this.centerX = centerX;
    this.centerY = centerY;
    this.width = width;
    this.height = height;
    this.left = centerX - width / 2;
    this.right = this.left + width;
    this.top = centerY - height / 2;
    this.bottom = this.top + height;
}

function TableData() {
    'use strict';
    var self = this;
    this.deckCSV = null;
    this.library = [];
    this.hand = [];
    this.inPlay = [];
    this.outOfPlay = [];
    this.counters = [];
    this.room = null;
    this.player = null;

    this._addObjects = function (objectType, objects, zone) {
        if (this.room !== null && this.player !== null) {
            var objectIds = [],
                imageUrls = [],
                xPositions = [],
                yPositions = [];
            for (var i = 0; i < objects.length; i++) {
                objectIds.push(objects[i].id);
                imageUrls.push(objects[i].image_url);
                xPositions.push(objects[i].x);
                yPositions.push(objects[i].y);
            }
            $.post('tableState.php', {
                        action: 'add',
                        room: this.room,
                        player: this.player,
                        zone: zone,
                        type: objectType,
                        id: objectIds,
                        image_url: imageUrls,
                        x_pos: xPositions,
                        y_pos: yPositions})
            .done(function whatHappened(result) {
                $('#deckCSV').val(result);
            });
        }
    }
    this._updateObject = function (objectType, object, zone) {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php', {
                        action: 'update',
                        room: this.room,
                        player: this.player,
                        zone: zone,
                        type: objectType,
                        id: object.id,
                        image_url: object.imageUrl,
                        x_pos: object.x,
                        y_pos: object.y});
        }
    }
    this._removeObject = function (objectType, object, zone) {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php', {
                        action: 'remove',
                        room: this.room,
                        player: this.player,
                        type: objectType,
                        id: object.id});
        }
    }

    this.loadDeckFromCSV = function (deckCSV) {
        this.deckCSV = deckCSV;
        this.library = $.csv.toObjects(deckCSV);
        this.hand = [];
        this.inPlay = [];
        this.outOfPlay = [];

        var duplicateCards = [];
        for (var i = 0; i < this.library.length; i++) {
            var card = this.library[i];
            // assign an ID to each card
            card.id = i;
            card.zone = 'library';
            card.type = 'card';

            // create extra copies of duplicate cards
            for (var j = 1; j < card.count; j++) {
                duplicateCards.push({
                    // NAME: card.NAME,
                    image_url: card.image_url,
                    count: card.count,
                    id: this.library.length + duplicateCards.length,
                    zone: 'library',
                    type: 'card'
                });
            }
        }
        this.library = this.library.concat(duplicateCards);
        this._addObjects('card', this.library, 'library');
        $('#libraryCount').text(this.library.length);
    };
    this.clearCounters = function () {
        this.counters = [];
    }
    this.resetDeck = function () {
        this.library = $.csv.toObjects(deckCSV);
        $('#libraryCount').text(this.library.length);
    }

    this.shuffleLibrary = function () {
        for (var i = this.library.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this.library[i];
            this.library[i] = this.library[j];
            this.library[j] = temp;
        }
    }
    this.drawCard = function () {
        if (this.library.length > 0) {
            this.hand.push(this.library.pop());
        }
    }
    this.playCard = function (cardId) {
        for (var i = 0; i < this.hand.length; i++) {
            if (this.hand[i].ID == cardId) {
                this.inPlay.push(this.hand[i]);
                this.hand.splice(i, 1);
                break;
            }
        };
    }
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
    this.featureGroups = {};

    this.viewBox = {left: 0,
                    top: 0,
                    width: 0,
                    height: 0};

    this.scale = 1;
    this.boundary = null;
    this.featureIconSize = 15;
    this.needUpdate = false;
    this.featureClicked = false;

    this.init = function () {
        var canvasOffset;
        this.svg = d3.select('#playAreaSVG');
        this.resizeSVG();
        window.onresize = this.resizeSVG;
        canvasOffset = $('#playAreaSVG').offset();
        this.x = canvasOffset.left;
        this.y = canvasOffset.top;
        this.tableData = new TableData();
        this.tableData.room = $('#roomName').val();
        this.tableData.player = $('#playerName').val();
    };

    this.drag = d3.behavior.drag();
    this.drag.on('dragstart', function(d) {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        // if it is an enlarged card, make it transparent so you can see where
        // you're dragging the actual-size card
        var img = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        if (img.classed('enlarged')) {
            img.attr('opacity', '0.0');
            img = d.originCard;
            parent = d3.select($(d.originCard[0]).parent()[0]);
        }
        // put the card on top of other cards in its group
        parent.selectAll('image')
            .sort(function(a, b) {
                if (a.id === d.id)   {
                    return 1;
                } else if (b.id === d.id) {
                    return -1;
                } else {
                    return 0;
                }
            });
    });
    this.drag.on('drag', function (d) {
        var img = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        // parent.append(img[0]);
        if (img.classed('enlarged')) {
            // move the enlarged card
            d.enlargedX += d3.event.dx;
            d.enlargedY += d3.event.dy;

            img.attr('x', d.enlargedX)
                .attr('y', d.enlargedY);

            // move source card beneath it too
            img = d.originCard;
        }

        // move the card
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        img.attr('x', d.x)
            .attr('y', d.y);
    });
    this.drag.on('dragend', function () {
        var img = d3.select(this);
        if (img.classed('enlarged')) {
            // img.attr('opacity', '1.0');
        }
    })

    this.drawCard = function () {
        this.tableData.drawCard();
        this._drawCards();
    };
    this._drawCards = function () {
        $('#libraryCount').text(this.tableData.library.length);
        var hand = d3.select('#hand').selectAll('image')
            .data(this.tableData.hand,
                  function (d) { return d.id; });

        hand.enter().append('image')
            .attr('xlink:href', function (d) {
                return d.image_url;
            })
            .attr('x', function (d, i) {
                if (!d.hasOwnProperty('x')) {
                    d.x = 100;
                }
                return d.x;
            })
            .attr('y', function (d) {
                if (!d.hasOwnProperty('y')) {
                    d.y = 100;
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
            .call(this.drag);
        hand.exit().remove();
        hand.on('mouseenter', function showEnlargedCard(d) {
            var originCard = d3.select(this),
                scale = mainApp.playAreaSVG.scale;
            d.originCard = originCard;

            if (scale < 0.8) {
                var newCardData = d3.select('#enlargedCard').selectAll('image')
                    .data([d], function (d) {return d.image_url; });
                mainApp.enlargedCard = newCardData.enter().append('image');
                mainApp.enlargedCard
                    .classed('enlarged', true)
                    .attr('xlink:href', function (d) {
                        return d.image_url;
                    })
                    .attr('x', function (d) {
                        d.enlargedX = d.x + (d.width * scale - d.width) / (2 * scale);
                        return d.enlargedX;
                    })
                    .attr('y', function (d) {
                        d.enlargedY = d.y + (d.height * scale - d.height) / (2 * scale);
                        return d.enlargedY;
                    })
                    .attr('width', function (d) {
                        d.enlargedWidth = d.width / scale;
                        return d.enlargedWidth;
                    })
                    .attr('height', function (d) {
                        d.enlargedHeight = d.height / scale;
                        return d.enlargedHeight;
                    })
                    .on('mousemove', function (d) {
                        var svgCoords = self.getSVGCoordinates(d3.event.x,
                                                               d3.event.y);
                        if (svgCoords.x < d.x ||
                            svgCoords.x > d.x + d.width ||
                            svgCoords.y < d.y ||
                            svgCoords.y > d.y + d.height)
                        {
                            d3.select(this).remove();
                        }
                    })
                    // backup in case the mouse doesn't get caught in the
                    // mousemove removal zone
                    .on('mouseleave', function (d) {
                        d3.select(this).remove();
                    })
                mainApp.enlargedCard.call(self.drag);
                newCardData.exit().remove();
            }

        });
    }
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
        // distinguish pans from clicks
            self.featureClicked = false;
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

    // cache data when feature is clicked
    this.infoCache = {};

    this.init = function () {
        this.playAreaSVG = new PlayAreaSVG();
        this.playAreaSVG.init();
        this.coordDisplay = $('#coordDisplay');
        this.enlargedCard = $('#enlargedCard');
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

    $('#loadDeckForm').hide();
    $('#loadDeckHeader').on('click', function showLoadDeckForm() {
        $('#loadDeckForm').toggle();
    });
    $('#loadDeck').on('click', function passCSVToTableData() {
        var deckCSV = $('#deckCSV').val();
        mainApp.playAreaSVG.tableData.loadDeckFromCSV(deckCSV);
        $('#loadDeckForm').hide();
    });
    $('#shuffleLibrary').on('click', function shuffleLibrary() {
        mainApp.playAreaSVG.tableData.shuffleLibrary();
    });
    $('#drawCard').on('click', function drawCard() {
        mainApp.playAreaSVG.drawCard();
    });
    $('#setRoom').on('click', function setRoom() {
        mainApp.playAreaSVG.tableData.room = $('#roomName').val();
    });
    $('#setName').on('click', function setName() {
        mainApp.playAreaSVG.tableData.player = $('#playerName').val();
    });
});