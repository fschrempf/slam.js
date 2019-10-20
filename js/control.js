var currentState,
	currentSlide,
	upcomingSlide,
	selectedRound = {},
	connected = false;

var SLAM_LAYOUTS = {
	'default': 'Default',
	'wide': 'Wide',
	'tall': 'Tall',
	'artists-only': 'Artists only'
};

socket.on('statechanged', function(data) {
	// ignore data from sockets that aren't ours
	if(data.socketId !== socketId) { return; }

	if(connected === false) {
		connected = true;
		setupKeyboard();
	}

	handleStateMessage(data);
});

setupLayout();
setupIframes();

// Once the iframes have loaded, emit a signal saying there's
// a new subscriber which will trigger a 'statechanged'
// message to be sent back
window.addEventListener('message', function(event) {
	var data = JSON.parse(event.data);

	if(data && data.namespace === 'reveal') {
		if(/ready/.test(data.eventName)) {
			socket.emit('new-subscriber', { socketId: socketId });
		}
	}

	// Messages sent by reveal.js inside of the current slide preview
	if(data && data.namespace === 'reveal') {
		if(/slidechanged|fragmentshown|fragmenthidden|overviewshown|overviewhidden|paused|resumed/.test(data.eventName) && currentState !== JSON.stringify(data.state)) {
			socket.emit('statechanged-control', { state: data.state });
		}
	}
});

/**
 * Called when the main window sends an updated state.
 */
function handleStateMessage(data) {
	// Store the most recently set state to avoid circular loops
	// applying the same state
	currentState = JSON.stringify(data.state);

	// Update the control slides
	currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'setState', args: [ data.state ] }), '*');
	upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'setState', args: [ data.state ] }), '*');
	upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'next' }), '*');
}

// Limit to max one state update per X ms
handleStateMessage = debounce(handleStateMessage, 200);

/**
 * Forward keyboard events to the current slide window.
 * This enables keyboard events to work even if focus
 * isn't set on the current slide iframe.
 */
function setupKeyboard() {
	document.addEventListener('keydown', function(event) {
		if (document.activeElement.type != "text")
			currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'triggerKey', args: [ event.keyCode ] }), '*');
	} );
}

/**
 * Creates the preview iframes.
 */
function setupIframes() {
	var params = [
		'receiver',
		'progress=false',
		'history=false',
		'transition=none',
		'backgroundTransition=none'
	].join( '&' );

	var currentURL = '/?' + params + '&postMessageEvents=true&controls=true';
	var upcomingURL = '/?' + params + '&controls=false';

	currentSlide = document.createElement('iframe');
	currentSlide.onload = function() {
		updateData(resRounds, $(currentSlide).contents().find("html"));
		updateData(resArtists, $(currentSlide).contents().find("html"));
	};
	currentSlide.setAttribute('width', 1280);
	currentSlide.setAttribute('height', 1024);
	currentSlide.setAttribute('src', currentURL);
	$('#current-slide').append(currentSlide);

	upcomingSlide = document.createElement('iframe');
	upcomingSlide.onload = function() {
		updateData(resRounds, $(upcomingSlide).contents().find("html"));
		updateData(resArtists, $(upcomingSlide).contents().find("html"));
	};
	upcomingSlide.setAttribute('width', 640);
	upcomingSlide.setAttribute('height', 512);
	upcomingSlide.setAttribute('src', upcomingURL);
	$('#upcoming-slide').append(upcomingSlide);
}

function updateData(res, root) {
	// handle data updates from the control panel in the panel itself
	if( res.name === 'artists' ) {
		$("#artistGrid").jsGrid("loadData").done(function() {
			$("#slotRoundGrid").jsGrid("loadData").done(function() {
				$("#slotRoundGrid").jsGrid("sort", { field: 0, order: "asc" });
			});
			$("#ratingGrid").jsGrid("loadData").done(function() {
				$("#ratingGrid").jsGrid("sort", { field: 0, order: "asc" });
			});
			$("#slotArtistGrid").jsGrid("loadData");
		});
	}
	else if ( res.name === 'rounds' ) {
		$("#roundGrid").jsGrid("loadData");
	}

	slamlib_getRes(res, function(resdata) {
		slamlib_update(res, resdata, root);
	});
}

function jsonRequest(type, resource, data) {
	var url = resource.path;
	url += type === "POST" ? "":('/' + data.id);
	return $.ajax({
		type: type,
		url: url,
		contentType: 'application/json',
		dataType: "json",
		data: JSON.stringify(data),
		success: function() {
			socket.emit( 'datachanged-control', { resource: resource } );
			updateData(resource, $(currentSlide).contents().find("html"));
			updateData(resource, $(upcomingSlide).contents().find("html"));
		}
	});
}

