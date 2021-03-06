(function() {
	// don't emit events from inside the previews themselves
	if(window.location.search.match(/receiver/gi)) { return; }

	var socket = io.connect(window.location.origin),
		socketId = Math.random().toString().slice(2);

	// Print the URL for the control panel to the console and open it automatically
	console.log('View control panel at ' + window.location.origin + '/slam/' + socketId);
	window.open(window.location.origin + '/slam/' + socketId, '_blank', 'slam-' + socketId);

	/**
	 * Posts the current slide data to the control window
	 */
	function post() {
		var messageData = {
			socketId: socketId,
			state: Reveal.getState()
		};

		socket.emit('statechanged', messageData);
	}

	/**
	 * Updates the content data in the slides
	 */
	function updateData(res) {
		slamlib_getRes(res, function(resdata) {
			slamlib_update(res, resdata);
		});
	}

	function subscribeListeners() {
		Reveal.addEventListener('slidechanged', post);
		Reveal.addEventListener('fragmentshown', post);
		Reveal.addEventListener('fragmenthidden', post);
		Reveal.addEventListener('overviewhidden', post);
		Reveal.addEventListener('overviewshown', post);
		Reveal.addEventListener('paused', post);
		Reveal.addEventListener('resumed', post);
	}

	function unsubscribeListeners() {
		Reveal.removeEventListener('slidechanged', post);
		Reveal.removeEventListener('fragmentshown', post);
		Reveal.removeEventListener('fragmenthidden', post);
		Reveal.removeEventListener('overviewhidden', post);
		Reveal.removeEventListener('overviewshown', post);
		Reveal.removeEventListener('paused', post);
		Reveal.removeEventListener('resumed', post);
	}

	// Initialize content from database
	updateData(resRounds);
	updateData(resArtists);

	// When a new control window connects, post our current state
	socket.on('new-subscriber', function(data) {
		post();
	} );

	// When the state changes from inside of the control panel
	socket.on('statechanged-control', function(data) {
		// Prevent message loops by temporarily disabling the listeners
		unsubscribeListeners();
		Reveal.setState(data.state);
		subscribeListeners();
	} );

	// When some data was changed in the control panel
	socket.on('datachanged-control', function(data) {
		updateData(data.resource);
	} );

	// Monitor events that trigger a change in state
	subscribeListeners();

	// Post the initial state
	post();
}());