function assignSlot(a, r, s) {
	if (!a)
		return;

	if (a["round" + r.id] === undefined)
		a["round" + r.id] = { slot: s, points: []};

	a["round" + r.id].slot = s;
	jsonRequest("PUT", resArtists, a);
}

function unassignSlot(a, r) {
	a["round" + r.id].slot = 0;
	jsonRequest("PUT", resArtists, a);
}

function getNextSlot(r) {
	var slots = [0, r.num_slots + 1];
	$.each(artists, function(index, a) {
		if(a["round" + r.id]) {
			slots.push(a["round" + r.id].slot);
		}
	});

	slots.sort();
	var slot = slots.reduce(function(acc, cur, ind, arr) {
		var diff = cur - arr[ind-1];
		if (diff > 1) {
			var i = 1;
			while (i < diff) {
				acc.push(arr[ind-1]+i);
				i++;
			}
		}
		return acc;
	}, []);

	return slot[0];
}

function addPoints(a, r, p) {
	a["round" + r.id].points.push(p);
	jsonRequest("PUT", resArtists, a);
}

function removePoints(a, r, i) {
	a["round" + r.id].points.splice(i, 1);
	jsonRequest("PUT", resArtists, a);
}

function toggleCrossed(a, r) {
	if (a["round" + r.id].crossed === undefined)
		a["round" + r.id].crossed = true;
	else
		a["round" + r.id].crossed = !a["round" + r.id].crossed;

	jsonRequest("PUT", resArtists, a);
}

var busy = false;

/**
 * Setup the artists UI.
 */
var artistGrid = $("#artistGrid").jsGrid({
	width: "100%",

	inserting: true,
	editing: true,
	sorting: true,
	paging: true,
	autoload: true,

	controller: {
		loadData: function(filter) {
			return slamlib_getRes(resArtists, function(data) {
					artists = data;
					return data;
				});
		},
		insertItem: function(item) {
			return jsonRequest("POST", resArtists, item);
		},
		updateItem: function(item) {
			return jsonRequest("PUT", resArtists, item);
		},
		deleteItem: function(item) {
			return jsonRequest("DELETE", resArtists, item);
		},
	},

	fields: [
		{ name: "name", title: "Artist", type: "text", width: 150 },
		{ type: "control" }
	]
});

var roundGrid = $("#roundGrid").jsGrid({
	width: "100%",

	inserting: true,
	editing: true,
	sorting: true,
	paging: true,
	autoload: true,

	controller: {
		loadData: function(filter) {
			return slamlib_getRes(resRounds, function(data) {
					rounds = data;
					$('#slam-round-dropdown').html("");
					$.each(data, function(index, r) {
						$('#slam-round-dropdown').append("<option value=" + r.id + ">" + r.name + "</option>");
					});
					if (!selectedRound)
						selectedRound = rounds[0];
					$('#slam-round-dropdown').val(selectedRound.id);
					$('#slam-round-dropdown').trigger('change');
					return data;
				});
		},
		insertItem: function(item) {
			return jsonRequest("POST", resRounds, item);
		},
		updateItem: function(item) {
			return jsonRequest("PUT", resRounds, item);
		},
		deleteItem: function(item) {
			return jsonRequest("DELETE", resRounds, item);
		},
	},

	fields: [
		{ name: "name", title: "Title", type: "text", width: 150 },
		{ name: "level", title: "Level", type: "number", width: 50 },
		{ name: "order", title: "Order", type: "number", width: 50 },
		{ name: "num_slots", title: "Number of Slots", type: "number", width: 80 },
		{ name: "rate_by_score", title: "Rate by Score", type: "checkbox", width: 40},
		{ type: "control" }
	]
});

$('#slam-round-dropdown').change(function() {
	selectedRound = rounds[this.selectedIndex];
	// Reassign the field data source ("name") for the slot values
	$("#slotRoundGrid").jsGrid("fieldOption", 0, "name", "round" + selectedRound.id + ".slot");
	$("#ratingGrid").jsGrid("fieldOption", 0, "name", "round" + selectedRound.id + ".slot");
	$("#slotRoundGrid").jsGrid("loadData").done(function() {
		$("#slotRoundGrid").jsGrid("sort", { field: 0, order: "asc" });
	});
	$("#ratingGrid").jsGrid("loadData").done(function() {
		$("#ratingGrid").jsGrid("sort", { field: 0, order: "asc" });
	});
	$("#slotArtistGrid").jsGrid("loadData");
	$('.addRoundButton').text("Assign to " + selectedRound.name);
	$('.removeRoundButton').text("Remove from " + selectedRound.name);
});

var slotRoundGrid = $("#slotRoundGrid").jsGrid({
	width: "100%",

	paging: true,
	autoload: false,
	confirmDeleting: false,

	rowClass: function(item, itemIndex) {
		return "slot-" + itemIndex;
	},

	controller: {
		loadData: function(filter) {
			return slamlib_getRes(resArtists, function(data) {
				return slamlib_filterArtistsByRound(data, selectedRound);
			});
		}
	},

	fields: [
		{ name: "round" + selectedRound.id + ".slot", title: "Slot", type: "number", width: 150, align: "left" },
		{ name: "name", title: "Assigned", type: "text", width: 150 },
		{ type: "control", width: 100, editButton: false, deleteButton: false,
			itemTemplate: function(value, item) {
				var $result = jsGrid.fields.control.prototype.itemTemplate.apply(this, arguments);

				var $customButton = $("<button type='button' class='removeRoundButton btn btn-warning'>")
					.text("Remove from " + selectedRound.name)
					.click(function(e) {
						if (busy)
							return;

						busy = true;
						unassignSlot(item, selectedRound);
						$("#slotRoundGrid").jsGrid("deleteItem", item);
						var $gridData = $("#slotRoundGrid .jsgrid-grid-body tbody");
						var slot = 1;
						// reassign remaining items
						var items = $.map($gridData.find("tr"), function(row) {
							var item = $(row).data("JSGridItem");
							assignSlot(item, selectedRound, slot++);
							return item;
						});
						$("#slotRoundGrid").jsGrid("loadData").done(function() {
							busy = false;
						});
						e.stopPropagation();
					});

				return $result.add($customButton);
			}
		}
	],

	onRefreshed: function() {
		var $gridData = $("#slotRoundGrid .jsgrid-grid-body tbody");

		$gridData.sortable({
			update: function(e, ui) {
				// array of indexes
				var clientIndexRegExp = /\s*slot-(\d+)\s*/;
				var indexes = $.map($gridData.sortable("toArray", { attribute: "class" }), function(classes) {
					return clientIndexRegExp.exec(classes)[1];
				});

				var slot = 1;

				// arrays of items
				var items = $.map($gridData.find("tr"), function(row) {
					var item = $(row).data("JSGridItem");
					assignSlot(item, selectedRound, slot++);
					return item;
				});
			}
		});
	}
});

var slotArtistGrid = $("#slotArtistGrid").jsGrid({
	width: "100%",

	inserting: false,
	editing: false,
	sorting: true,
	paging: true,
	autoload: false,

	controller: {
		loadData: function(filter) {
			return slamlib_getRes(resArtists, function(data) {
				return slamlib_filterArtistsByLevelInv(data, selectedRound.level);
			});
		}
	},

	fields: [
		{ name: "name", title: "Not Assigned", type: "text", width: 150 },
		{ type: "control", width: 100, editButton: false, deleteButton: false,
			itemTemplate: function(value, item) {
				var $result = jsGrid.fields.control.prototype.itemTemplate.apply(this, arguments);

				var $customButton = $("<button type='button' class='addRoundButton btn btn-success'>")
					.text("Assign to " + selectedRound.name)
					.click(function(e) {
						if (busy)
							return;

						busy = true;
						assignSlot(item, selectedRound, getNextSlot(selectedRound));
						$("#slotArtistGrid").jsGrid("loadData").done(function() {
							busy = false;
						});
						e.stopPropagation();
					});

				return $result.add($customButton);
			}
		}
	]
});

var scoreEditCurrentSlot = 0;

var ratingGrid = $("#ratingGrid").jsGrid({
	width: "100%",

	paging: true,
	autoload: true,
	confirmDeleting: false,
	sorting: false,

	controller: {
		loadData: function(filter) {
			return slamlib_getRes(resArtists, function(data) {
				return slamlib_filterArtistsByRound(data, selectedRound);
			});
		}
	},

	rowRenderer: function(item) {
		var slot = item["round" + selectedRound.id].slot;
		var score = slamlib_getScore(item, selectedRound.id);
		var points = item["round" + selectedRound.id].points;
		var $scoreRow = $("<tr>").addClass("expandable");
		var $row = $("<tr>").addClass("jsgrid-row").click(function() {
			if ($scoreRow.hasClass("expanded")) {
				$("#ratingGrid .jsgrid-row, #ratingGrid .jsgrid-alt-row").removeClass("expanded");
				scoreEditCurrentSlot = 0;
			} else {
				$("#ratingGrid .jsgrid-row, #ratingGrid .jsgrid-alt-row").removeClass("expanded");
				$scoreRow.addClass("expanded");
				scoreEditCurrentSlot = slot;
			}
		});
		$row.append($("<td>").addClass("jsgrid-cell").append(slot));
		$row.append($("<td>").addClass("jsgrid-cell").append(item.name));
		$row.append($("<td>").addClass("jsgrid-cell").append(score));
		var $scoreCell = $("<td>").attr('colspan',3);
		var $scoreTop = $("<div>").addClass("score-edit").addClass("score-edit-top");
		for (var i=1; i<11; i++) {
			$scoreTop.append($("<span>").addClass("score-edit-value").append(i).click(function() {
				if (busy)
					return;

				busy = true;
				addPoints(item, selectedRound, Number(this.innerHTML));
				$("#ratingGrid").jsGrid("loadData").done(function() {
					$("#ratingGrid").jsGrid("sort", { field: 0, order: "asc" });
					busy = false;
				});
			}));
		}
		let crossed = "'>"
		if (item["round" + selectedRound.id].crossed)
			crossed = " active' aria-pressed='false'>";
		$scoreTop.append($("<button type='button' data-toggle='button' class='crossRatings btn btn-primary" + crossed)
			.text("Cross highest and lowest")
			.click(function(e) {
				if (busy)
					return;

				busy = true;
				toggleCrossed(item, selectedRound);
				$("#ratingGrid").jsGrid("loadData").done(function() {
					$("#ratingGrid").jsGrid("sort", { field: 0, order: "asc" });
					busy = false;
				});
		}));
		var $scoreBottom = $("<div>").addClass("score-edit").addClass("score-edit-bottom");
		for (var i=0; i<points.length; i++) {
			let crossed = ""
			if (slamlib_isRatingCrossed(item, selectedRound.id, i))
				crossed = " crossed";
			$scoreBottom.append($("<span>").addClass("score-edit-value" + crossed).append(points[i]).click(function() {
				if (busy)
					return;

				busy = true;
				removePoints(item, selectedRound, $(this).index());
				$("#ratingGrid").jsGrid("loadData").done(function() {
					$("#ratingGrid").jsGrid("sort", { field: 0, order: "asc" });
					busy = false;
				});
			}));
		}
		$scoreCell.append($scoreTop).append($scoreBottom);
		$scoreRow.append($scoreCell);
		if (scoreEditCurrentSlot === slot) {
			$scoreRow.addClass("expanded");
		}
		return $row.add($scoreRow);
	},

	fields: [
		{ name: "round" + selectedRound.id + ".slot", title: "Slot", type: "number", width: 150 },
		{ name: "name", title: "Assigned", type: "text", width: 150 },
		{ name: "score", title: "Score", type: "number", width: 150}
	]
});

/**
 * Sets up the slam view layout and layout selector.
 */
function setupLayout() {
	// Render the list of available layouts
	for(var id in SLAM_LAYOUTS) {
		$('#slam-layout-dropdown').append("<option value=" + id + ">" + SLAM_LAYOUTS[id] + "</option>");
	}

	// Monitor the dropdown for changes
	$('#slam-layout-dropdown').change(function() {
		setLayout(this.value);
	});

	// Restore any currently persisted layout
	setLayout(getLayout());
}

/**
 * Sets a new slam view layout. The layout is persisted
 * in local storage.
 */
function setLayout( value ) {
	var title = SLAM_LAYOUTS[value];

	$('#slam-layout-dropdown').val(value);

	document.body.setAttribute('data-slam-layout', value);

	// Persist locally
	if(window.localStorage) {
		window.localStorage.setItem('reveal-slam-layout', value);
	}
}

/**
 * Returns the ID of the most recently set slam layout
 * or our default layout if none has been set.
 */
function getLayout() {
	if(window.localStorage) {
		var layout = window.localStorage.getItem('reveal-slam-layout');
		if(layout)
			return layout;
	}

	// Default to the first record in the layouts hash
	for(var id in SLAM_LAYOUTS) {
		return id;
	}
}

/**
 * Limits the frequency at which a function can be called.
 */
function debounce(fn, ms) {
	var lastTime = 0,
		timeout;

	return function() {
		var args = arguments;
		var context = this;

		clearTimeout(timeout);

		var timeSinceLastCall = Date.now() - lastTime;
		if(timeSinceLastCall > ms) {
			fn.apply( context, args );
			lastTime = Date.now();
		}
		else {
			timeout = setTimeout(function() {
				fn.apply(context, args);
				lastTime = Date.now();
			}, ms - timeSinceLastCall);
		}
	}
}
